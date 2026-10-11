import { ROTATIONS } from '../math/rotations';
import type { CubeState } from '../state/cube';
import { getLayout } from '../state/layout';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Verifica a consistência estrutural de um estado lógico:
 * 1. Cada peça está em uma posição de superfície válida;
 * 2. Nenhuma posição é ocupada por duas peças;
 * 3. Posição e orientação concordam (pos = R(ori) · home), propriedade que
 *    todo estado alcançado por giros reais preserva;
 * 4. Peças só ocupam posições do mesmo tipo (canto, aresta, centro).
 *
 * A solubilidade física completa do 3×3 (paridade, torção e orientação) é
 * verificada pelo resolvedor em `solver/kociemba/cubie.ts`.
 */
export function validateState(state: CubeState): ValidationResult {
  const errors: string[] = [];
  let layout;
  try {
    layout = getLayout(state.n);
  } catch (e) {
    return { valid: false, errors: [(e as Error).message] };
  }
  if (state.pos.length !== layout.count * 3 || state.ori.length !== layout.count) {
    return { valid: false, errors: ['Quantidade de peças incompatível com o tamanho do cubo.'] };
  }
  const homeKeys = new Map<string, number>();
  for (let i = 0; i < layout.count; i++) {
    homeKeys.set(`${layout.home[i * 3]},${layout.home[i * 3 + 1]},${layout.home[i * 3 + 2]}`, i);
  }
  const occupied = new Set<string>();
  for (let i = 0; i < layout.count; i++) {
    const o = state.ori[i];
    if (o >= 24) {
      errors.push(`Peça ${i}: orientação inválida.`);
      continue;
    }
    const k = `${state.pos[i * 3]},${state.pos[i * 3 + 1]},${state.pos[i * 3 + 2]}`;
    const target = homeKeys.get(k);
    if (target === undefined) {
      errors.push(`Peça ${i}: posição fora da superfície do cubo.`);
      continue;
    }
    if (occupied.has(k)) errors.push(`Posição ${k} ocupada por mais de uma peça.`);
    occupied.add(k);
    const m = ROTATIONS[o];
    const hx = layout.home[i * 3];
    const hy = layout.home[i * 3 + 1];
    const hz = layout.home[i * 3 + 2];
    if (
      m[0] * hx + m[1] * hy + m[2] * hz !== state.pos[i * 3] ||
      m[3] * hx + m[4] * hy + m[5] * hz !== state.pos[i * 3 + 1] ||
      m[6] * hx + m[7] * hy + m[8] * hz !== state.pos[i * 3 + 2]
    ) {
      errors.push(`Peça ${i}: orientação incompatível com a posição.`);
    }
    if (layout.kinds[target] !== layout.kinds[i]) errors.push(`Peça ${i}: tipo de posição incompatível.`);
  }
  return { valid: errors.length === 0, errors };
}
