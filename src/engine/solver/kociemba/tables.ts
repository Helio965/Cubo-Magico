import {
  CubieCube,
  MOVE_CUBES,
  permRank,
  N_FLIP,
  N_MOVES,
  N_PERM8,
  N_SLICE,
  N_SLICE_PERM,
  N_TWIST,
} from './cubie';

/** Movimentos permitidos na fase 2: U, U2, U', D, D2, D', R2, L2, F2, B2. */
export const PHASE2_MOVES: readonly number[] = [0, 1, 2, 9, 10, 11, 4, 13, 7, 16];

export interface KociembaTables {
  twistMove: Uint16Array;
  flipMove: Uint16Array;
  sliceMove: Uint16Array;
  cornerPermMove: Uint16Array;
  edge8PermMove: Uint16Array;
  slicePermMove: Uint8Array;
  sliceTwistPrune: Int8Array;
  sliceFlipPrune: Int8Array;
  sliceCornerPrune: Int8Array;
  sliceEdgePrune: Int8Array;
}

let tables: KociembaTables | null = null;

export function tablesReady(): boolean {
  return tables !== null;
}

/** Gera (uma única vez) todas as tabelas. Leva ~1 s em um computador comum. */
export function getTables(): KociembaTables {
  if (tables) return tables;

  const twistMove = new Uint16Array(N_TWIST * N_MOVES);
  const flipMove = new Uint16Array(N_FLIP * N_MOVES);
  const sliceMove = new Uint16Array(N_SLICE * N_MOVES);
  const cornerPermMove = new Uint16Array(N_PERM8 * N_MOVES);
  const edge8PermMove = new Uint16Array(N_PERM8 * N_MOVES);
  const slicePermMove = new Uint8Array(N_SLICE_PERM * N_MOVES);

  const a = new CubieCube();
  const cp = new Int8Array(8);
  const ep = new Int8Array(12);

  for (let i = 0; i < N_TWIST; i++) {
    a.setTwist(i);
    for (let m = 0; m < N_MOVES; m++) {
      const mv = MOVE_CUBES[m];
      let r = 0;
      for (let k = 0; k < 7; k++) r = r * 3 + ((a.co[mv.cp[k]] + mv.co[k]) % 3);
      twistMove[i * N_MOVES + m] = r;
    }
  }
  for (let i = 0; i < N_FLIP; i++) {
    a.setFlip(i);
    for (let m = 0; m < N_MOVES; m++) {
      const mv = MOVE_CUBES[m];
      let r = 0;
      for (let k = 0; k < 11; k++) r = r * 2 + ((a.eo[mv.ep[k]] + mv.eo[k]) % 2);
      flipMove[i * N_MOVES + m] = r;
    }
  }
  const b = new CubieCube();
  for (let i = 0; i < N_SLICE; i++) {
    a.setSlice(i);
    for (let m = 0; m < N_MOVES; m++) {
      const mv = MOVE_CUBES[m];
      for (let k = 0; k < 12; k++) b.ep[k] = a.ep[mv.ep[k]];
      sliceMove[i * N_MOVES + m] = b.getSlice();
    }
  }
  for (let i = 0; i < N_PERM8; i++) {
    a.setCornerPerm(i);
    for (let m = 0; m < N_MOVES; m++) {
      const mv = MOVE_CUBES[m];
      for (let k = 0; k < 8; k++) cp[k] = a.cp[mv.cp[k]];
      cornerPermMove[i * N_MOVES + m] = permRank(cp, 0, 8, 0);
    }
  }
  for (let i = 0; i < N_PERM8; i++) {
    a.setEdge8Perm(i);
    for (let k = 8; k < 12; k++) a.ep[k] = k;
    for (const m of PHASE2_MOVES) {
      const mv = MOVE_CUBES[m];
      for (let k = 0; k < 8; k++) ep[k] = a.ep[mv.ep[k]];
      edge8PermMove[i * N_MOVES + m] = permRank(ep, 0, 8, 0);
    }
  }
  for (let i = 0; i < N_SLICE_PERM; i++) {
    for (let k = 0; k < 8; k++) a.ep[k] = k;
    a.setSlicePerm(i);
    for (const m of PHASE2_MOVES) {
      const mv = MOVE_CUBES[m];
      for (let k = 0; k < 12; k++) ep[k] = a.ep[mv.ep[k]];
      slicePermMove[i * N_MOVES + m] = permRank(ep, 8, 4, 8);
    }
  }

  const allMoves = Array.from({ length: N_MOVES }, (_, i) => i);
  const sliceTwistPrune = buildPrune(N_SLICE, N_TWIST, sliceMove, twistMove, allMoves);
  const sliceFlipPrune = buildPrune(N_SLICE, N_FLIP, sliceMove, flipMove, allMoves);
  const sliceCornerPrune = buildPrune(N_SLICE_PERM, N_PERM8, slicePermMove, cornerPermMove, PHASE2_MOVES);
  const sliceEdgePrune = buildPrune(N_SLICE_PERM, N_PERM8, slicePermMove, edge8PermMove, PHASE2_MOVES);

  tables = {
    twistMove,
    flipMove,
    sliceMove,
    cornerPermMove,
    edge8PermMove,
    slicePermMove,
    sliceTwistPrune,
    sliceFlipPrune,
    sliceCornerPrune,
    sliceEdgePrune,
  };
  return tables;
}

/**
 * Tabela de distâncias exatas (BFS) no produto de duas coordenadas, com o
 * estado resolvido em (0, 0). Índice = a * nB + b.
 */
function buildPrune(
  nA: number,
  nB: number,
  moveA: ArrayLike<number>,
  moveB: ArrayLike<number>,
  moves: readonly number[],
): Int8Array {
  const size = nA * nB;
  const table = new Int8Array(size).fill(-1);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  table[0] = 0;
  queue[tail++] = 0;
  while (head < tail) {
    const idx = queue[head++];
    const depth = table[idx] + 1;
    const ia = (idx / nB) | 0;
    const ib = idx - ia * nB;
    for (let k = 0; k < moves.length; k++) {
      const m = moves[k];
      const next = moveA[ia * N_MOVES + m] * nB + moveB[ib * N_MOVES + m];
      if (table[next] === -1) {
        table[next] = depth;
        queue[tail++] = next;
      }
    }
  }
  return table;
}
