import type { Scramble } from '../scramble/scramble';
import { serializeState, type CubeState } from '../state/cube';
import type { SolveOptions, SolveResult } from './index';
import type { SolverRequest, SolverResponse } from './protocol';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

/**
 * Cliente do resolvedor. Executa os cálculos pesados em um Web Worker para
 * não travar a interface; se Workers não estiverem disponíveis, recorre ao
 * processamento na thread principal.
 */
class SolverClient {
  private worker: Worker | null = null;
  private failed = false;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private readonly ready = new Set<number>();

  private getWorker(): Worker | null {
    if (this.failed || typeof Worker === 'undefined') return null;
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<SolverResponse>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.ok) p.resolve(e.data.result);
        else p.reject(new Error(e.data.error));
      };
      this.worker.onerror = (e) => {
        e.preventDefault?.();
        this.failed = true;
        this.worker?.terminate();
        this.worker = null;
        const error = new Error('O processo do resolvedor falhou. Tentando novamente na thread principal.');
        for (const p of this.pending.values()) p.reject(error);
        this.pending.clear();
      };
      return this.worker;
    } catch {
      this.failed = true;
      return null;
    }
  }

  private async request<T>(req: DistributiveOmit<SolverRequest, 'id'>): Promise<T> {
    const worker = this.getWorker();
    if (!worker) return this.runInline<T>(req);
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ ...req, id } as SolverRequest);
    }).catch(async (error: Error) => {
      if (this.failed) return this.runInline<T>(req);
      throw error;
    });
  }

  private async runInline<T>(req: DistributiveOmit<SolverRequest, 'id'>): Promise<T> {
    // Cede a vez ao navegador antes do cálculo pesado.
    await new Promise((r) => setTimeout(r, 16));
    const solver = await import('./index');
    const { deserializeState } = await import('../state/cube');
    switch (req.type) {
      case 'prepare':
        solver.prepareSolver(req.size);
        return null as T;
      case 'solve':
        return solver.solveState(deserializeState(req.state), req.options) as T;
      case 'randomState':
        return solver.generateRandomStateScramble(req.size, req.seed) as T;
    }
  }

  isReady(size: number): boolean {
    return this.ready.has(size);
  }

  async prepare(size: number): Promise<void> {
    if (size !== 2 && size !== 3) return;
    if (this.ready.has(size)) return;
    await this.request<null>({ type: 'prepare', size });
    this.ready.add(size);
  }

  async solve(state: CubeState, options?: SolveOptions): Promise<SolveResult> {
    const result = await this.request<SolveResult>({ type: 'solve', state: serializeState(state), options });
    this.ready.add(state.n);
    return result;
  }

  async randomStateScramble(size: number, seed?: string): Promise<Scramble> {
    const result = await this.request<Scramble>({ type: 'randomState', size, seed });
    this.ready.add(size);
    return result;
  }
}

export const solverClient = new SolverClient();
