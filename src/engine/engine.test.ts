import { describe, expect, it } from 'vitest';
import { ROTATIONS, COMPOSE, QUARTER } from './math/rotations';
import {
  formatMove,
  formatMoves,
  invertMoves,
  NotationError,
  parseMoves,
  toPrimitive,
  validateMove,
  type Move,
} from './moves/notation';
import {
  applyMove,
  applyMoves,
  createSolved,
  deserializeState,
  getFacelets,
  isSolved,
  serializeState,
  statesEqual,
} from './state/cube';
import { getLayout } from './state/layout';
import { generateScramble, scrambleMoveSet } from './scramble/scramble';
import { createRng } from './scramble/random';
import { validateState } from './validation/validate';
import { CubieCube, MOVE_CUBES } from './solver/kociemba/cubie';
import { toCubieCube } from './solver';

const SIZES = [2, 3, 4, 5, 6, 7];

function allMovesFor(n: number): Move[] {
  const list: Move[] = [];
  const bases = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
  for (const base of bases) {
    for (let depth = 1; depth <= n - 1; depth++) {
      list.push({ base, depth, width: 1, amount: 1 });
      if (depth >= 2) list.push({ base, depth, width: depth, amount: 1 });
    }
  }
  if (n % 2 === 1) for (const base of ['M', 'E', 'S'] as const) list.push({ base, depth: 1, width: 1, amount: 1 });
  for (const base of ['x', 'y', 'z'] as const) list.push({ base, depth: 1, width: 1, amount: 1 });
  return list;
}

function randomMoves(n: number, count: number, seed: string): Move[] {
  const rng = createRng(seed);
  const pool = allMovesFor(n);
  const amounts = [1, -1, 2, -2] as const;
  return Array.from({ length: count }, () => ({
    ...pool[Math.floor(rng() * pool.length)],
    amount: amounts[Math.floor(rng() * 4)],
  }));
}

describe('grupo de rotações', () => {
  it('possui exatamente 24 rotações próprias (determinante 1)', () => {
    expect(ROTATIONS).toHaveLength(24);
    for (const m of ROTATIONS) {
      const det =
        m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
      expect(det).toBe(1);
    }
  });

  it('quatro quartos de volta em torno de qualquer eixo resultam na identidade', () => {
    for (let axis = 0; axis < 3; axis++) {
      let r = 0;
      for (let i = 0; i < 4; i++) r = COMPOSE[QUARTER[axis * 4 + 1] * 24 + r];
      expect(r).toBe(0);
    }
  });
});

describe('notação', () => {
  it('interpreta e formata movimentos padrão', () => {
    const text = "R U R' U' R2 F2' Rw 3Rw' 2R r' M2 E S' x y' z2";
    const moves = parseMoves(text);
    expect(formatMoves(moves)).toBe("R U R' U' R2 F2' Rw 3Rw' 2R Rw' M2 E S' x y' z2");
  });

  it('aceita sequências sem espaços e parênteses', () => {
    expect(formatMoves(parseMoves("(R U R' U') [F2]"))).toBe("R U R' U' F2");
    expect(formatMoves(parseMoves("RUR'U'"))).toBe("R U R' U'");
  });

  it('rejeita movimentos inválidos', () => {
    expect(() => parseMoves('R Q')).toThrow(NotationError);
    expect(() => parseMoves('3x')).toThrow(NotationError);
    expect(() => parseMoves('2r')).toThrow(NotationError);
  });

  it('inverte sequências corretamente', () => {
    expect(formatMoves(invertMoves(parseMoves("R U2 F' Rw")))).toBe("Rw' F U2' R'");
  });

  it('valida movimentos conforme o tamanho do cubo', () => {
    expect(validateMove(parseMoves('M')[0], 4)).not.toBeNull();
    expect(validateMove(parseMoves('M')[0], 3)).toBeNull();
    expect(validateMove(parseMoves('2R')[0], 2)).not.toBeNull();
    expect(validateMove(parseMoves('2R')[0], 4)).toBeNull();
    expect(validateMove(parseMoves('3Rw')[0], 4)).toBeNull();
    expect(validateMove(parseMoves('4Rw')[0], 4)).not.toBeNull();
  });

  it('converte para primitivas com eixos e camadas corretos', () => {
    expect(toPrimitive(parseMoves('R')[0], 3)).toEqual({ axis: 0, layers: [2], qt: -1 });
    expect(toPrimitive(parseMoves('L')[0], 3)).toEqual({ axis: 0, layers: [0], qt: 1 });
    expect(toPrimitive(parseMoves('M')[0], 3)).toEqual({ axis: 0, layers: [1], qt: 1 });
    expect(toPrimitive(parseMoves('Rw')[0], 4)).toEqual({ axis: 0, layers: [2, 3], qt: -1 });
    expect(toPrimitive(parseMoves('2R')[0], 4)).toEqual({ axis: 0, layers: [2], qt: -1 });
    expect(toPrimitive(parseMoves('2L')[0], 4)).toEqual({ axis: 0, layers: [1], qt: 1 });
    expect(toPrimitive(parseMoves('x')[0], 4).layers).toEqual([0, 1, 2, 3]);
  });

  it('formata movimentos internos', () => {
    expect(formatMove({ base: 'R', depth: 2, width: 1, amount: -1 })).toBe("2R'");
    expect(formatMove({ base: 'U', depth: 3, width: 2, amount: 2 })).toBe('2-3Uw2');
  });
});

