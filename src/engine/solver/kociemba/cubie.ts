/**
 * Representação por cubies do 3×3 usada pelo algoritmo de duas fases de
 * Herbert Kociemba. Convenção "substituído por": cp[i] é o canto que ocupa
 * a posição i; co[i] é sua orientação (0, 1, 2). O mesmo vale para arestas.
 */

// Cantos
export const URF = 0, UFL = 1, ULB = 2, UBR = 3, DFR = 4, DLF = 5, DBL = 6, DRB = 7;
// Arestas
export const UR = 0, UF = 1, UL = 2, UB = 3, DR = 4, DF = 5, DL = 6, DB = 7, FR = 8, FL = 9, BL = 10, BR = 11;

export const N_TWIST = 2187; // 3^7
export const N_FLIP = 2048; // 2^11
export const N_SLICE = 495; // C(12, 4)
export const N_PERM8 = 40320; // 8!
export const N_SLICE_PERM = 24; // 4!
export const N_MOVES = 18;

export class CubieCube {
  cp: Int8Array;
  co: Int8Array;
  ep: Int8Array;
  eo: Int8Array;

  constructor(cp?: ArrayLike<number>, co?: ArrayLike<number>, ep?: ArrayLike<number>, eo?: ArrayLike<number>) {
    this.cp = cp ? Int8Array.from(cp) : Int8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    this.co = co ? Int8Array.from(co) : new Int8Array(8);
    this.ep = ep ? Int8Array.from(ep) : Int8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    this.eo = eo ? Int8Array.from(eo) : new Int8Array(12);
  }

  clone(): CubieCube {
    return new CubieCube(this.cp, this.co, this.ep, this.eo);
  }

  /** this ← this · b (aplica b depois do estado atual), apenas cantos. */
  cornerMultiply(b: CubieCube): void {
    const cp = new Int8Array(8);
    const co = new Int8Array(8);
    for (let i = 0; i < 8; i++) {
      cp[i] = this.cp[b.cp[i]];
      co[i] = (this.co[b.cp[i]] + b.co[i]) % 3;
    }
    this.cp = cp;
    this.co = co;
  }

  /** this ← this · b, apenas arestas. */
  edgeMultiply(b: CubieCube): void {
    const ep = new Int8Array(12);
    const eo = new Int8Array(12);
    for (let i = 0; i < 12; i++) {
      ep[i] = this.ep[b.ep[i]];
      eo[i] = (this.eo[b.ep[i]] + b.eo[i]) % 2;
    }
    this.ep = ep;
    this.eo = eo;
  }

  multiply(b: CubieCube): void {
    this.cornerMultiply(b);
    this.edgeMultiply(b);
  }

  // ---------- Coordenadas da fase 1 ----------

  getTwist(): number {
    let r = 0;
    for (let i = 0; i < 7; i++) r = r * 3 + this.co[i];
    return r;
  }

  setTwist(twist: number): void {
    let sum = 0;
    for (let i = 6; i >= 0; i--) {
      this.co[i] = twist % 3;
      sum += this.co[i];
      twist = Math.floor(twist / 3);
    }
    this.co[7] = (3 - (sum % 3)) % 3;
  }

  getFlip(): number {
    let r = 0;
    for (let i = 0; i < 11; i++) r = r * 2 + this.eo[i];
    return r;
  }

  setFlip(flip: number): void {
    let sum = 0;
    for (let i = 10; i >= 0; i--) {
      this.eo[i] = flip & 1;
      sum += this.eo[i];
      flip >>= 1;
    }
    this.eo[11] = sum % 2;
  }

  /**
   * Posições ocupadas pelas 4 arestas da camada E (FR FL BL BR), ignorando a
   * ordem. Valor 0 quando estão todas na camada E.
   */
  getSlice(): number {
    let rank = 0;
    let k = 0;
    for (let j = 11; j >= 0; j--) {
      if (this.ep[j] >= FR) {
        const c = 11 - j;
        rank += binomial(c, k + 1);
        k++;
      }
    }
    return rank;
  }

  setSlice(rank: number): void {
    const occupied = new Array<boolean>(12).fill(false);
    for (let k = 3; k >= 0; k--) {
      let c = k;
      while (binomial(c + 1, k + 1) <= rank) c++;
      rank -= binomial(c, k + 1);
      occupied[11 - c] = true;
    }
    let slice = FR;
    let other = UR;
    for (let j = 0; j < 12; j++) this.ep[j] = occupied[j] ? slice++ : other++;
  }

  // ---------- Coordenadas da fase 2 ----------

  getCornerPerm(): number {
    return permRank(this.cp, 0, 8, 0);
  }

