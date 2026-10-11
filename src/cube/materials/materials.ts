import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three';
import { FACE_IDS } from '../../engine/state/faces';
import type { BodyColor, FaceColors, Finish } from '../../features/settings/settingsStore';

export interface MaterialParams {
  colors: FaceColors;
  finish: Finish;
  bodyColor: BodyColor;
  reflections: number;
}

export interface MaterialSet {
  body: Material;
  bodyGlow: Material;
  bodyDim: Material;
  /** Um material por face (U R F D L B), compartilhado por todos os adesivos dessa cor. */
  stickers: Material[];
  stickersDim: Material[];
  dispose: () => void;
}

const BODY_COLORS: Record<BodyColor, string> = {
  black: '#0c0e12',
  graphite: '#2b2f37',
  white: '#e7eaee',
};

const FINISH: Record<Finish, { roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  glossy: { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 },
  satin: { roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 },
  matte: { roughness: 0.78, clearcoat: 0, clearcoatRoughness: 1 },
};

export function createMaterials(p: MaterialParams): MaterialSet {
  const f = FINISH[p.finish];
  const bodyBase = new Color(BODY_COLORS[p.bodyColor]);
  const body = new MeshPhysicalMaterial({
    color: bodyBase,
    roughness: p.bodyColor === 'white' ? 0.35 : 0.42,
    metalness: 0.05,
    clearcoat: p.finish === 'matte' ? 0 : 0.35,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.6 * p.reflections,
  });
  const bodyGlow = body.clone();
  (bodyGlow as MeshPhysicalMaterial).emissive = new Color('#6d5cff');
  (bodyGlow as MeshPhysicalMaterial).emissiveIntensity = 0.55;
  const bodyDim = body.clone();
  (bodyDim as MeshPhysicalMaterial).color = bodyBase.clone().multiplyScalar(0.55);

  const stickers = FACE_IDS.map(
    (face) =>
      new MeshPhysicalMaterial({
        color: new Color(p.colors[face]),
        roughness: f.roughness,
        metalness: 0,
        clearcoat: f.clearcoat,
        clearcoatRoughness: f.clearcoatRoughness,
        envMapIntensity: p.reflections,
      }),
  );
  const stickersDim = FACE_IDS.map(
    (face) =>
      new MeshStandardMaterial({
        color: new Color(p.colors[face]).multiplyScalar(0.16),
        roughness: 0.9,
        metalness: 0,
      }),
  );
  const all: Material[] = [body, bodyGlow, bodyDim, ...stickers, ...stickersDim];
  return { body, bodyGlow, bodyDim, stickers, stickersDim, dispose: () => all.forEach((m) => m.dispose()) };
}
