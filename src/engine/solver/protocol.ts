import type { SolveOptions } from './index';

export type SolverRequest =
  | { id: number; type: 'prepare'; size: number }
  | { id: number; type: 'solve'; state: string; options?: SolveOptions }
  | { id: number; type: 'randomState'; size: number; seed?: string };

export type SolverResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };
