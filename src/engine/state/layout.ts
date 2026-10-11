import { ROTATIONS, transform, type Vec3 } from '../math/rotations';
import { FACE_AXIS, FACE_NORMALS, FACE_SIGN, faceFromNormal } from './faces';

export const MIN_SIZE = 2;
export const MAX_SIZE = 7;

/**
 * Estrutura estática de um cubo N×N×N: quais peças (cubies) existem na
 * superfície e quais adesivos cada uma possui. Coordenadas são "dobradas"
 * (-(N-1), -(N-3), …, N-1) para que permaneçam inteiras também nos cubos pares.
 */
export interface CubeLayout {
  readonly n: number;
  readonly count: number;
  /** Posição inicial de cada peça (3 inteiros por peça). */
  readonly home: Int8Array;
  /** Faces (índices U R F D L B) dos adesivos de cada peça no estado resolvido. */
  readonly stickers: readonly (readonly number[])[];
  /** Tipo da peça, útil para tutoriais e destaque visual. */
  readonly kinds: readonly PieceKind[];
}

export type PieceKind = 'corner' | 'edge' | 'center';

/** ROT_FACE[r * 6 + f] = face para onde a normal da face f aponta após a rotação r. */
export const ROT_FACE: Uint8Array = (() => {
  const table = new Uint8Array(24 * 6);
  for (let r = 0; r < 24; r++) {
    for (let f = 0; f < 6; f++) {
      table[r * 6 + f] = faceFromNormal(transform(ROTATIONS[r], FACE_NORMALS[f]));
    }
  }
  return table;
})();

const cache = new Map<number, CubeLayout>();

export function assertSize(n: number): void {
  if (!Number.isInteger(n) || n < MIN_SIZE || n > MAX_SIZE) {
    throw new Error(`Tamanho de cubo não suportado: ${n}. Use valores entre ${MIN_SIZE} e ${MAX_SIZE}.`);
  }
}

export function getLayout(n: number): CubeLayout {
  const cached = cache.get(n);
  if (cached) return cached;
  assertSize(n);
  const m = n - 1;
  const home: number[] = [];
  const stickers: number[][] = [];
  const kinds: PieceKind[] = [];
  for (let x = -m; x <= m; x += 2) {
    for (let y = -m; y <= m; y += 2) {
      for (let z = -m; z <= m; z += 2) {
        const p: Vec3 = [x, y, z];
        const faces: number[] = [];
        for (let f = 0; f < 6; f++) {
          if (p[FACE_AXIS[f]] === FACE_SIGN[f] * m) faces.push(f);
        }
        if (faces.length === 0) continue; // peça interna, invisível
        home.push(x, y, z);
        stickers.push(faces);
        kinds.push(faces.length === 3 ? 'corner' : faces.length === 2 ? 'edge' : 'center');
      }
    }
  }
  const layout: CubeLayout = {
    n,
    count: stickers.length,
    home: Int8Array.from(home),
    stickers,
    kinds,
  };
  cache.set(n, layout);
  return layout;
}
