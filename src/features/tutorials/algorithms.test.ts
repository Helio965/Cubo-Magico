import { describe, expect, it } from 'vitest';
import { applyMoves, createSolved, getFacelets, isSolved } from '../../engine/state/cube';
import { invertMoves, parseMoves } from '../../engine/moves/notation';
import { ALGORITHMS } from './algorithms';

/** Verifica se as linhas inferiores das faces laterais e a face D estão resolvidas. */
function bottomSolved(n: number, alg: string, rowsFromBottom: number): boolean {
  const f = getFacelets(applyMoves(createSolved(n), alg));
  const nn = n * n;
  for (let k = 0; k < nn; k++) if (f[3 * nn + k] !== 3) return false;
  for (const face of [1, 2, 4, 5]) {
    for (let row = n - rowsFromBottom; row < n; row++) {
      for (let col = 0; col < n; col++) if (f[face * nn + row * n + col] !== face) return false;
    }
  }
  return true;
}

function topColorKept(n: number, alg: string): boolean {
  const f = getFacelets(applyMoves(createSolved(n), alg));
  for (let k = 0; k < n * n; k++) if (f[k] !== 0) return false;
  return true;
}

describe('biblioteca de algoritmos', () => {
  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s é válido e reversível', (_name, a) => {
    const moves = parseMoves(a.alg);
    const start = createSolved(a.size);
    const after = applyMoves(start, moves);
    expect(isSolved(after)).toBe(false);
    expect(isSolved(applyMoves(after, invertMoves(moves)))).toBe(true);
  });

  it.each(ALGORITHMS.filter((a) => a.group === 'PLL').map((a) => [a.name, a.alg] as const))(
    '%s é uma PLL: preserva as duas primeiras camadas e a face superior',
    (_name, alg) => {
      expect(bottomSolved(3, alg, 2)).toBe(true);
      expect(topColorKept(3, alg)).toBe(true);
    },
  );

  it.each(ALGORITHMS.filter((a) => a.group === 'OLL').map((a) => [a.name, a.alg] as const))(
    '%s é uma OLL: preserva as duas primeiras camadas',
    (_name, alg) => {
      expect(bottomSolved(3, alg, 2)).toBe(true);
    },
  );

  it('algoritmos de segunda camada preservam a primeira camada', () => {
    for (const id of ['edge-right', 'edge-left', 'yellow-cross', 'corner-perm']) {
      const a = ALGORITHMS.find((x) => x.id === id)!;
      expect(bottomSolved(3, a.alg, 1)).toBe(true);
    }
  });

  it('paridades do 4×4 preservam as três camadas inferiores', () => {
    for (const id of ['pll-parity', 'oll-parity']) {
      const a = ALGORITHMS.find((x) => x.id === id)!;
      expect(bottomSolved(4, a.alg, 3)).toBe(true);
    }
    const pll = ALGORITHMS.find((x) => x.id === 'pll-parity')!;
    expect(topColorKept(4, pll.alg)).toBe(true);
    const oll = ALGORITHMS.find((x) => x.id === 'oll-parity')!;
    expect(topColorKept(4, oll.alg)).toBe(false);
  });

  it('algoritmos de 2×2 preservam a camada inferior', () => {
    for (const a of ALGORITHMS.filter((x) => x.group === '2×2')) expect(bottomSolved(2, a.alg, 1)).toBe(true);
  });
});
