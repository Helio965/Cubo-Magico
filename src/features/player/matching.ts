import { toPrimitive, type Move } from '../../engine/moves/notation';

const mod4 = (v: number) => ((v % 4) + 4) % 4;

function sameLayers(a: Move, b: Move, n: number): boolean {
  const pa = toPrimitive(a, n);
  const pb = toPrimitive(b, n);
  return pa.axis === pb.axis && pa.layers.join(',') === pb.layers.join(',');
}

function quarter(m: Move, n: number): number {
  return toPrimitive(m, n).qt;
}

export interface FollowState {
  index: number;
  /** Quartos de volta já executados do movimento esperado atual. */
  partial: number;
  /** Movimentos fora do roteiro que precisam ser desfeitos. */
  offPath: Move[];
}

export type FollowResult = 'match' | 'partial' | 'back' | 'deviation' | 'recovered';

/**
 * Compara um movimento do usuário com a sequência esperada. Reconhece
 * giros equivalentes (R2 feito como R R), retrocessos e desvios — e
 * detecta quando o usuário desfaz um desvio e volta ao roteiro.
 */
export function followMove(seq: readonly Move[], st: FollowState, mv: Move, n: number): { state: FollowState; result: FollowResult } {
  const offPath = [...st.offPath];
  if (offPath.length > 0) {
    const top = offPath[offPath.length - 1];
    if (sameLayers(top, mv, n)) {
      const rest = mod4(quarter(top, n) + quarter(mv, n));
      if (rest === 0) {
        offPath.pop();
        return { state: { ...st, offPath }, result: offPath.length ? 'deviation' : 'recovered' };
      }
      offPath[offPath.length - 1] = normalizeLike(top, rest, n);
      return { state: { ...st, offPath }, result: 'deviation' };
    }
    offPath.push(mv);
    return { state: { ...st, offPath }, result: 'deviation' };
  }

  const expected = seq[st.index];
  if (expected && sameLayers(expected, mv, n)) {
    const target = mod4(quarter(expected, n));
    const acc = mod4(st.partial + quarter(mv, n));
    if (acc === target) return { state: { index: st.index + 1, partial: 0, offPath }, result: 'match' };
    if (acc === 0) return { state: { ...st, partial: 0 }, result: 'back' };
    return { state: { ...st, partial: acc }, result: 'partial' };
  }
  if (st.partial === 0 && st.index > 0) {
    const previous = seq[st.index - 1];
    if (sameLayers(previous, mv, n) && mod4(quarter(previous, n) + quarter(mv, n)) === 0) {
      return { state: { index: st.index - 1, partial: 0, offPath }, result: 'back' };
    }
  }
  if (st.partial !== 0 && expected) {
    // Giro parcial interrompido: trata o parcial como desvio a ser desfeito.
    offPath.push(normalizeLike(expected, st.partial, n));
  }
  offPath.push(mv);
  return { state: { ...st, partial: 0, offPath }, result: 'deviation' };
}

/** Cria um movimento nas mesmas camadas de `like` que gira `qt` quartos em torno do eixo positivo. */
function normalizeLike(like: Move, qt: number, n: number): Move {
  const unit = quarter({ ...like, amount: 1 }, n); // ±1
  const q = mod4(qt * unit);
  const amount = q === 1 ? 1 : q === 2 ? 2 : -1;
  return { ...like, amount };
}
