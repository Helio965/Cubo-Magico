import { MathUtils } from 'three';

/** Distância que enquadra o cubo inteiro, considerando o FOV e a proporção da tela. */
export function fitDistance(n: number, spacing: number, fovDeg: number, aspect: number): number {
  const radius = ((n * spacing) / 2) * Math.sqrt(3) * 0.92;
  const vFov = MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const fov = Math.min(vFov, hFov);
  // Retrato (celular): o cubo pode ocupar uma fração maior da largura.
  return (radius / Math.sin(fov / 2)) * (aspect < 1 ? 1.32 : 1.65);
}
