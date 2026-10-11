import { formatMoves, toPrimitive, type FaceBase, type Move, type MoveAmount } from '../moves/notation';
import { assertSize } from '../state/layout';
import { createRng, randomInt, randomSeed, type Rng } from './random';

export type ScrambleKind = 'random-move' | 'random-state';

export interface Scramble {
  readonly size: number;
  readonly moves: readonly Move[];
  readonly text: string;
  readonly seed: string;
  readonly kind: ScrambleKind;
}

export interface ScrambleOptions {
  size: number;
  length?: number;
  seed?: string;
}

const AMOUNTS: readonly MoveAmount[] = [1, -1, 2];

export function defaultScrambleLength(n: number): number {
  switch (n) {
    case 2:
      return 11;
    case 3:
      return 25;
    case 4:
      return 40;
    case 5:
      return 60;
    case 6:
      return 80;
    default:
      return 100;
  }
}

/**
 * Conjunto de movimentos (com amount = 1) usados no embaralhamento de cada
 * tamanho, seguindo o estilo das competições WCA:
 * - 2×2: R U F (o canto DBL permanece fixo; todos os estados são alcançáveis)
 * - 3×3: as seis faces
 * - 4×4: faces + Rw Uw Fw
 * - 5×5+: faces + todos os movimentos largos possíveis até N/2 camadas
 */
export function scrambleMoveSet(n: number): Move[] {
  assertSize(n);
  const faces: FaceBase[] = ['R', 'L', 'U', 'D', 'F', 'B'];
  if (n === 2) return (['R', 'U', 'F'] as FaceBase[]).map((base) => ({ base, depth: 1, width: 1, amount: 1 }));
  const set: Move[] = faces.map((base) => ({ base, depth: 1, width: 1, amount: 1 }));
  if (n === 4) {
    for (const base of ['R', 'U', 'F'] as FaceBase[]) set.push({ base, depth: 2, width: 2, amount: 1 });
  } else if (n >= 5) {
    const maxDepth = Math.floor(n / 2);
    for (let depth = 2; depth <= maxDepth; depth++) {
      for (const base of faces) set.push({ base, depth, width: depth, amount: 1 });
    }
  }
  return set;
}

/**
 * Gera um embaralhamento por movimentos aleatórios, evitando redundâncias:
 * dentro de uma sequência de movimentos no mesmo eixo (que comutam entre si),
 * o mesmo conjunto de camadas nunca é repetido — impedindo cancelamentos
 * como `R R'`, `R L R` ou `R2 R`.
 */
export function generateScramble(options: ScrambleOptions): Scramble {
  const { size } = options;
  const length = Math.max(0, Math.floor(options.length ?? defaultScrambleLength(size)));
  const seed = options.seed?.trim() || randomSeed();
  const rng = createRng(`${size}|${length}|${seed}`);
  const moves = randomMoveSequence(size, length, rng);
  return { size, moves, text: formatMoves(moves), seed, kind: 'random-move' };
}

export function randomMoveSequence(n: number, length: number, rng: Rng): Move[] {
  const candidates = scrambleMoveSet(n).map((m) => {
    const prim = toPrimitive(m, n);
    return { move: m, axis: prim.axis, key: prim.layers.join(',') };
  });
  const result: Move[] = [];
  let runAxis = -1;
  let runKeys = new Set<string>();
  while (result.length < length) {
    const options = candidates.filter((c) => c.axis !== runAxis || !runKeys.has(c.key));
    const pick = options[randomInt(rng, options.length)];
    if (pick.axis !== runAxis) {
      runAxis = pick.axis;
      runKeys = new Set();
    }
    runKeys.add(pick.key);
    result.push({ ...pick.move, amount: AMOUNTS[randomInt(rng, AMOUNTS.length)] });
  }
  return result;
}
