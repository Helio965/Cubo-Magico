import type { Axis, Vec3 } from '../math/rotations';

/** Faces na ordem padrão de Kociemba: U R F D L B. */
export const FACE_IDS = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type FaceId = (typeof FACE_IDS)[number];

export const FACE_INDEX: Record<FaceId, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

/** Normal externa de cada face no referencial do cubo. */
export const FACE_NORMALS: readonly Vec3[] = [
  [0, 1, 0], // U
  [1, 0, 0], // R
  [0, 0, 1], // F
  [0, -1, 0], // D
  [-1, 0, 0], // L
  [0, 0, -1], // B
];

export const FACE_AXIS: readonly Axis[] = [1, 0, 2, 1, 0, 2];
/** +1 quando a face está no lado positivo do eixo. */
export const FACE_SIGN: readonly (1 | -1)[] = [1, 1, 1, -1, -1, -1];

export const OPPOSITE_FACE: readonly number[] = [3, 4, 5, 0, 1, 2];

/**
 * Direções (coluna → direita, linha → baixo) usadas para planificar cada face,
 * seguindo a convenção dos facelets de Kociemba (U1..U9, R1..R9, ...).
 */
export const FACE_GRID: readonly { right: Vec3; down: Vec3 }[] = [
  { right: [1, 0, 0], down: [0, 0, 1] }, // U: vista de cima, B no topo
  { right: [0, 0, -1], down: [0, -1, 0] }, // R: vista da direita
  { right: [1, 0, 0], down: [0, -1, 0] }, // F: vista frontal
  { right: [1, 0, 0], down: [0, 0, -1] }, // D: vista de baixo, F no topo
  { right: [0, 0, 1], down: [0, -1, 0] }, // L: vista da esquerda
  { right: [-1, 0, 0], down: [0, -1, 0] }, // B: vista traseira
];

export function faceFromNormal(v: Vec3): number {
  for (let f = 0; f < 6; f++) {
    const n = FACE_NORMALS[f];
    if (n[0] === v[0] && n[1] === v[1] && n[2] === v[2]) return f;
  }
  throw new Error(`Vetor não é uma normal de face: ${v.join(',')}`);
}
