/// <reference lib="webworker" />
import { deserializeState } from '../state/cube';
import { generateRandomStateScramble, prepareSolver, solveState } from './index';
import type { SolverRequest, SolverResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  const req = event.data;
  const reply = (msg: SolverResponse) => self.postMessage(msg);
  try {
    switch (req.type) {
      case 'prepare':
        prepareSolver(req.size);
        reply({ id: req.id, ok: true, result: null });
        break;
      case 'solve':
        reply({ id: req.id, ok: true, result: solveState(deserializeState(req.state), req.options) });
        break;
      case 'randomState':
        reply({ id: req.id, ok: true, result: generateRandomStateScramble(req.size, req.seed) });
        break;
    }
  } catch (error) {
    reply({ id: req.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
