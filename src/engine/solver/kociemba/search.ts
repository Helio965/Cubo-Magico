import { CubieCube, MOVE_CUBES, N_MOVES, N_PERM8 } from './cubie';
import { getTables, PHASE2_MOVES, type KociembaTables } from './tables';

export interface TwoPhaseOptions {
  /** Interrompe a busca ao encontrar uma solução com até este número de movimentos. */
  targetLength?: number;
  /** Tempo máximo (ms) dedicado a melhorar a solução após encontrar a primeira. */
  timeLimitMs?: number;
  /** Limite absoluto de segurança (ms). */
  hardLimitMs?: number;
}

export interface TwoPhaseResult {
  /** Movimentos codificados como face * 3 + (potência - 1). */
  moves: number[];
  phase1Length: number;
  elapsedMs: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Faces: U=0 R=1 F=2 D=3 L=4 B=5. Opostas diferem por 3. */
function forbiddenAfter(lastFace: number, face: number): boolean {
  if (lastFace < 0) return false;
  if (face === lastFace) return true;
  // Para faces opostas (que comutam), aceita apenas uma ordem.
  return face + 3 === lastFace;
}

const IS_PHASE2_MOVE: boolean[] = (() => {
  const arr = new Array<boolean>(N_MOVES).fill(false);
  for (const m of PHASE2_MOVES) arr[m] = true;
  return arr;
})();

class Search {
  private readonly t: KociembaTables;
  private readonly start: CubieCube;
  private readonly path1: number[] = [];
  private readonly path2: number[] = [];
  private best: number[] | null = null;
  private bestPhase1 = 0;
  private maxTotal: number;
  private readonly startTime = now();
  private nodes = 0;
  private aborted = false;

  constructor(
    cube: CubieCube,
    private readonly target: number,
    private readonly timeLimit: number,
    private readonly hardLimit: number,
  ) {
    this.t = getTables();
    this.start = cube;
    this.maxTotal = 31;
  }

  private timeUp(): boolean {
    if ((++this.nodes & 0x3ff) !== 0) return false;
    const elapsed = now() - this.startTime;
    if (elapsed > this.hardLimit) return true;
    return this.best !== null && elapsed > this.timeLimit;
  }

  run(): TwoPhaseResult | null {
    const twist = this.start.getTwist();
    const flip = this.start.getFlip();
    const slice = this.start.getSlice();
    for (let depth1 = 0; depth1 < this.maxTotal && !this.aborted; depth1++) {
      this.phase1(twist, flip, slice, depth1, -1);
      if (this.best && this.best.length <= this.target) break;
    }
    if (!this.best) return null;
    return { moves: this.best, phase1Length: this.bestPhase1, elapsedMs: now() - this.startTime };
  }

  private h1(twist: number, flip: number, slice: number): number {
    const a = this.t.sliceTwistPrune[slice * 2187 + twist];
    const b = this.t.sliceFlipPrune[slice * 2048 + flip];
    return a > b ? a : b;
  }

  private phase1(twist: number, flip: number, slice: number, togo: number, lastFace: number): void {
    if (this.aborted) return;
    if (this.timeUp()) {
      this.aborted = true;
      return;
    }
    if (togo === 0) {
      if (twist === 0 && flip === 0 && slice === 0) {
        const last = this.path1.length ? this.path1[this.path1.length - 1] : -1;
        // Se o último movimento pertence à fase 2, uma fase 1 menor já foi testada.
        if (last < 0 || !IS_PHASE2_MOVE[last]) this.startPhase2();
      }
      return;
    }
    if (this.h1(twist, flip, slice) > togo) return;
    const t = this.t;
    for (let face = 0; face < 6; face++) {
      if (forbiddenAfter(lastFace, face)) continue;
      for (let p = 0; p < 3; p++) {
        const m = face * 3 + p;
        const nt = t.twistMove[twist * N_MOVES + m];
        const nf = t.flipMove[flip * N_MOVES + m];
        const ns = t.sliceMove[slice * N_MOVES + m];
        if (this.h1(nt, nf, ns) >= togo) continue;
        this.path1.push(m);
        this.phase1(nt, nf, ns, togo - 1, face);
        this.path1.pop();
        if (this.aborted) return;
        if (this.best && this.best.length <= this.target) return;
      }
    }
  }

  private startPhase2(): void {
    const c = this.start.clone();
    for (const m of this.path1) c.multiply(MOVE_CUBES[m]);
    const cp = c.getCornerPerm();
    const ep = c.getEdge8Perm();
    const sp = c.getSlicePerm();
    const depth1 = this.path1.length;
    const maxDepth2 = Math.min(this.maxTotal - 1 - depth1, 18);
    if (maxDepth2 < 0) return;
    const lastFace = depth1 ? Math.floor(this.path1[depth1 - 1] / 3) : -1;
    const h = this.h2(cp, ep, sp);
    for (let depth2 = h; depth2 <= maxDepth2; depth2++) {
      if (this.phase2(cp, ep, sp, depth2, lastFace)) {
        const solution = [...this.path1, ...this.path2];
        this.best = solution;
        this.bestPhase1 = depth1;
        this.maxTotal = solution.length;
        this.path2.length = 0;
        return;
      }
      if (this.aborted) return;
    }
  }

  private h2(cp: number, ep: number, sp: number): number {
    const a = this.t.sliceCornerPrune[sp * N_PERM8 + cp];
    const b = this.t.sliceEdgePrune[sp * N_PERM8 + ep];
    return a > b ? a : b;
  }

  private phase2(cp: number, ep: number, sp: number, togo: number, lastFace: number): boolean {
    if (togo === 0) return cp === 0 && ep === 0 && sp === 0;
    if (this.timeUp()) {
      this.aborted = true;
      return false;
    }
    if (this.h2(cp, ep, sp) > togo) return false;
    const t = this.t;
    for (const m of PHASE2_MOVES) {
      const face = Math.floor(m / 3);
      if (forbiddenAfter(lastFace, face)) continue;
      const ncp = t.cornerPermMove[cp * N_MOVES + m];
      const nep = t.edge8PermMove[ep * N_MOVES + m];
      const nsp = t.slicePermMove[sp * N_MOVES + m];
      if (this.h2(ncp, nep, nsp) >= togo) continue;
      this.path2.push(m);
      if (this.phase2(ncp, nep, nsp, togo - 1, face)) return true;
      this.path2.pop();
      if (this.aborted) return false;
    }
    return false;
  }
}

/**
 * Resolve um CubieCube válido com o algoritmo de duas fases de Kociemba.
 * Retorna a melhor solução encontrada dentro do tempo configurado.
 */
export function solveTwoPhase(cube: CubieCube, options: TwoPhaseOptions = {}): TwoPhaseResult {
  const error = cube.verify();
  if (error) throw new Error(error);
  const search = new Search(cube, options.targetLength ?? 20, options.timeLimitMs ?? 800, options.hardLimitMs ?? 20000);
  const result = search.run();
  if (!result) throw new Error('Não foi possível encontrar uma solução no tempo disponível.');
  return result;
}