  setCornerPerm(rank: number): void {
    permUnrank(rank, this.cp, 0, 8, 0);
  }

  /** Permutação das 8 arestas das camadas U e D (válida na fase 2). */
  getEdge8Perm(): number {
    return permRank(this.ep, 0, 8, 0);
  }

  setEdge8Perm(rank: number): void {
    permUnrank(rank, this.ep, 0, 8, 0);
  }

  /** Permutação das 4 arestas da camada E (válida na fase 2). */
  getSlicePerm(): number {
    return permRank(this.ep, 8, 4, FR);
  }

  setSlicePerm(rank: number): void {
    permUnrank(rank, this.ep, 8, 4, FR);
  }

  // ---------- Verificação ----------

  /**
   * Verifica se o estado é fisicamente solúvel. Retorna null quando válido ou
   * uma mensagem descrevendo o problema.
   */
  verify(): string | null {
    const seenE = new Array<number>(12).fill(0);
    for (let i = 0; i < 12; i++) seenE[this.ep[i]]++;
    if (seenE.some((c) => c !== 1)) return 'Nem todas as arestas existem exatamente uma vez.';
    if (this.eo.reduce((a, b) => a + b, 0) % 2 !== 0) return 'Uma aresta está invertida (orientação impossível).';
    const seenC = new Array<number>(8).fill(0);
    for (let i = 0; i < 8; i++) seenC[this.cp[i]]++;
    if (seenC.some((c) => c !== 1)) return 'Nem todos os cantos existem exatamente uma vez.';
    if (this.co.reduce((a, b) => a + b, 0) % 3 !== 0) return 'Um canto está torcido (orientação impossível).';
    if (permParity(this.cp) !== permParity(this.ep)) return 'Paridade impossível: duas peças trocadas.';
    return null;
  }
}

const BINOMIAL: number[][] = (() => {
  const t: number[][] = [];
  for (let n = 0; n <= 12; n++) {
    t.push([]);
    for (let k = 0; k <= 12; k++) {
      if (k === 0) t[n][k] = 1;
      else if (n === 0) t[n][k] = 0;
      else t[n][k] = t[n - 1][k - 1] + t[n - 1][k];
    }
  }
  return t;
})();

export function binomial(n: number, k: number): number {
  if (k < 0 || n < k) return 0;
  return BINOMIAL[n][k];
}

const FACTORIAL = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

/** Ranking de Lehmer de arr[offset..offset+len) cujos valores são base..base+len-1. */
export function permRank(arr: ArrayLike<number>, offset: number, len: number, base: number): number {
  let rank = 0;
  for (let i = 0; i < len; i++) {
    let smaller = 0;
    const v = arr[offset + i] - base;
    for (let j = i + 1; j < len; j++) if (arr[offset + j] - base < v) smaller++;
    rank += smaller * FACTORIAL[len - 1 - i];
  }
  return rank;
}

export function permUnrank(
  rank: number,
  arr: { [i: number]: number },
  offset: number,
  len: number,
  base: number,
): void {
  const available: number[] = [];
  for (let i = 0; i < len; i++) available.push(i);
  for (let i = 0; i < len; i++) {
    const f = FACTORIAL[len - 1 - i];
    const idx = Math.floor(rank / f);
    rank %= f;
    arr[offset + i] = available[idx] + base;
    available.splice(idx, 1);
  }
}

export function permParity(arr: ArrayLike<number>): number {
  let parity = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) if (arr[j] < arr[i]) parity ^= 1;
  }
  return parity;
}

