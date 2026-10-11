/** Formata milissegundos como `m:ss.cc` (ou `ss.cc` abaixo de um minuto). */
export function formatTime(ms: number, opts: { forceMinutes?: boolean; digits?: 2 | 3 } = {}): string {
  if (!Number.isFinite(ms)) return 'DNF';
  const digits = opts.digits ?? 2;
  const negative = ms < 0;
  const total = Math.abs(ms);
  const factor = digits === 3 ? 1 : 10;
  const fractionUnits = Math.floor(total / factor);
  const fraction = fractionUnits % (digits === 3 ? 1000 : 100);
  const totalSeconds = Math.floor(total / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frac = String(fraction).padStart(digits, '0');
  const body =
    minutes > 0 || opts.forceMinutes
      ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${frac}`
      : `${seconds}.${frac}`;
  return negative ? `-${body}` : body;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
