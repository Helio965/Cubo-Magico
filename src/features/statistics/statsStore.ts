import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Penalty, SolveRecord } from '../../types/game';
import { safeJSONStorage } from '../../utils/storage';

export interface LevelProgress {
  stars: number;
  moves: number;
  timeMs: number;
}

interface StatsState {
  records: SolveRecord[];
  /** Progresso do desafio progressivo por tamanho: nível → melhor resultado. */
  progress: Record<string, Record<string, LevelProgress>>;
  addRecord: (record: SolveRecord) => void;
  removeRecord: (id: string) => void;
  setPenalty: (id: string, penalty: Penalty) => void;
  clear: (filter?: { size?: number; mode?: string }) => void;
  saveLevel: (size: number, level: number, result: LevelProgress) => void;
  resetProgress: () => void;
}

/** Limite de registros guardados localmente (os mais antigos são descartados). */
export const MAX_RECORDS = 5000;

export const useStats = create<StatsState>()(
  persist(
    (set) => ({
      records: [],
      progress: {},
      addRecord: (record) => set((s) => ({ records: [...s.records, record].slice(-MAX_RECORDS) })),
      removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
      setPenalty: (id, penalty) =>
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, penalty } : r)) })),
      clear: (filter) =>
        set((s) => ({
          records: filter
            ? s.records.filter(
                (r) =>
                  !(
                    (filter.size === undefined || r.size === filter.size) &&
                    (filter.mode === undefined || r.mode === filter.mode)
                  ),
              )
            : [],
        })),
      saveLevel: (size, level, result) =>
        set((s) => {
          const current = s.progress[size]?.[level];
          const better =
            !current ||
            result.stars > current.stars ||
            (result.stars === current.stars && result.moves < current.moves);
          if (!better) return s;
          return { progress: { ...s.progress, [size]: { ...s.progress[size], [level]: result } } };
        }),
      resetProgress: () => set({ progress: {} }),
    }),
    { name: 'cubeforge.stats', version: 1, storage: safeJSONStorage },
  ),
);
