import { BufferGeometry, ExtrudeGeometry, Shape, ShapeGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Geometrias compartilhadas por todas as peças: um único corpo arredondado e
 * um único adesivo. Elas são reutilizadas (nunca recriadas por peça) e
 * descartadas quando os parâmetros visuais mudam.
 */
export interface GeometryParams {
  roundness: number; // 0..1
  segments: number;
  bevel: boolean;
}

export const STICKER_SIZE = 0.82;
export const STICKER_DEPTH = 0.012;

export function bodyRadius(roundness: number): number {
  return 0.035 + roundness * 0.13;
}

export function createBodyGeometry(p: GeometryParams): BufferGeometry {
  const g = new RoundedBoxGeometry(1, 1, 1, p.segments, bodyRadius(p.roundness));
  g.computeBoundingSphere();
  return g;
}

function roundedSquare(size: number, radius: number): Shape {
  const h = size / 2;
  const r = Math.min(radius, h);
  const s = new Shape();
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}

/** Adesivo com cantos arredondados, voltado para +Z e com a base em z = 0. */
export function createStickerGeometry(p: GeometryParams): BufferGeometry {
  const radius = 0.07 + p.roundness * 0.12;
  const shape = roundedSquare(STICKER_SIZE, radius);
  if (!p.bevel) {
    const flat = new ShapeGeometry(shape, 6);
    flat.translate(0, 0, STICKER_DEPTH);
    return flat;
  }
  const bevelSize = 0.012;
  const g = new ExtrudeGeometry(roundedSquare(STICKER_SIZE - bevelSize * 2, Math.max(0.01, radius - bevelSize)), {
    depth: STICKER_DEPTH * 0.4,
    bevelEnabled: true,
    bevelThickness: STICKER_DEPTH * 0.6,
    bevelSize,
    bevelSegments: Math.max(1, p.segments - 1),
    curveSegments: 6,
  });
  g.translate(0, 0, STICKER_DEPTH * 0.6);
  g.computeVertexNormals();
  return g;
}
