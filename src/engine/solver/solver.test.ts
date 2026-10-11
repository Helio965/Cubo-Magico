import { describe, expect, it } from 'vitest';
import { applyMoves, createSolved, isSolved } from '../state/cube';
import { createRng } from '../scramble/random';
import { generateScramble } from '../scramble/scramble';
import { formatMoves, parseMoves } from '../moves/notation';
import {
  generateRandomStateScramble,
  prepareSolver,
  solveState,
  solverSupport,
  SolverError,
  toCubieCube,
} from './index';
import { CubieCube } from './kociemba/cubie';
import { solveTwoPhase } from './kociemba/search';

describe('resolvedor 3×3 (Kociemba duas fases)', () => {
  it('gera as tabelas', () => {
    const t0 = performance.now();
    prepareSolver(3);
    console.info(`Tabelas 3×3 geradas em ${(performance.now() - t0).toFixed(0)} ms`);
  });

  it('8. resolve 60 embaralhamentos aleatórios com soluções verificadas', () => {
    let total = 0;
    for (let i = 0; i < 60; i++) {
      const sc = generateScramble({ size: 3, seed: `solve-${i}` });
      const state = applyMoves(createSolved(3), sc.moves);
      const result = solveState(state, { timeLimitMs: 300 });
      expect(isSolved(applyMoves(state, result.moves))).toBe(true);
      expect(result.length).toBeLessThanOrEqual(24);
      total += result.length;
    }
    console.info(`Média de movimentos (3×3): ${(total / 60).toFixed(1)}`);
  });

  it('resolve estados sem histórico, inclusive após rotações e fatias', () => {
    const state = applyMoves(createSolved(3), "x M2 R U' S E2 y F2 z' B L' D2");
    const result = solveState(state);
    expect(isSolved(applyMoves(state, result.moves))).toBe(true);
  });

  it('resolve o "superflip" (estado de distância 20)', () => {
    const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
    const state = applyMoves(createSolved(3), superflip);
    const result = solveState(state, { timeLimitMs: 3000 });
    expect(isSolved(applyMoves(state, result.moves))).toBe(true);
    expect(result.length).toBeLessThanOrEqual(24);
  });

  it('retorna solução vazia para o cubo resolvido', () => {
    expect(solveState(createSolved(3)).length).toBe(0);
  });

  it('rejeita estados fisicamente impossíveis', () => {
    const twisted = new CubieCube();
    twisted.co[0] = 1;
    expect(twisted.verify()).not.toBeNull();
    expect(() => solveTwoPhase(twisted)).toThrow();
    const flipped = new CubieCube();
    flipped.eo[0] = 1;
    expect(flipped.verify()).not.toBeNull();
    const swapped = new CubieCube();
    swapped.ep[0] = 1;
    swapped.ep[1] = 0;
    expect(swapped.verify()).not.toBeNull();
  });

  it('o estado convertido corresponde ao inverso da solução', () => {
    const state = applyMoves(createSolved(3), "R U R' U'");
    expect(toCubieCube(state).verify()).toBeNull();
    const result = solveState(state);
    const inverse = parseMoves(formatMoves(result.moves));
    expect(isSolved(applyMoves(state, inverse))).toBe(true);
  });
});

describe('resolvedor 2×2 (ótimo)', () => {
  it('gera a tabela completa', () => {
    const t0 = performance.now();
    prepareSolver(2);
    console.info(`Tabela 2×2 gerada em ${(performance.now() - t0).toFixed(0)} ms`);
  });

  it('resolve 200 estados com no máximo 11 movimentos (número de Deus do 2×2)', () => {
    const rng = createRng('two');
    const faces = ['R', 'L', 'U', 'D', 'F', 'B', 'x', 'y', 'z'];
    for (let i = 0; i < 200; i++) {
      const seq = Array.from({ length: 25 }, () => faces[Math.floor(rng() * faces.length)] + ['', "'", '2'][Math.floor(rng() * 3)]).join(' ');
      const state = applyMoves(createSolved(2), seq);
      const result = solveState(state);
      expect(result.length).toBeLessThanOrEqual(11);
      expect(isSolved(applyMoves(state, result.moves))).toBe(true);
    }
  });

  it('encontra a solução ótima para um estado conhecido', () => {
    const state = applyMoves(createSolved(2), "R U R' U'");
    expect(solveState(state).length).toBe(4);
  });
});

describe('embaralhamento por estado aleatório', () => {
  it('3×3: estado válido, reproduzível pela semente e resolvido pelo resolvedor', () => {
    const a = generateRandomStateScramble(3, 'wca');
    const b = generateRandomStateScramble(3, 'wca');
    expect(a.text).toBe(b.text);
    const state = applyMoves(createSolved(3), a.moves);
    expect(isSolved(state)).toBe(false);
    const result = solveState(state);
    expect(isSolved(applyMoves(state, result.moves))).toBe(true);
  });

  it('2×2: estado com pelo menos 4 movimentos de distância', () => {
    for (let i = 0; i < 10; i++) {
      const sc = generateRandomStateScramble(2, `two-${i}`);
      const state = applyMoves(createSolved(2), sc.moves);
      expect(solveState(state).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('disponibilidade', () => {
  it('declara claramente tamanhos sem resolvedor', () => {
    expect(solverSupport(3).available).toBe(true);
    expect(solverSupport(2).available).toBe(true);
    expect(solverSupport(4).available).toBe(false);
    expect(solverSupport(4).reason).toMatch(/ainda não está disponível/);
    expect(() => solveState(createSolved(4))).toThrow(SolverError);
  });
});
