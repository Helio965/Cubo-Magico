import { create } from 'zustand';
import type { PieceKind } from '../engine/state/layout';
import type { GameMode, SolveRecord } from '../types/game';

export type Section = 'play' | 'modes' | 'learn';
export type ModalId = null | 'settings' | 'stats' | 'shortcuts';

export interface CompletionInfo {
  record: SolveRecord | null;
  mode: GameMode;
  size: number;
  moves: number;
  timeMs: number | null;
  isBest: boolean;
  ao5: number | null;
  level?: { level: number; stars: number; next: number | null };
  reference?: number | null;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export type SolverStatus = 'idle' | 'preparing' | 'ready' | 'solving' | 'error';

export interface UIStore {
  section: Section;
  modal: ModalId;
  completion: CompletionInfo | null;
  confirm: ConfirmRequest | null;
  highlight: PieceKind[] | null;
  cameraResetToken: number;
  introDone: boolean;
  sheetOpen: boolean;
  solverStatus: SolverStatus;
  busyMessage: string | null;
  /** Profundidade da camada usada pelos botões/teclado (1 = externa). */
  layerDepth: number;
  wide: boolean;
  webglError: string | null;
}

export const useUI = create<UIStore>(() => ({
  section: 'play',
  modal: null,
  completion: null,
  confirm: null,
  highlight: null,
  cameraResetToken: 0,
  introDone: false,
  sheetOpen: false,
  solverStatus: 'idle',
  busyMessage: null,
  layerDepth: 1,
  wide: false,
  webglError: null,
}));

export const ui = {
  openModal: (modal: ModalId) => useUI.setState({ modal }),
  closeModal: () => useUI.setState({ modal: null }),
  setSection: (section: Section) => useUI.setState({ section, sheetOpen: true }),
  resetCamera: () => useUI.setState((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),
  askConfirm: (req: ConfirmRequest) => useUI.setState({ confirm: req }),
  closeConfirm: () => useUI.setState({ confirm: null }),
};
