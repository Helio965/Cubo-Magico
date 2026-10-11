import { create } from 'zustand';
import type { Move } from '../../engine/moves/notation';
import type { CubeState } from '../../engine/state/cube';

export type PlayerKind = 'solution' | 'lesson' | 'guided' | 'training';
export type PlayerStatus = 'ready' | 'done' | 'deviation';

export interface PlayerMeta {
  method?: string;
  elapsedMs?: number;
  lessonId?: string;
  algorithmId?: string;
}

export interface PlayerStore {
  active: boolean;
  kind: PlayerKind;
  title: string;
  moves: Move[];
  index: number;
  partial: number;
  offPath: Move[];
  playing: boolean;
  /** Multiplicador de velocidade da reprodução (0,25× a 3×). */
  speed: number;
  /** O usuário executa os movimentos (o sistema confere). */
  expectUser: boolean;
  startState: CubeState | null;
  status: PlayerStatus;
  meta: PlayerMeta;
}

export const PLAYER_IDLE: Omit<PlayerStore, 'speed'> = {
  active: false,
  kind: 'solution',
  title: '',
  moves: [],
  index: 0,
  partial: 0,
  offPath: [],
  playing: false,
  expectUser: false,
  startState: null,
  status: 'ready',
  meta: {},
};

export const usePlayer = create<PlayerStore>(() => ({ ...PLAYER_IDLE, speed: 1 }));
