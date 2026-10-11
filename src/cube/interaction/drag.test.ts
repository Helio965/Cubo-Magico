import { describe, expect, it } from 'vitest';
import { formatMove, toPrimitive } from '../../engine/moves/notation';
import { crossAxes, dragToTurn, layerTurnToMove, snapToAxis } from './drag';

describe('interação por arrasto', () => {
  it('encaixa vetores no eixo mais próximo', () => {
    expect(snapToAxis([0.1, 0.9, -0.2])).toEqual({ axis: 1, sign: 1 });
    expect(snapToAxis([-0.7, 0.1, 0.2])).toEqual({ axis: 0, sign: -1 });
  });

  it('produto vetorial de eixos', () => {
    expect(crossAxes({ axis: 0, sign: 1 }, { axis: 1, sign: 1 })).toEqual({ axis: 2, sign: 1 });
    expect(crossAxes({ axis: 1, sign: 1 }, { axis: 0, sign: 1 })).toEqual({ axis: 2, sign: -1 });
    expect(crossAxes({ axis: 2, sign: 1 }, { axis: 0, sign: 1 })).toEqual({ axis: 1, sign: 1 });
    expect(crossAxes({ axis: 2, sign: -1 }, { axis: 1, sign: 1 })).toEqual({ axis: 0, sign: 1 });
  });

  it('arrastar a fileira superior da face frontal para a direita gera U\'', () => {
    const turn = dragToTurn({ axis: 2, sign: 1 }, [1, 0.1, 0]);
    expect(turn.axis).toBe(1);
    // rotação positiva em torno de +y move a frente para a direita
    const move = layerTurnToMove(turn.axis, 2, turn.sign * 1, 3);
    expect(formatMove(move)).toBe("U'");
  });

  it('arrastar a coluna direita da face frontal para cima gera R', () => {
    const turn = dragToTurn({ axis: 2, sign: 1 }, [0, 1, 0]);
    const move = layerTurnToMove(turn.axis, 2, turn.sign * 1, 3);
    expect(formatMove(move)).toBe('R');
  });

  it('converte camadas internas e fatias', () => {
    expect(formatMove(layerTurnToMove(0, 1, 1, 3))).toBe('M');
    expect(formatMove(layerTurnToMove(1, 1, 1, 3))).toBe('E');
    expect(formatMove(layerTurnToMove(2, 1, -1, 3))).toBe('S');
    expect(formatMove(layerTurnToMove(0, 2, -1, 4))).toBe('2R');
    expect(formatMove(layerTurnToMove(0, 1, 1, 4))).toBe('2L');
    expect(formatMove(layerTurnToMove(0, 0, 2, 4))).toBe('L2');
  });

  it('a conversão é coerente com as primitivas do motor', () => {
    for (const n of [2, 3, 4, 5]) {
      for (let axis = 0 as 0 | 1 | 2; axis < 3; axis = (axis + 1) as 0 | 1 | 2) {
        for (let layer = 0; layer < n; layer++) {
          for (const qt of [1, -1, 2]) {
            const move = layerTurnToMove(axis, layer, qt, n);
            const prim = toPrimitive(move, n);
            expect(prim.axis).toBe(axis);
            expect(prim.layers).toEqual([layer]);
            expect(((prim.qt - qt) % 4 + 4) % 4).toBe(0);
          }
        }
        if (axis === 2) break;
      }
    }
  });
});
