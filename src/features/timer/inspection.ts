import type { Penalty } from '../../types/game';

export const INSPECTION_MS = 15_000;
export const INSPECTION_DNF_MS = 17_000;

/**
 * Penalidade de inspeção (Regulamento WCA, artigo A3/A7): iniciar a
 * resolução após 15 s de inspeção custa +2; após 17 s, DNF.
 */
export function inspectionPenalty(elapsedMs: number): Penalty {
  if (elapsedMs > INSPECTION_DNF_MS) return 'DNF';
  if (elapsedMs > INSPECTION_MS) return '+2';
  return 'none';
}

/** Avisos visuais (os juízes anunciam 8 s e 12 s). */
export function inspectionWarning(elapsedMs: number): 'none' | '8s' | '12s' | 'over' {
  if (elapsedMs > INSPECTION_MS) return 'over';
  if (elapsedMs >= 12_000) return '12s';
  if (elapsedMs >= 8_000) return '8s';
  return 'none';
}

export function combinePenalties(a: Penalty, b: Penalty): Penalty {
  if (a === 'DNF' || b === 'DNF') return 'DNF';
  if (a === '+2' || b === '+2') return '+2';
  return 'none';
}
