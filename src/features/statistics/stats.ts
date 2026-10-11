import type { GameMode, Penalty, SolveRecord } from '../../types/game';

/** Tempo efetivo de uma tentativa: +2 soma 2 s; DNF vale infinito. */
export function effectiveTime(r: Pick<SolveRecord, 'timeMs' | 'penalty'>): number {
  if (r.penalty === 'DNF') return Number.POSITIVE_INFINITY;
  return r.timeMs + (r.penalty === '+2' ? 2000 : 0);
}

/**
 * Quantidade de resultados descartados em cada extremo de uma média AoN,
 * seguindo a convenção usada por WCA/csTimer: 5% arredondado para cima
 * (1 para Ao5 e Ao12).
 */
export function trimCount(n: number): number {
  return Math.max(1, Math.ceil(n * 0.05));
}

/**
 * Média de N (AoN) das N tentativas fornecidas: descarta o melhor e o pior
 * resultado (DNF conta como o pior). Se restar algum DNF após o descarte, a
 * média é DNF (infinito). Retorna null quando há menos de N tentativas.
 */
export function averageOf(times: readonly number[], n: number): number | null {
  if (times.length < n) return null;
  const window = times.slice(-n);
  const trim = trimCount(n);
  const sorted = [...window].sort((a, b) => a - b);
  const kept = sorted.slice(trim, n - trim);
  if (kept.some((t) => !Number.isFinite(t))) return Number.POSITIVE_INFINITY;
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

/** Melhor AoN considerando todas as janelas consecutivas. */
export function bestAverageOf(times: readonly number[], n: number): number | null {
  if (times.length < n) return null;
  let best = Number.POSITIVE_INFINITY;
  for (let end = n; end <= times.length; end++) {
    const avg = averageOf(times.slice(end - n, end), n)!;
    if (avg < best) best = avg;
  }
  return best;
}

export function mean(values: readonly number[]): number | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

export interface StatsSummary {
  attempts: number;
  solved: number;
  dnf: number;
  assisted: number;
  best: number | null;
  worst: number | null;
  mean: number | null;
  last: number | null;
  ao5: number | null;
  ao12: number | null;
  bestAo5: number | null;
  bestAo12: number | null;
  totalMoves: number;
  meanMoves: number | null;
  bestMoves: number | null;
  meanTps: number | null;
}

/**
 * Resumo estatístico. Tentativas assistidas são contadas, mas não entram em
 * recordes nem médias (não são resultados válidos).
 */
export function summarize(records: readonly SolveRecord[]): StatsSummary {
  const ordered = [...records].sort((a, b) => a.date - b.date);
  const valid = ordered.filter((r) => !r.assisted);
  const times = valid.map(effectiveTime);
  const finiteTimes = times.filter(Number.isFinite);
  const solvedRecords = valid.filter((r) => r.penalty !== 'DNF');
  const tps = solvedRecords.filter((r) => r.timeMs > 0).map((r) => r.moves / (effectiveTime(r) / 1000));
  return {
    attempts: ordered.length,
    solved: ordered.filter((r) => r.penalty !== 'DNF').length,
    dnf: ordered.filter((r) => r.penalty === 'DNF').length,
    assisted: ordered.filter((r) => r.assisted).length,
    best: finiteTimes.length ? Math.min(...finiteTimes) : null,
    worst: finiteTimes.length ? Math.max(...finiteTimes) : null,
    mean: mean(times),
    last: times.length ? times[times.length - 1] : null,
    ao5: averageOf(times, 5),
    ao12: averageOf(times, 12),
    bestAo5: bestAverageOf(times, 5),
    bestAo12: bestAverageOf(times, 12),
    totalMoves: ordered.reduce((a, r) => a + r.moves, 0),
    meanMoves: mean(solvedRecords.map((r) => r.moves)),
    bestMoves: solvedRecords.length ? Math.min(...solvedRecords.map((r) => r.moves)) : null,
    meanTps: mean(tps),
  };
}

export function filterRecords(
  records: readonly SolveRecord[],
  filter: { size?: number | 'all'; mode?: GameMode | 'all' },
): SolveRecord[] {
  return records.filter(
    (r) =>
      (filter.size === undefined || filter.size === 'all' || r.size === filter.size) &&
      (filter.mode === undefined || filter.mode === 'all' || r.mode === filter.mode),
  );
}

export function penaltyLabel(p: Penalty): string {
  return p === 'none' ? '' : p === '+2' ? '+2' : 'DNF';
}
