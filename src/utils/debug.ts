import { visualBus } from '../cube/animations/visualBus';
import { formatMoves } from '../engine/moves/notation';
import { isSolved, serializeState, statesEqual } from '../engine/state/cube';
import { useAttempt } from '../features/timer/attemptStore';
import { useCube } from '../store/cubeStore';
import * as controller from '../store/controller';
import { useStats } from '../features/statistics/statsStore';
import { usePlayer } from '../features/player/playerStore';
import { readProbe } from './probes';

/**
 * Gancho de inspeção somente leitura para testes automatizados de ponta a
 * ponta. Ativado apenas em desenvolvimento ou com `?e2e` na URL.
 */
export function installDebugHook(): void {
  if (typeof window === 'undefined') return;
  const enabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e');
  if (!enabled) return;
  (window as unknown as Record<string, unknown>).__cubeforge = {
    state: () => {
      const c = useCube.getState();
      return {
        size: c.size,
        mode: c.mode,
        solved: isSolved(c.state),
        serialized: serializeState(c.state),
        history: formatMoves(c.history),
        scramble: c.scramble?.text ?? null,
        lock: c.lock,
        animating: visualBus.isBusy(),
      };
    },
    attempt: () => {
      const a = useAttempt.getState();
      return { phase: a.phase, moves: a.moves, penalty: a.penalty, assisted: a.assisted };
    },
    player: () => {
      const p = usePlayer.getState();
      return { active: p.active, index: p.index, length: p.moves.length, status: p.status, kind: p.kind };
    },
    records: () => useStats.getState().records.length,
    camera: () => readProbe('camera'),
    /** Converte um ponto 3D (coordenadas do cubo) em coordenadas de tela. */
    project: (p: [number, number, number]) =>
      (readProbe('projector') as ((v: [number, number, number]) => [number, number]) | undefined)?.(p) ?? null,
    whenIdle: () => visualBus.whenIdle(),
    /** O estado exibido pelo renderizador coincide com o estado lógico? */
    displayMatchesLogical: () => {
      const shown = visualBus.displayedState();
      return shown !== null && statesEqual(shown, useCube.getState().state);
    },
    controller,
  };
}
