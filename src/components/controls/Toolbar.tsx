import {
  ChartColumn,
  GraduationCap,
  Maximize,
  Minimize,
  Redo2,
  RotateCcw,
  Crosshair,
  Settings,
  Shuffle,
  Timer,
  Undo2,
  WandSparkles,
} from 'lucide-react';
import { solverSupport } from '../../engine/solver';
import { useAttempt } from '../../features/timer/attemptStore';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { newScramble, requestSolution, resetCube, timerAction, undo, redo } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { ui, useUI } from '../../store/uiStore';
import { IconButton } from '../ui/IconButton';
import { guardAttempt, isFullscreenSupported, toggleFullscreen } from './guards';

export function Toolbar() {
  const size = useCube((s) => s.size);
  const lock = useCube((s) => s.lock);
  const solved = useCube((s) => s.solved);
  const canUndo = useCube((s) => s.history.length > 0);
  const canRedo = useCube((s) => s.redoStack.length > 0);
  const mode = useCube((s) => s.mode);
  const phase = useAttempt((s) => s.phase);
  const solverStatus = useUI((s) => s.solverStatus);
  const fullscreen = useFullscreen();
  const wide = useMediaQuery('(min-width: 1500px)');
  const support = solverSupport(size);
  const locked = lock !== null && lock !== 'drag';

  const timerLabel =
    mode === 'free' || mode === 'training'
      ? phase === 'running'
        ? 'Pausar cronômetro'
        : phase === 'paused'
          ? 'Retomar cronômetro'
          : 'Iniciar cronômetro'
      : phase === 'ready'
        ? mode === 'speed'
          ? 'Iniciar inspeção'
          : 'Iniciar tentativa'
        : phase === 'inspection'
          ? 'Iniciar resolução'
          : phase === 'idle' || phase === 'finished'
            ? 'Nova tentativa'
            : 'Tentativa em andamento';

  const solveLabel = !support.available
    ? `Resolver automaticamente\n(indisponível para ${size}×${size})`
    : solverStatus === 'solving'
      ? 'Calculando solução…'
      : 'Resolver automaticamente';

  return (
    <div className="toolbar" role="toolbar" aria-label="Ferramentas do cubo">
      <IconButton
        icon={Shuffle}
        label="Embaralhar"
        shortcut="N"
        primary
        showLabel={wide}
        disabled={lock === 'scramble'}
        onClick={() => guardAttempt(() => void newScramble(), 'Embaralhar')}
        data-testid="btn-scramble"
      />
      <IconButton
        icon={RotateCcw}
        label="Reiniciar cubo"
        shortcut="Shift+Backspace"
        onClick={() => guardAttempt(resetCube, 'Reiniciar o cubo')}
        data-testid="btn-reset"
      />
      <IconButton icon={Undo2} label="Desfazer" shortcut="Ctrl+Z" disabled={!canUndo || locked} onClick={undo} data-testid="btn-undo" />
      <IconButton icon={Redo2} label="Refazer" shortcut="Ctrl+Y" disabled={!canRedo || locked} onClick={redo} data-testid="btn-redo" />
      <IconButton
        icon={WandSparkles}
        label={solveLabel}
        showLabel={wide}
        disabled={!support.available || solved || locked || solverStatus === 'solving'}
        onClick={() => void requestSolution()}
        data-testid="btn-solve"
      />
      <span className="toolbar-sep" aria-hidden="true" />
      <IconButton
        icon={Timer}
        label={timerLabel}
        shortcut="Espaço"
        disabled={mode === 'guided' || lock === 'scramble' || phase === 'running' && mode !== 'free' && mode !== 'training'}
        onClick={timerAction}
        data-testid="btn-timer"
      />
      <IconButton icon={GraduationCap} label="Tutorial" onClick={() => ui.setSection('learn')} />
      <IconButton icon={ChartColumn} label="Estatísticas" shortcut="T" onClick={() => ui.openModal('stats')} />
      <IconButton icon={Settings} label="Configurações" shortcut="," onClick={() => ui.openModal('settings')} />
      <span className="toolbar-sep" aria-hidden="true" />
      <IconButton
        icon={fullscreen ? Minimize : Maximize}
        label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        shortcut="F11"
        disabled={!isFullscreenSupported()}
        onClick={() => void toggleFullscreen()}
      />
      <IconButton icon={Crosshair} label="Redefinir câmera" shortcut="C" onClick={ui.resetCamera} data-testid="btn-camera" />
    </div>
  );
}
