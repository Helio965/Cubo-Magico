import { CubieCube, MOVE_CUBES, permRank, permUnrank } from './kociemba/cubie';

/**
 * Resolvedor ótimo do 2×2×2 (métrica de meia-volta, HTM).
 *
 * Com o canto DBL fixo, o 2×2 possui 7! · 3^6 = 3.674.160 estados. Uma busca
 * em largura gera a distância exata de todos eles até o estado resolvido;
 * resolver passa a ser apenas descer na tabela, escolhendo a cada passo um
 * movimento que reduza a distância em 1. O resultado é sempre ótimo (≤ 11).
 */

export const N_PERM7 = 5040;
export const N_TWIST6 = 729;
const N_STATES = N_PERM7 * N_TWIST6;
/** Movimentos U, R, F com potências 1..3 (índices de MOVE_CUBES). */
export const TWO_MOVES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const POSITIONS = [0, 1, 2, 3, 4, 5, 7]; // todas exceto DBL (6)

interface TwoTables {
  permMove: Uint16Array;
  twistMove: Uint16Array;
  dist: Int8Array;
}

let tables: TwoTables | null = null;

export function encodePerm7(c: CubieCube): number {
  const arr = POSITIONS.map((p) => (c.cp[p] === 7 ? 6 : c.cp[p]));
  return permRank(arr, 0, 7, 0);
}

export function decodePerm7(rank: number, c: CubieCube): void {
  const arr: number[] = new Array(7);
  permUnrank(rank, arr, 0, 7, 0);
  POSITIONS.forEach((p, i) => (c.cp[p] = arr[i] === 6 ? 7 : arr[i]));
  c.cp[6] = 6;
}

export function encodeTwist6(c: CubieCube): number {
  let r = 0;
  for (let i = 0; i < 6; i++) r = r * 3 + c.co[i];
  return r;
}

export function decodeTwist6(rank: number, c: CubieCube): void {
  let sum = 0;
  for (let i = 5; i >= 0; i--) {
    c.co[i] = rank % 3;
    sum += c.co[i];
    rank = Math.floor(rank / 3);
  }
  c.co[6] = 0;
  c.co[7] = (3 - (sum % 3)) % 3;
}

export function twoByTwoTablesReady(): boolean {
  return tables !== null;
}

export function getTwoByTwoTables(): TwoTables {
  if (tables) return tables;
  const permMove = new Uint16Array(N_PERM7 * 9);
  const twistMove = new Uint16Array(N_TWIST6 * 9);
  const c = new CubieCube();
  for (let i = 0; i < N_PERM7; i++) {
    for (let m = 0; m < 9; m++) {
      decodePerm7(i, c);
      c.cornerMultiply(MOVE_CUBES[TWO_MOVES[m]]);
      permMove[i * 9 + m] = encodePerm7(c);
    }
  }
  for (let i = 0; i < N_TWIST6; i++) {
    for (let m = 0; m < 9; m++) {
      decodeTwist6(i, c);
      c.cornerMultiply(MOVE_CUBES[TWO_MOVES[m]]);
      twistMove[i * 9 + m] = encodeTwist6(c);
    }
  }
  const dist = new Int8Array(N_STATES).fill(-1);
  dist[0] = 0;
  let frontier = new Int32Array([0]);
  let depth = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const idx of frontier) {
      const p = Math.floor(idx / N_TWIST6);
      const t = idx - p * N_TWIST6;
      for (let m = 0; m < 9; m++) {
        const n = permMove[p * 9 + m] * N_TWIST6 + twistMove[t * 9 + m];
        if (dist[n] === -1) {
          dist[n] = depth + 1;
          next.push(n);
        }
      }
    }
    frontier = Int32Array.from(next);
    depth++;
  }
  tables = { permMove, twistMove, dist };
  return tables;
}

/** Distância ótima (HTM) de um estado de cantos com DBL resolvido. */
export function twoByTwoDistance(c: CubieCube): number {
  const t = getTwoByTwoTables();
  return t.dist[encodePerm7(c) * N_TWIST6 + encodeTwist6(c)];
}

/** Retorna os índices de MOVE_CUBES de uma solução ótima. */
export function solveTwoByTwoCorners(c: CubieCube): number[] {
  if (c.cp[6] !== 6 || c.co[6] !== 0) throw new Error('O canto DBL precisa estar resolvido.');
  const t = getTwoByTwoTables();
  let p = encodePerm7(c);
  let tw = encodeTwist6(c);
  let d = t.dist[p * N_TWIST6 + tw];
  if (d < 0) throw new Error('Estado de 2×2 impossível.');
  const solution: number[] = [];
  while (d > 0) {
    let advanced = false;
    for (let m = 0; m < 9; m++) {
      const np = t.permMove[p * 9 + m];
      const nt = t.twistMove[tw * 9 + m];
      if (t.dist[np * N_TWIST6 + nt] === d - 1) {
        solution.push(TWO_MOVES[m]);
        p = np;
        tw = nt;
        d--;
        advanced = true;
        break;
      }
    }
    if (!advanced) throw new Error('Tabela do 2×2 inconsistente.');
  }
  return solution;
}

/** Índice de estado aleatório (para embaralhamento por estado aleatório). */
export function twoByTwoStateFromIndex(index: number): CubieCube {
  const c = new CubieCube();
  decodePerm7(Math.floor(index / N_TWIST6), c);
  decodeTwist6(index % N_TWIST6, c);
  return c;
}

export const TWO_BY_TWO_STATES = N_STATES;
