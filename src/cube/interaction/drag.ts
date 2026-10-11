import type { Axis } from '../../engine/math/rotations';
import type { FaceBase, Move, MoveAmount, SliceBase } from '../../engine/moves/notation';

export interface SignedAxis {
  axis: Axis;
  sign: 1 | -1;
}

/** Eixo principal mais próximo de um vetor (a normal da face tocada). */
export function snapToAxis(v: readonly [number, number, number]): SignedAxis {
  const ax = Math.abs(v[0]);
  const ay = Math.abs(v[1]);
  const az = Math.abs(v[2]);
  const axis: Axis = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
  return { axis, sign: v[axis] >= 0 ? 1 : -1 };
}

/** Produto vetorial entre dois eixos principais distintos. */
export function crossAxes(a: SignedAxis, b: SignedAxis): SignedAxis {
  if (a.axis === b.axis) throw new Error('Eixos paralelos');
  const c = (3 - a.axis - b.axis) as Axis;
  // e_x × e_y = e_z, e_y × e_z = e_x, e_z × e_x = e_y (permutação cíclica)
  const cyclic = (b.axis - a.axis + 3) % 3 === 1 ? 1 : -1;
  return { axis: c, sign: (a.sign * b.sign * cyclic) as 1 | -1 };
}

export interface DragTurn {
  /** Eixo de rotação da camada. */
  axis: Axis;
  /** +1 quando arrastar no sentido positivo de `dir` corresponde a rotação positiva no eixo. */
  sign: 1 | -1;
  /** Direção de arrasto escolhida, no plano da face. */
  dir: SignedAxis;
}

/**
 * Converte um arrasto sobre uma face (normal `normal`, deslocamento `delta`
 * no plano da face) na camada que deve girar. Uma rotação positiva em torno
 * de n × dir move o ponto tocado no sentido de dir.
 */
export function dragToTurn(normal: SignedAxis, delta: readonly [number, number, number]): DragTurn {
  const others = ([0, 1, 2] as Axis[]).filter((a) => a !== normal.axis);
  const dirAxis = Math.abs(delta[others[0]]) >= Math.abs(delta[others[1]]) ? others[0] : others[1];
  const dir: SignedAxis = { axis: dirAxis, sign: 1 };
  const rot = crossAxes(normal, dir);
  return { axis: rot.axis, sign: rot.sign, dir };
}

function amountFromQuarter(q: number): MoveAmount {
  const m = ((q % 4) + 4) % 4;
  if (m === 1) return 1;
  if (m === 3) return -1;
  return q < 0 ? -2 : 2;
}

/**
 * Converte uma rotação primitiva de uma única camada (eixo, índice da camada,
 * quartos de volta em torno do eixo positivo) para a notação padrão.
 */
export function layerTurnToMove(axis: Axis, layer: number, qt: number, n: number): Move {
  const mid = (n - 1) / 2;
  if (n % 2 === 1 && layer === mid && n >= 3) {
    const base: SliceBase = axis === 0 ? 'M' : axis === 1 ? 'E' : 'S';
    // M segue L e E segue D (qt = amount); S segue F (qt = -amount).
    return { base, depth: 1, width: 1, amount: amountFromQuarter(base === 'S' ? -qt : qt) };
  }
  const positive = layer > mid;
  const faces: [FaceBase, FaceBase][] = [
    ['R', 'L'],
    ['U', 'D'],
    ['F', 'B'],
  ];
  const base = positive ? faces[axis][0] : faces[axis][1];
  const depth = positive ? n - layer : layer + 1;
  return { base, depth, width: 1, amount: amountFromQuarter(positive ? -qt : qt) };
}
