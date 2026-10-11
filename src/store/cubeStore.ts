import { create } from 'zustand';
import type { Move } from '../engine/moves/notation';
import type { Scramble } from '../engine/scramble/scramble';
import { createSolved, type CubeState } from '../engine/state/cube';
import type { GameMode } from '../types/game';

export type LockReason = null | 'scramble' | 'playback' | 'solving';

/**
 * Sessão do cubo: estado lógico atual, histórico (desfazer/refazer) e
 * embaralhamento. A lógica de orquestração fica em `controller.ts`.
 */
export interface CubeStore {
  size: number;
  state: CubeState;
  solved: boolean;
  history: Move[];
  redoStack: Move[];
  scramble: Scramble | null;
  lastScramble: Scramble | null;
  mode: GameMode;
  lock: LockReason;
  animating: boolean;
  /** Incrementa sempre que o estado é substituído sem animação. */
  revision: number;
  /** Incrementa a cada movimento aplicado. */
  moveSerial: number;
}

export const useCube = create<CubeStore>(() => ({
  size: 3,
  state: createSolved(3),
  solved: true,
  history: [],
  redoStack: [],
  scramble: null,
  lastScramble: null,
  mode: 'free',
  lock: null,
  animating: false,
  revision: 0,
  moveSerial: 0,
}));