describe('estrutura dos cubos', () => {
  it.each(SIZES)('cubo %i×%i possui N³ − (N−2)³ peças visíveis e 6N² adesivos', (n) => {
    const layout = getLayout(n);
    expect(layout.count).toBe(n ** 3 - Math.max(0, n - 2) ** 3);
    const stickers = layout.stickers.reduce((acc, s) => acc + s.length, 0);
    expect(stickers).toBe(6 * n * n);
  });

  it.each(SIZES)('estado inicial %i×%i está resolvido e é válido', (n) => {
    const s = createSolved(n);
    expect(isSolved(s)).toBe(true);
    expect(validateState(s).valid).toBe(true);
    const f = getFacelets(s);
    for (let face = 0; face < 6; face++) {
      for (let k = 0; k < n * n; k++) expect(f[face * n * n + k]).toBe(face);
    }
  });
});

describe('propriedades matemáticas (seção 20)', () => {
  it.each(SIZES)('1. quatro giros de 90° de qualquer camada devolvem o estado original (%i×%i)', (n) => {
    const solved = createSolved(n);
    for (const m of allMovesFor(n)) {
      let s = applyMoves(solved, randomMoves(n, 6, `pre-${n}`));
      const before = s;
      for (let i = 0; i < 4; i++) s = applyMove(s, m);
      expect(statesEqual(s, before)).toBe(true);
    }
  });

  it.each(SIZES)('2. um movimento seguido do inverso devolve o estado original (%i×%i)', (n) => {
    const start = applyMoves(createSolved(n), randomMoves(n, 10, `inv-${n}`));
    for (const m of allMovesFor(n)) {
      for (const amount of [1, -1, 2, -2] as const) {
        const mv = { ...m, amount };
        const s = applyMoves(start, [mv, ...invertMoves([mv])]);
        expect(statesEqual(s, start)).toBe(true);
      }
    }
  });

  it.each(SIZES)('3. sequência seguida da inversa recupera o estado anterior (%i×%i)', (n) => {
    const start = applyMoves(createSolved(n), randomMoves(n, 15, `seqpre-${n}`));
    const seq = randomMoves(n, 80, `seq-${n}`);
    const s = applyMoves(applyMoves(start, seq), invertMoves(seq));
    expect(statesEqual(s, start)).toBe(true);
  });

  it.each(SIZES)('4. embaralhamentos produzem estados estruturalmente válidos (%i×%i)', (n) => {
    for (let i = 0; i < 20; i++) {
      const sc = generateScramble({ size: n, seed: `valid-${n}-${i}` });
      const s = applyMoves(createSolved(n), sc.moves);
      expect(validateState(s).valid).toBe(true);
      expect(isSolved(s)).toBe(false);
    }
  });

  it('4b. embaralhamentos de 3×3 são fisicamente solúveis (paridade, torção e orientação)', () => {
    for (let i = 0; i < 50; i++) {
      const sc = generateScramble({ size: 3, seed: `phys-${i}` });
      const cube = toCubieCube(applyMoves(createSolved(3), sc.moves));
      expect(cube.verify()).toBeNull();
    }
  });

  it.each(SIZES)('5. a conclusão é detectada em qualquer orientação global (%i×%i)', (n) => {
    const rotations = ['x', 'y', 'z', "x'", 'y2', 'z x', "y x2 z'", 'x y z'];
    for (const r of rotations) {
      const s = applyMoves(createSolved(n), r);
      expect(isSolved(s)).toBe(true);
    }
    // Estado resolvido alcançado por movimentos não triviais
    const scrambled = applyMoves(createSolved(n), randomMoves(n, 30, `orient-${n}`));
    expect(isSolved(scrambled)).toBe(false);
    if (n === 3) {
      // Girar as três camadas paralelas equivale a uma rotação x: continua resolvido.
      expect(isSolved(applyMoves(createSolved(n), "R M' L'"))).toBe(true);
    }
  });

  it.each(SIZES)('6. as peças permanecem alinhadas após centenas de movimentos (%i×%i)', (n) => {
    const s = applyMoves(createSolved(n), randomMoves(n, 600, `align-${n}`));
    expect(validateState(s).valid).toBe(true);
    for (const c of s.pos) {
      expect(Number.isInteger(c)).toBe(true);
      expect(Math.abs(c)).toBeLessThanOrEqual(n - 1);
      expect((c + n - 1) % 2).toBe(0);
    }
  });

  it('9. cubos de tamanhos diferentes seguem regras próprias', () => {
    // No 4×4, R e 2R movem camadas diferentes e Rw = R + 2R.
    const s4 = createSolved(4);
    const a = applyMoves(s4, 'Rw');
    const b = applyMoves(s4, '2R R');
    expect(statesEqual(a, b)).toBe(true);
    expect(statesEqual(applyMoves(s4, 'R'), applyMoves(s4, '2R'))).toBe(false);
    // No 4×4 não existe fatia central.
    expect(() => applyMoves(s4, 'M')).toThrow();
    // No 3×3, Rw = R M'.
    expect(statesEqual(applyMoves(createSolved(3), 'Rw'), applyMoves(createSolved(3), "R M'"))).toBe(true);
    // No 2×2, apenas camadas externas.
    expect(() => applyMoves(createSolved(2), '2R')).toThrow();
    // Um giro de face no 4×4 não altera o centro interno da face oposta.
    const f = getFacelets(applyMoves(s4, 'R'));
    expect(f[4 * 16 + 5]).toBe(4);
  });

  it('serialização preserva o estado', () => {
    const s = applyMoves(createSolved(4), randomMoves(4, 40, 'ser'));
    expect(statesEqual(deserializeState(serializeState(s)), s)).toBe(true);
  });
});