/** Movimentos básicos (quarto de volta horário) das faces U R F D L B. */
export const BASIC_MOVES: readonly CubieCube[] = [
  // U
  new CubieCube(
    [UBR, URF, UFL, ULB, DFR, DLF, DBL, DRB],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [UB, UR, UF, UL, DR, DF, DL, DB, FR, FL, BL, BR],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ),
  // R
  new CubieCube(
    [DFR, UFL, ULB, URF, DRB, DLF, DBL, UBR],
    [2, 0, 0, 1, 1, 0, 0, 2],
    [FR, UF, UL, UB, BR, DF, DL, DB, DR, FL, BL, UR],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ),
  // F
  new CubieCube(
    [UFL, DLF, ULB, UBR, URF, DFR, DBL, DRB],
    [1, 2, 0, 0, 2, 1, 0, 0],
    [UR, FL, UL, UB, DR, FR, DL, DB, UF, DF, BL, BR],
    [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
  ),
  // D
  new CubieCube(
    [URF, UFL, ULB, UBR, DLF, DBL, DRB, DFR],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [UR, UF, UL, UB, DF, DL, DB, DR, FR, FL, BL, BR],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ),
  // L
  new CubieCube(
    [URF, ULB, DBL, UBR, DFR, UFL, DLF, DRB],
    [0, 1, 2, 0, 0, 2, 1, 0],
    [UR, UF, BL, UB, DR, DF, FL, DB, FR, UL, DL, BR],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ),
  // B
  new CubieCube(
    [URF, UFL, UBR, DRB, DFR, DLF, ULB, DBL],
    [0, 0, 1, 2, 0, 0, 2, 1],
    [UR, UF, UL, BR, DR, DF, DL, BL, FR, FL, UB, DB],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
  ),
];

/** MOVE_CUBES[face * 3 + power - 1]: power 1 = 90°, 2 = 180°, 3 = 270°. */
export const MOVE_CUBES: readonly CubieCube[] = (() => {
  const list: CubieCube[] = [];
  for (let face = 0; face < 6; face++) {
    const c = new CubieCube();
    for (let p = 0; p < 3; p++) {
      c.multiply(BASIC_MOVES[face]);
      list.push(c.clone());
    }
  }
  return list;
})();

// ---------- Conversão a partir dos facelets ----------

/** Índices dos facelets (U1=0 … B9=53) de cada canto, no sentido horário. */
export const CORNER_FACELETS: readonly (readonly number[])[] = [
  [8, 9, 20], // URF: U9 R1 F3
  [6, 18, 38], // UFL: U7 F1 L3
  [0, 36, 47], // ULB: U1 L1 B3
  [2, 45, 11], // UBR: U3 B1 R3
  [29, 26, 15], // DFR: D3 F9 R7
  [27, 44, 24], // DLF: D1 L9 F7
  [33, 53, 42], // DBL: D7 B9 L7
  [35, 17, 51], // DRB: D9 R9 B7
];

export const EDGE_FACELETS: readonly (readonly number[])[] = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
];

// Faces: U=0 R=1 F=2 D=3 L=4 B=5
export const CORNER_COLORS: readonly (readonly number[])[] = [
  [0, 1, 2],
  [0, 2, 4],
  [0, 4, 5],
  [0, 5, 1],
  [3, 2, 1],
  [3, 4, 2],
  [3, 5, 4],
  [3, 1, 5],
];

export const EDGE_COLORS: readonly (readonly number[])[] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [0, 5],
  [3, 1],
  [3, 2],
  [3, 4],
  [3, 5],
  [2, 1],
  [2, 4],
  [5, 4],
  [5, 1],
];

/** Converte cantos de 54 facelets (valores 0..5 = U R F D L B) em cp/co. */
export function cornersFromFacelets(f: ArrayLike<number>, cube: CubieCube): string | null {
  for (let i = 0; i < 8; i++) {
    let ori = 0;
    for (; ori < 3; ori++) {
      const c = f[CORNER_FACELETS[i][ori]];
      if (c === 0 || c === 3) break;
    }
    if (ori === 3) return 'Canto sem adesivo U/D — estado inválido.';
    const col1 = f[CORNER_FACELETS[i][(ori + 1) % 3]];
    const col2 = f[CORNER_FACELETS[i][(ori + 2) % 3]];
    let found = false;
    for (let j = 0; j < 8; j++) {
      if (col1 === CORNER_COLORS[j][1] && col2 === CORNER_COLORS[j][2]) {
        cube.cp[i] = j;
        cube.co[i] = ori % 3;
        found = true;
        break;
      }
    }
    if (!found) return 'Combinação de cores de canto inexistente.';
  }
  return null;
}

/** Converte 54 facelets (valores 0..5 = U R F D L B) em um CubieCube. */
export function cubieFromFacelets(f: ArrayLike<number>): { cube: CubieCube; error: string | null } {
  const cube = new CubieCube();
  const cornerError = cornersFromFacelets(f, cube);
  if (cornerError) return { cube, error: cornerError };
  for (let i = 0; i < 12; i++) {
    let found = false;
    for (let j = 0; j < 12; j++) {
      const a = f[EDGE_FACELETS[i][0]];
      const b = f[EDGE_FACELETS[i][1]];
      if (a === EDGE_COLORS[j][0] && b === EDGE_COLORS[j][1]) {
        cube.ep[i] = j;
        cube.eo[i] = 0;
        found = true;
        break;
      }
      if (a === EDGE_COLORS[j][1] && b === EDGE_COLORS[j][0]) {
        cube.ep[i] = j;
        cube.eo[i] = 1;
        found = true;
        break;
      }
    }
    if (!found) return { cube, error: 'Combinação de cores de aresta inexistente.' };
  }
  return { cube, error: cube.verify() };
}
