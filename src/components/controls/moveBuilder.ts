import type { Move, MoveAmount, MoveBase } from '../../engine/moves/notation';

/** Monta um movimento a partir da face, sentido, profundidade e opção larga. */
export function buildMove(base: MoveBase, amount: MoveAmount, depth: number, wide: boolean): Move {
  if (base === 'M' || base === 'E' || base === 'S' || base === 'x' || base === 'y' || base === 'z') {
    return { base, amount, depth: 1, width: 1 };
  }
  if (wide) {
    const d = Math.max(2, depth);
    return { base, amount, depth: d, width: d };
  }
  return { base, amount, depth, width: 1 };
}
