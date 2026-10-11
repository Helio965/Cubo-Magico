import type { Axis } from '../math/rotations';

export type FaceBase = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type SliceBase = 'M' | 'E' | 'S';
export type RotationBase = 'x' | 'y' | 'z';
export type MoveBase = FaceBase | SliceBase | RotationBase;
export type MoveAmount = 1 | -1 | 2 | -2;

/**
 * Um movimento em notação padrão (WCA/SiGN).
 *
 * - Face simples: `R` → depth 1, width 1
 * - Camada interna isolada: `2R` → depth 2, width 1
 * - Movimento largo: `Rw` / `r` → depth 2, width 2; `3Rw` → depth 3, width 3
 * - Fatias: `M`, `E`, `S` (apenas cubos ímpares)
 * - Rotações do cubo inteiro: `x`, `y`, `z`
 */
export interface Move {
  readonly base: MoveBase;
  /** Camada mais interna afetada, contada a partir da face (1 = externa). */
  readonly depth: number;
  /** Quantidade de camadas giradas, terminando em `depth`. */
  readonly width: number;
  /** Quartos de volta no sentido horário da face (negativo = anti-horário). */
  readonly amount: MoveAmount;
}

/** Forma primitiva usada pelo motor: rotação de `qt`·90° em torno do eixo positivo. */
export interface PrimitiveMove {
  readonly axis: Axis;
  /** Índices de camada (0 = lado negativo do eixo, N-1 = lado positivo). */
  readonly layers: readonly number[];
  /** Quartos de volta em torno do eixo positivo (regra da mão direita). */
  readonly qt: number;
}

export class NotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotationError';
  }
}

const FACE_BASES: readonly FaceBase[] = ['U', 'R', 'F', 'D', 'L', 'B'];
const SLICE_BASES: readonly SliceBase[] = ['M', 'E', 'S'];
const ROTATION_BASES: readonly RotationBase[] = ['x', 'y', 'z'];

export const isFaceBase = (b: MoveBase): b is FaceBase => (FACE_BASES as readonly string[]).includes(b);
export const isSliceBase = (b: MoveBase): b is SliceBase => (SLICE_BASES as readonly string[]).includes(b);
export const isRotationBase = (b: MoveBase): b is RotationBase =>
  (ROTATION_BASES as readonly string[]).includes(b);

export function isRotation(move: Move): boolean {
  return isRotationBase(move.base);
}

export function move(base: MoveBase, amount: MoveAmount = 1, depth = 1, width = 1): Move {
  return { base, amount, depth, width };
}

export function formatMove(m: Move): string {
  let prefix = '';
  let body: string = m.base;
  if (isFaceBase(m.base)) {
    if (m.width === 1 && m.depth > 1) prefix = String(m.depth);
    else if (m.width > 1) {
      if (m.width !== m.depth) prefix = `${m.depth - m.width + 1}-${m.depth}`;
      else if (m.depth > 2) prefix = String(m.depth);
      body = `${m.base}w`;
    }
  }
  const suffix = m.amount === 1 ? '' : m.amount === -1 ? "'" : m.amount === 2 ? '2' : "2'";
  return prefix + body + suffix;
}

export function formatMoves(moves: readonly Move[]): string {
  return moves.map(formatMove).join(' ');
}

export function invertMove(m: Move): Move {
  return { ...m, amount: -m.amount as MoveAmount };
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return moves.map(invertMove).reverse();
}

export function sameLayers(a: Move, b: Move): boolean {
  return a.base === b.base && a.depth === b.depth && a.width === b.width;
}

export function movesEqual(a: Move, b: Move): boolean {
  return sameLayers(a, b) && a.amount === b.amount;
}

