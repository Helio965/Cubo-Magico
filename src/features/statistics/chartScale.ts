/** Passo "redondo" (1, 2 ou 5 × 10ⁿ) para cerca de `ticks` divisões. */
export function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}

/** Rótulo do eixo Y com a precisão exigida pelo passo (0.5s, 2s, 1:30…). */
export function tickLabel(ms: number, step: number): string {
  const seconds = ms / 1000;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds - m * 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  const decimals = step < 100 ? 2 : step < 1000 ? 1 : 0;
  return `${seconds.toFixed(decimals)}s`;
}
