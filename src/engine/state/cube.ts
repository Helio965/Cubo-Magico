import { COMPOSE, quarterTurn, ROTATIONS } from '../math/rotations';
import { parseMoves, toPrimitive, type Move, type PrimitiveMove } from '../moves/notation';
import { FACE_GRID, OPPOSITE_FACE } from './faces';
import { getLayout, ROT_FACE, type CubeLayout } from './layout';

/**
 * Estado lógico (matemático) de um cubo N×N×N, totalmente independente da
 * renderização. Cada peça possui posição inteira e um índice de orientação
 * no grupo de 24 rotações. Estados são imutáveis.
 */
export interface CubeState {
  readonly n: number;
  /** Posição atual de cada peça (3 inteiros por peça, coordenadas dobradas). */
  readonly pos: Int8Array;
  /** Orientação atual de cada peça (índice em ROTATIONS). */
  readonly ori: Uint8Array;
}

export function createSolved(n: number): CubeState {
  const layout = getLayout(n);
  return { n, pos: Int8Array.from(layout.home), ori: new Uint8Array(layout.count) };
}

export function cloneState(s: CubeState): CubeState {
  return { n: s.n, pos: Int8Array.from(s.pos), ori: Uint8Array.from(s.ori) };
}

/** Índice de camada (0..N-1) de uma coordenada dobrada. */
export const layerOf = (coord: number, n: number) => (coord + n - 1) / 2;

/** Índices das peças atualmente em uma das camadas do movimento primitivo. */
export function piecesInLayers(state: CubeState, prim: PrimitiveMove): number[] {
  const { n, pos } = state;
  const result: number[] = [];
  const count = state.ori.length;
  for (let i = 0; i < count; i++) {
    if (prim.layers.includes(layerOf(pos[i * 3 + prim.axis], n))) result.push(i);
  }
  return result;
}

export function applyPrimitive(state: CubeState, prim: PrimitiveMove): CubeState {
  const q = ((prim.qt % 4) + 4) % 4;
  if (q === 0) return state;
  const rot = quarterTurn(prim.axis, q);
  const m = ROTATIONS[rot];
  const pos = Int8Array.from(state.pos);
  const ori = Uint8Array.from(state.ori);
  for (const i of piecesInLayers(state, prim)) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    pos[i * 3] = m[0] * x + m[1] * y + m[2] * z;
    pos[i * 3 + 1] = m[3] * x + m[4] * y + m[5] * z;
    pos[i * 3 + 2] = m[6] * x + m[7] * y + m[8] * z;
    ori[i] = COMPOSE[rot * 24 + ori[i]];
  }
  return { n: state.n, pos, ori };
}

export function applyMove(state: CubeState, move: Move): CubeState {
  return applyPrimitive(state, toPrimitive(move, state.n));
}

export function applyMoves(state: CubeState, moves: readonly Move[] | string): CubeState {
  const list = typeof moves === 'string' ? parseMoves(moves) : moves;
  let s = state;
  for (const mv of list) s = applyMove(s, mv);
  return s;
}

export function statesEqual(a: CubeState, b: CubeState): boolean {
  if (a.n !== b.n || a.ori.length !== b.ori.length) return false;
  for (let i = 0; i < a.pos.length; i++) if (a.pos[i] !== b.pos[i]) return false;
  for (let i = 0; i < a.ori.length; i++) if (a.ori[i] !== b.ori[i]) return false;
  return true;
}

/**
 * Planificação do estado: para cada face (U R F D L B) e cada posição da
 * grade N×N, a face de origem (cor) do adesivo que está ali.
 * Ordem idêntica à dos facelets de Kociemba.
 */
export function getFacelets(state: CubeState): Uint8Array {
  const { n, pos, ori } = state;
  const layout: CubeLayout = getLayout(n);
  const out = new Uint8Array(6 * n * n).fill(255);
  const m = n - 1;
  for (let i = 0; i < layout.count; i++) {
    const p: [number, number, number] = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    for (const homeFace of layout.stickers[i]) {
      const face = ROT_FACE[ori[i] * 6 + homeFace];
      const { right, down } = FACE_GRID[face];
      const col = (p[0] * right[0] + p[1] * right[1] + p[2] * right[2] + m) / 2;
      const row = (p[0] * down[0] + p[1] * down[1] + p[2] * down[2] + m) / 2;
      out[face * n * n + row * n + col] = homeFace;
    }
  }
  return out;
}

/**
 * O cubo está resolvido quando cada face exibe uma única cor. A verificação
 * usa o estado lógico e independe da orientação global do cubo ou da câmera.
 */
export function isSolved(state: CubeState): boolean {
  const f = getFacelets(state);
  const nn = state.n * state.n;
  const used = new Set<number>();
  for (let face = 0; face < 6; face++) {
    const color = f[face * nn];
    for (let k = 1; k < nn; k++) if (f[face * nn + k] !== color) return false;
    used.add(color);
  }
  // Seis cores distintas e faces opostas coerentes.
  if (used.size !== 6) return false;
  for (let face = 0; face < 3; face++) {
    if (OPPOSITE_FACE[f[face * nn]] !== f[OPPOSITE_FACE[face] * nn]) return false;
  }
  return true;
}

/** Quantidade de adesivos que já estão na cor da maioria de sua face (0–1). */
export function solvedRatio(state: CubeState): number {
  const f = getFacelets(state);
  const nn = state.n * state.n;
  let good = 0;
  for (let face = 0; face < 6; face++) {
    const counts = new Array<number>(6).fill(0);
    for (let k = 0; k < nn; k++) counts[f[face * nn + k]]++;
    good += Math.max(...counts);
  }
  return good / (6 * nn);
}

export function serializeState(s: CubeState): string {
  return `${s.n}:${Array.from(s.pos).join(',')}:${Array.from(s.ori).join(',')}`;
}

export function deserializeState(text: string): CubeState {
  const [nStr, posStr, oriStr] = text.split(':');
  const n = Number(nStr);
  const layout = getLayout(n);
  const pos = Int8Array.from(posStr.split(',').map(Number));
  const ori = Uint8Array.from(oriStr.split(',').map(Number));
  if (pos.length !== layout.count * 3 || ori.length !== layout.count) {
    throw new Error('Estado salvo incompatível com o tamanho do cubo.');
  }
  return { n, pos, ori };
}
