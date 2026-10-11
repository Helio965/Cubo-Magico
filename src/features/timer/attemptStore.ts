import { create } from 'zustand';
import type { Scramble } from '../../engine/scramble/scramble';
import type { GameMode, Penalty, SolveRecord } from '../../types/game';
import { uid } from '../../utils/format';
import { inspectionPenalty } from './inspection';

/**
 * Ciclo de uma tentativa:
 * idle → ready (embaralhado) → [inspection] → running ⇄ paused → finished
 */
export type AttemptPhase = 'idle' | 'ready' | 'inspection' | 'running' | 'paused' | 'finished';

export interface AttemptState {
  phase: AttemptPhase;
  mode: GameMode;
  size: number;
  scramble: Scramble | null;
  /** Instante (performance.now) em que o trecho atual de execução começou. */
  startedAt: number | null;
  /** Tempo acumulado antes do trecho atual (para pausas no modo treino/livre). */
  elapsedBefore: number;
  inspectionStartedAt: number | null;
  inspectionMs: number;
  penalty: Penalty;
  moves: number;
  assisted: boolean;
  level?: number;
  reference?: number | null;
  lastResult: SolveRecord | null;
  finalElapsed: number;

  prepare: (params: { mode: GameMode; size: number; scramble: Scramble | null; level?: number }) => void;
  startInspection: (now: number) => void;
  start: (now: number) => void;
  pause: (now: number) => void;
  resume: (now: number) => void;
  /** Encerra com sucesso e devolve o registro. */
  finish: (now: number) => SolveRecord;
  /** Abandona uma tentativa iniciada: gera um registro DNF. */
  abandon: (now: number) => SolveRecord | null;
  reset: () => void;
  countMove: (delta?: number) => void;
  setMoves: (moves: number) => void;
  markAssisted: () => void;
  setReference: (length: number | null) => void;
}

export function elapsedOf(s: Pick<AttemptState, 'phase' | 'startedAt' | 'elapsedBefore' | 'finalElapsed'>, now: number) {
  if (s.phase === 'finished') return s.finalElapsed;
  if (s.phase === 'running' && s.startedAt !== null) return s.elapsedBefore + (now - s.startedAt);
  return s.elapsedBefore;
}

const initial = {
  phase: 'idle' as AttemptPhase,
  startedAt: null,
  elapsedBefore: 0,
  inspectionStartedAt: null,
  inspectionMs: 0,
  penalty: 'none' as Penalty,
  moves: 0,
  assisted: false,
  level: undefined,
  reference: undefined,
  finalElapsed: 0,
};

export const useAttempt = create<AttemptState>((set, get) => {
  const buildRecord = (timeMs: number, penalty: Penalty): SolveRecord => {
    const s = get();
    return {
      id: uid(),
      date: Date.now(),
      size: s.size,
      mode: s.mode,
      timeMs: Math.max(0, Math.round(timeMs)),
      penalty,
      moves: s.moves,
      scramble: s.scramble?.text ?? '',
      seed: s.scramble?.seed,
      assisted: s.assisted || s.mode === 'guided',
      inspectionMs: s.inspectionMs || undefined,
      level: s.level,
      reference: s.reference,
    };
  };

  return {
    ...initial,
    mode: 'free',
    size: 3,
    scramble: null,
    lastResult: null,

    prepare: ({ mode, size, scramble, level }) =>
      set({ ...initial, mode, size, scramble, level, phase: scramble ? 'ready' : 'idle' }),

    startInspection: (now) => {
      if (get().phase !== 'ready') return;
      set({ phase: 'inspection', inspectionStartedAt: now });
    },

    start: (now) => {
      const s = get();
      if (s.phase === 'running') return;
      let penalty: Penalty = 'none';
      let inspectionMs = 0;
      if (s.phase === 'inspection' && s.inspectionStartedAt !== null) {
        inspectionMs = now - s.inspectionStartedAt;
        penalty = inspectionPenalty(inspectionMs);
      }
      set({
        phase: 'running',
        startedAt: now,
        elapsedBefore: s.phase === 'paused' ? s.elapsedBefore : 0,
        penalty,
        inspectionMs: Math.round(inspectionMs),
      });
    },

    pause: (now) => {
      const s = get();
      if (s.phase !== 'running' || s.startedAt === null) return;
      set({ phase: 'paused', elapsedBefore: s.elapsedBefore + (now - s.startedAt), startedAt: null });
    },

    resume: (now) => {
      if (get().phase !== 'paused') return;
      set({ phase: 'running', startedAt: now });
    },

    finish: (now) => {
      const s = get();
      const elapsed = elapsedOf(s, now);
      const record = buildRecord(elapsed, s.penalty);
      set({ phase: 'finished', finalElapsed: elapsed, startedAt: null, lastResult: record });
      return record;
    },

    abandon: (now) => {
      const s = get();
      if (s.phase !== 'running' && s.phase !== 'paused' && s.phase !== 'inspection') {
        set({ ...initial, scramble: s.scramble });
        return null;
      }
      const record = buildRecord(elapsedOf(s, now), 'DNF');
      set({ ...initial, phase: 'idle', scramble: null, lastResult: record });
      return record;
    },

    reset: () => set({ ...initial, scramble: null }),

    countMove: (delta = 1) => set((s) => ({ moves: Math.max(0, s.moves + delta) })),
    setMoves: (moves) => set({ moves }),
    markAssisted: () => {
      const s = get();
      if (s.phase === 'running' || s.phase === 'paused' || s.phase === 'inspection' || s.phase === 'ready') {
        set({ assisted: true });
      }
    },
    setReference: (reference) => set({ reference }),
  };
});