describe('consistência com o modelo de cubies de Kociemba', () => {
  it('cada movimento de face do motor coincide com as tabelas de Kociemba', () => {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (let face = 0; face < 6; face++) {
      for (let p = 0; p < 3; p++) {
        const suffix = p === 0 ? '' : p === 1 ? '2' : "'";
        const engine = toCubieCube(applyMoves(createSolved(3), faces[face] + suffix));
        const reference = new CubieCube();
        reference.multiply(MOVE_CUBES[face * 3 + p]);
        expect(Array.from(engine.cp)).toEqual(Array.from(reference.cp));
        expect(Array.from(engine.co)).toEqual(Array.from(reference.co));
        expect(Array.from(engine.ep)).toEqual(Array.from(reference.ep));
        expect(Array.from(engine.eo)).toEqual(Array.from(reference.eo));
      }
    }
  });

  it('sequências longas coincidem com a multiplicação de cubies', () => {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
    const rng = createRng('kociemba-seq');
    const codes = Array.from({ length: 60 }, () => Math.floor(rng() * 18));
    const text = codes
      .map((c) => faces[Math.floor(c / 3)] + ['', '2', "'"][c % 3])
      .join(' ');
    const engine = toCubieCube(applyMoves(createSolved(3), text));
    const reference = new CubieCube();
    for (const c of codes) reference.multiply(MOVE_CUBES[c]);
    expect(Array.from(engine.cp)).toEqual(Array.from(reference.cp));
    expect(Array.from(engine.co)).toEqual(Array.from(reference.co));
    expect(Array.from(engine.ep)).toEqual(Array.from(reference.ep));
    expect(Array.from(engine.eo)).toEqual(Array.from(reference.eo));
  });
});

describe('embaralhamento', () => {
  it('a mesma semente reproduz o mesmo embaralhamento', () => {
    const a = generateScramble({ size: 3, seed: 'abc' });
    const b = generateScramble({ size: 3, seed: 'abc' });
    const c = generateScramble({ size: 3, seed: 'abd' });
    expect(a.text).toBe(b.text);
    expect(a.text).not.toBe(c.text);
  });

  it('sem semente, as sequências variam', () => {
    const texts = new Set(Array.from({ length: 10 }, () => generateScramble({ size: 3 }).text));
    expect(texts.size).toBe(10);
  });

  it.each([2, 3, 4, 5])('respeita o comprimento configurado e evita redundâncias (%i×%i)', (n) => {
    for (let i = 0; i < 30; i++) {
      const sc = generateScramble({ size: n, length: 30, seed: `red-${n}-${i}` });
      expect(sc.moves).toHaveLength(30);
      for (let k = 1; k < sc.moves.length; k++) {
        const a = toPrimitive(sc.moves[k - 1], n);
        const b = toPrimitive(sc.moves[k], n);
        // Nunca a mesma camada duas vezes seguidas
        expect(a.axis === b.axis && a.layers.join() === b.layers.join()).toBe(false);
      }
    }
  });

  it('usa apenas movimentos válidos para cada tamanho', () => {
    for (const n of SIZES) {
      for (const m of scrambleMoveSet(n)) expect(validateMove(m, n)).toBeNull();
    }
    expect(scrambleMoveSet(2).map(formatMove)).toEqual(['R', 'U', 'F']);
    expect(scrambleMoveSet(4).map(formatMove)).toContain('Rw');
  });
});
