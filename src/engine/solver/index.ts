import { formatMoves, invertMoves, type FaceBase, type Move, type MoveAmount } from '../moves/notation';
import type { Scramble } from '../scramble/scramble';
import { createRng, randomInt, randomSeed } from '../scramble/random';
import { applyMoves, createSolved, getFacelets, isSolved, type CubeState } from '../state/cube';
import { FACE_IDS, OPPOSITE_FACE } from '../state/faces';
import { CubieCube, cornersFromFacelets, cubieFromFacelets, permParity } from './kociemba/cubie';
import { solveTwoPhase } from './kociemba/search';
import { getTables, tablesReady } from './kociemba/tables';
import {
  getTwoByTwoTables,
  solveTwoByTwoCorners,
  twoByTwoDistance,
  twoByTwoStateFromIndex,
  twoByTwoTablesReady,
  TWO_BY_TWO_STATES,
} from './twoByTwo';

export interface SolverSupport {
  readonly available: boolean;
  readonly method?: string;
  readonly reason?: string;
}

export function solverSupport(n: number): SolverSupport {
  if (n === 3) return { available: true, method: 'Kociemba (duas fases)' };
  if (n === 2) return { available: true, method: 'Busca ótima por tabela completa' };
  return {
    available: false,
    reason: `A resolução automática do ${n}×${n}×${n} ainda não está disponível. Ela exige um método de redução (centros, pareamento de arestas e correção de paridade) que ainda não foi implementado e validado.`,
  };
}

export interface SolveOptions {
  targetLength?: number;
  timeLimitMs?: number;
}

export interface SolveResult {
  readonly moves: readonly Move[];
  readonly text: string;
  readonly length: number;
  readonly method: string;
  readonly elapsedMs: number;
  /** A solução foi aplicada a uma cópia do estado e o resultado está resolvido. */
  readonly verified: true;
}

export class SolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolverError';
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function codeToMove(code: number): Move {
  const face = Math.floor(code / 3);
  const power = (code % 3) + 1;
  const amount: MoveAmount = power === 1 ? 1 : power === 2 ? 2 : -1;
  return { base: FACE_IDS[face] as FaceBase, depth: 1, width: 1, amount };
}

/**
 * Facelets do 3×3 normalizados pelos centros: cada adesivo recebe a face
 * (U R F D L B) cujo centro atual tem a mesma cor. Assim o resolvedor
 * funciona mesmo após rotações x/y/z ou movimentos de fatia.
 */
export function normalizedFacelets3(state: CubeState): Uint8Array {
  const f = getFacelets(state);
  const map = new Array<number>(6);
  for (let face = 0; face < 6; face++) map[f[face * 9 + 4]] = face;
  return f.map((label) => map[label]);
}

/** Converte um estado 3×3 do motor em CubieCube (Kociemba). */
export function toCubieCube(state: CubeState): CubieCube {
  if (state.n !== 3) throw new SolverError('Conversão disponível apenas para o 3×3.');
  const { cube, error } = cubieFromFacelets(normalizedFacelets3(state));
  if (error) throw new SolverError(`Estado inválido: ${error}`);
  return cube;
}

/** Converte um estado 2×2 em cantos de um CubieCube com o canto DBL resolvido. */
export function toTwoByTwoCubie(state: CubeState): CubieCube {
  if (state.n !== 2) throw new SolverError('Conversão disponível apenas para o 2×2.');
  const f2 = getFacelets(state);
  // Expande a grade 2×2 para as posições de canto da grade 3×3.
  const f3 = new Array<number>(54).fill(-1);
  for (let face = 0; face < 6; face++) {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) f3[face * 9 + r * 2 * 3 + c * 2] = f2[face * 4 + r * 2 + c];
    }
  }
  // Normaliza as cores a partir da peça que está na posição DBL.
  const lD = f3[33];
  const lB = f3[53];
  const lL = f3[42];
  const map = new Array<number>(6);
  map[lD] = 3;
  map[OPPOSITE_FACE[lD]] = 0;
  map[lB] = 5;
  map[OPPOSITE_FACE[lB]] = 2;
  map[lL] = 4;
  map[OPPOSITE_FACE[lL]] = 1;
  if (map.some((v) => v === undefined)) throw new SolverError('Estado inválido: canto DBL inconsistente.');
  const normalized = f3.map((l) => (l < 0 ? -1 : map[l]));
  const cube = new CubieCube();
  const error = cornersFromFacelets(normalized, cube);
  if (error) throw new SolverError(`Estado inválido: ${error}`);
  return cube;
}

