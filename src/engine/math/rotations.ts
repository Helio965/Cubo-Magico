/**
 * Grupo das 24 rotações próprias do cubo, representadas por matrizes 3×3
 * inteiras. Toda a movimentação do motor usa aritmética inteira exata, de
 * modo que nenhuma imprecisão de ponto flutuante se acumula após centenas
 * de movimentos.
 */

export type Vec3 = readonly [number, number, number];
/** Matriz 3×3 em ordem row-major. */
export type Mat3 = readonly number[];
export type Axis = 0 | 1 | 2;

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function multiply(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

export function transform(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Rotação de +90° (regra da mão direita) em torno de um eixo. */
const QUARTER_POSITIVE: readonly Mat3[] = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0], // x: (x, y, z) -> (x, -z, y)
  [0, 0, 1, 0, 1, 0, -1, 0, 0], // y: (x, y, z) -> (z, y, -x)
  [0, -1, 0, 1, 0, 0, 0, 0, 1], // z: (x, y, z) -> (-y, x, z)
];

const key = (m: Mat3) => m.join(',');

function generateGroup(): Mat3[] {
  const group: Mat3[] = [IDENTITY];
  const seen = new Set([key(IDENTITY)]);
  for (let i = 0; i < group.length; i++) {
    for (const g of QUARTER_POSITIVE) {
      const next = multiply(g, group[i]);
      const k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        group.push(next);
      }
    }
  }
  return group;
}

/** As 24 matrizes de rotação. O índice 0 é a identidade. */
export const ROTATIONS: readonly Mat3[] = generateGroup();

const INDEX_BY_KEY = new Map(ROTATIONS.map((m, i) => [key(m), i]));

export function rotationIndex(m: Mat3): number {
  const idx = INDEX_BY_KEY.get(key(m));
  if (idx === undefined) throw new Error('Matriz não pertence ao grupo de rotações do cubo');
  return idx;
}

/** COMPOSE[a * 24 + b] = índice de ROTATIONS[a] · ROTATIONS[b]. */
export const COMPOSE: Uint8Array = (() => {
  const table = new Uint8Array(24 * 24);
  for (let a = 0; a < 24; a++) {
    for (let b = 0; b < 24; b++) {
      table[a * 24 + b] = rotationIndex(multiply(ROTATIONS[a], ROTATIONS[b]));
    }
  }
  return table;
})();

/** QUARTER[axis * 4 + q] = índice da rotação de q·90° em torno do eixo positivo. */
export const QUARTER: Uint8Array = (() => {
  const table = new Uint8Array(12);
  for (let axis = 0; axis < 3; axis++) {
    let m = IDENTITY;
    for (let q = 0; q < 4; q++) {
      table[axis * 4 + q] = rotationIndex(m);
      m = multiply(QUARTER_POSITIVE[axis], m);
    }
  }
  return table;
})();

export function quarterTurn(axis: Axis, quarterTurns: number): number {
  return QUARTER[axis * 4 + (((quarterTurns % 4) + 4) % 4)];
}
