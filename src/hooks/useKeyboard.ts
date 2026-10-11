import { useEffect } from 'react';
import { buildMove } from '../components/controls/moveBuilder';
import { guardAttempt } from '../components/controls/guards';
import type { MoveBase } from '../engine/moves/notation';
import { usePlayer } from '../features/player/playerStore';
import {
  newScramble,
  performMove,
  playerBack,
  playerPause,
  playerPlay,
  playerStep,
  redo,
  resetCube,
  timerAction,
  undo,
} from '../store/controller';
import { ui, useUI } from '../store/uiStore';

const MOVE_KEYS: Record<string, MoveBase> = {
  KeyR: 'R',
  KeyL: 'L',
  KeyU: 'U',
  KeyD: 'D',
  KeyF: 'F',
  KeyB: 'B',
  KeyM: 'M',
  KeyE: 'E',
  KeyS: 'S',
  KeyX: 'x',
  KeyY: 'y',
  KeyZ: 'z',
};

/** Atalhos globais de teclado (desativados enquanto se digita em campos). */
export function useKeyboard(): void {
  useEffect(() => {
    let pendingDepth: { depth: number; until: number } | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const uiState = useUI.getState();
      if (uiState.modal || uiState.completion || uiState.confirm) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        if (e.code === 'KeyZ') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.code === 'KeyY') {
          e.preventDefault();
          redo();
        }
        return;
      }

      if (e.code === 'Space') {
        // Em botões focados pelo teclado, Espaço mantém o comportamento padrão.
        if (target?.closest('button, a, [role="switch"]')) return;
        e.preventDefault();
        if (!e.repeat) timerAction();
        return;
      }
      if (e.repeat) return;

      if (/^Digit[2-9]$/.test(e.code)) {
        pendingDepth = { depth: Number(e.code.slice(5)), until: performance.now() + 1500 };
        return;
      }

      const base = MOVE_KEYS[e.code];
      if (base) {
        e.preventDefault();
        const pending = pendingDepth && pendingDepth.until > performance.now() ? pendingDepth.depth : null;
        pendingDepth = null;
        const amount = e.shiftKey ? -1 : 1;
        const depth = pending ?? uiState.layerDepth;
        performMove(buildMove(base, amount, depth, e.altKey || uiState.wide));
        return;
      }

      switch (e.code) {
        case 'KeyN':
          e.preventDefault();
          guardAttempt(() => void newScramble(), 'Embaralhar');
          break;
        case 'KeyC':
          ui.resetCamera();
          break;
        case 'KeyT':
          ui.openModal('stats');
          break;
        case 'Comma':
          ui.openModal('settings');
          break;
        case 'Slash':
          if (e.shiftKey) ui.openModal('shortcuts');
          break;
        case 'KeyP': {
          const p = usePlayer.getState();
          if (p.active) {
            if (p.playing) playerPause();
            else playerPlay();
          }
          break;
        }
        case 'BracketLeft':
          playerBack();
          break;
        case 'BracketRight':
          playerStep();
          break;
        case 'Backspace':
          e.preventDefault();
          if (e.shiftKey) guardAttempt(resetCube, 'Reiniciar o cubo');
          else undo();
          break;
        case 'Escape':
          if (usePlayer.getState().playing) playerPause();
          break;
      }
    };

    // Após cliques com mouse/toque, devolve o foco ao documento para que a
    // tecla Espaço continue controlando o cronômetro.
    const onClick = (e: MouseEvent) => {
      if (e.detail > 0) {
        const button = (e.target as HTMLElement | null)?.closest('button');
        if (button && !button.closest('[role="dialog"]')) button.blur();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onClick);
    };
  }, []);
}