/** Pré-calcula as tabelas do resolvedor de um tamanho (operação lenta, ~1 s). */
export function prepareSolver(n: number): void {
  if (n === 3) getTables();
  else if (n === 2) getTwoByTwoTables();
}

export function isSolverReady(n: number): boolean {
  return n === 3 ? tablesReady() : n === 2 ? twoByTwoTablesReady() : false;
}

/**
 * Calcula uma solução real para o estado informado — sem usar o histórico de
 * movimentos — e valida aplicando-a a uma cópia do estado.
 */
export function solveState(state: CubeState, options: SolveOptions = {}): SolveResult {
  const support = solverSupport(state.n);
  if (!support.available) throw new SolverError(support.reason ?? 'Resolução indisponível.');
  const start = now();
  let moves: Move[];
  if (isSolved(state)) {
    moves = [];
  } else if (state.n === 3) {
    const cube = toCubieCube(state);
    const result = solveTwoPhase(cube, {
      targetLength: options.targetLength ?? 20,
      timeLimitMs: options.timeLimitMs ?? 800,
    });
    moves = result.moves.map(codeToMove);
  } else {
    const cube = toTwoByTwoCubie(state);
    moves = solveTwoByTwoCorners(cube).map(codeToMove);
  }
  const final = applyMoves(state, moves);
  if (!isSolved(final)) {
    throw new SolverError('A solução calculada não resolveu o cubo e foi descartada.');
  }
  return {
    moves,
    text: formatMoves(moves),
    length: moves.length,
    method: support.method!,
    elapsedMs: now() - start,
    verified: true,
  };
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Embaralhamento por estado aleatório (método usado pela WCA): sorteia um
 * estado válido uniformemente, resolve-o e usa o inverso da solução.
 */
export function generateRandomStateScramble(n: number, seed?: string): Scramble {
  const usedSeed = seed?.trim() || randomSeed();
  const rng = createRng(`random-state|${n}|${usedSeed}`);
  let solution: Move[];
  if (n === 3) {
    for (;;) {
      const cp = [0, 1, 2, 3, 4, 5, 6, 7];
      const ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      shuffle(cp, rng);
      shuffle(ep, rng);
      if (permParity(cp) !== permParity(ep)) [ep[10], ep[11]] = [ep[11], ep[10]];
      const cube = new CubieCube(cp, undefined, ep);
      cube.setTwist(randomInt(rng, 2187));
      cube.setFlip(randomInt(rng, 2048));
      const result = solveTwoPhase(cube, { targetLength: 21, timeLimitMs: 400 });
      if (result.moves.length >= 2) {
        solution = result.moves.map(codeToMove);
        break;
      }
    }
  } else if (n === 2) {
    for (;;) {
      const cube = twoByTwoStateFromIndex(randomInt(rng, TWO_BY_TWO_STATES));
      if (twoByTwoDistance(cube) >= 4) {
        solution = solveTwoByTwoCorners(cube).map(codeToMove);
        break;
      }
    }
  } else {
    throw new SolverError('Embaralhamento por estado aleatório disponível apenas para 2×2 e 3×3.');
  }
  const moves = invertMoves(solution);
  // Garantia: o embaralhamento gerado é válido e não deixa o cubo resolvido.
  if (isSolved(applyMoves(createSolved(n), moves))) throw new SolverError('Embaralhamento inválido.');
  return { size: n, moves, text: formatMoves(moves), seed: usedSeed, kind: 'random-state' };
}