const TOKEN = /^(?:(\d+)(?:-(\d+))?)?([URFDLBurfdlbMESxyz])(w)?(2'|'2|2|'|’)?$/;

/** Converte uma string como `R U R' U'` ou `3Rw2 Uw' M2` em movimentos. */
export function parseMoves(input: string): Move[] {
  const cleaned = input.replace(/[(),[\]]/g, ' ').replace(/’/g, "'").trim();
  if (cleaned === '') return [];
  const result: Move[] = [];
  // Permite tanto "R U R'" quanto "RUR'" dividindo em tokens com regex.
  const parts = cleaned.split(/\s+/);
  for (const part of parts) {
    const tokens = part.match(/(\d+(?:-\d+)?)?[URFDLBurfdlbMESxyz]w?(?:2'|'2|2|')?/g);
    if (!tokens || tokens.join('') !== part) {
      throw new NotationError(`Movimento inválido: "${part}"`);
    }
    for (const token of tokens) result.push(parseToken(token));
  }
  return result;
}

function parseToken(token: string): Move {
  const match = TOKEN.exec(token);
  if (!match) throw new NotationError(`Movimento inválido: "${token}"`);
  const [, num1, num2, letter, wide, suffix] = match;
  const amount: MoveAmount =
    suffix === undefined ? 1 : suffix === "'" ? -1 : suffix === '2' ? 2 : -2;

  if (letter === 'x' || letter === 'y' || letter === 'z') {
    if (num1 || wide) throw new NotationError(`Rotação inválida: "${token}"`);
    return { base: letter, depth: 1, width: 1, amount };
  }
  if (letter === 'M' || letter === 'E' || letter === 'S') {
    if (num1 || wide) throw new NotationError(`Fatia inválida: "${token}"`);
    return { base: letter, depth: 1, width: 1, amount };
  }
  const lower = letter === letter.toLowerCase();
  const base = letter.toUpperCase() as FaceBase;
  if (lower) {
    if (num1 || wide) throw new NotationError(`Movimento inválido: "${token}"`);
    return { base, depth: 2, width: 2, amount };
  }
  if (num2 !== undefined) {
    // Intervalo explícito "2-3Rw"
    if (!wide) throw new NotationError(`Intervalo exige "w": "${token}"`);
    const from = Number(num1);
    const to = Number(num2);
    if (!(from >= 1 && to >= from)) throw new NotationError(`Intervalo inválido: "${token}"`);
    return { base, depth: to, width: to - from + 1, amount };
  }
  if (wide) {
    const depth = num1 ? Number(num1) : 2;
    if (depth < 2) throw new NotationError(`Movimento largo inválido: "${token}"`);
    return { base, depth, width: depth, amount };
  }
  const depth = num1 ? Number(num1) : 1;
  if (depth < 1) throw new NotationError(`Camada inválida: "${token}"`);
  return { base, depth, width: 1, amount };
}

const FACE_PRIMITIVE: Record<FaceBase, { axis: Axis; positive: boolean }> = {
  R: { axis: 0, positive: true },
  L: { axis: 0, positive: false },
  U: { axis: 1, positive: true },
  D: { axis: 1, positive: false },
  F: { axis: 2, positive: true },
  B: { axis: 2, positive: false },
};

/** Verifica se o movimento é válido para um cubo N×N×N. */
export function validateMove(m: Move, n: number): string | null {
  if (isRotationBase(m.base)) return null;
  if (isSliceBase(m.base)) {
    return n % 2 === 1 && n >= 3 ? null : `Fatias ${m.base} existem apenas em cubos ímpares (3×3, 5×5…).`;
  }
  if (m.width < 1 || m.depth < m.width) return `Movimento inválido: ${formatMove(m)}`;
  if (m.depth > n - 1) {
    return `O movimento ${formatMove(m)} exige mais camadas do que o cubo ${n}×${n} possui.`;
  }
  return null;
}

export function toPrimitive(m: Move, n: number): PrimitiveMove {
  const error = validateMove(m, n);
  if (error) throw new NotationError(error);
  if (isRotationBase(m.base)) {
    const axis = (m.base === 'x' ? 0 : m.base === 'y' ? 1 : 2) as Axis;
    return { axis, layers: Array.from({ length: n }, (_, i) => i), qt: -m.amount };
  }
  if (isSliceBase(m.base)) {
    const mid = (n - 1) / 2;
    if (m.base === 'M') return { axis: 0, layers: [mid], qt: m.amount }; // segue L
    if (m.base === 'E') return { axis: 1, layers: [mid], qt: m.amount }; // segue D
    return { axis: 2, layers: [mid], qt: -m.amount }; // S segue F
  }
  const { axis, positive } = FACE_PRIMITIVE[m.base];
  const layers: number[] = [];
  for (let d = m.depth - m.width + 1; d <= m.depth; d++) {
    layers.push(positive ? n - d : d - 1);
  }
  layers.sort((a, b) => a - b);
  // Horário olhando para a face = -90° em torno da normal externa.
  return { axis, layers, qt: positive ? -m.amount : m.amount };
}
