import { Cpu, Loader2 } from 'lucide-react';
import { CubeViewport } from '../../cube/rendering/CubeViewport';
import { solverSupport } from '../../engine/solver';
import { getLayout } from '../../engine/state/layout';
import { PlayerBar } from '../../features/player/PlayerBar';
import { useSettings } from '../../features/settings/settingsStore';
import { useAttempt } from '../../features/timer/attemptStore';
import { TimerDisplay } from '../../features/timer/TimerDisplay';
import { usePlayer } from '../../features/player/playerStore';
import { usesInspection } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { modeInfo } from '../../types/game';
import { CubeNet } from '../CubeNet';
import { ViewControls } from './ViewControls';

function StageHint() {
  const phase = useAttempt((s) => s.phase);
  const mode = useCube((s) => s.mode);
  const lock = useCube((s) => s.lock);
  const playerActive = usePlayer((s) => s.active);
  const timerStart = useSettings((s) => s.timerStart);
  const doubleTap = useSettings((s) => s.doubleTapStart);
  const busy = useUI((s) => s.busyMessage);
  const solverStatus = useUI((s) => s.solverStatus);

  if (busy || solverStatus === 'solving') {
    return (
      <div className="busy glass" role="status">
        <span className="spinner" aria-hidden="true" />
        {busy ?? 'Calculando a solução…'}
      </div>
    );
  }
  if (lock === 'scramble') {
    return (
      <div className="busy glass" role="status">
        <Loader2 className="spinner" style={{ border: 0, animation: 'none' }} aria-hidden="true" />
        Embaralhando…
      </div>
    );
  }
  if (playerActive) return null;
  const tap = doubleTap ? ' ou toque duas vezes' : '';
  let text: string | null = null;
  if (mode === 'free' || mode === 'guided') text = null;
  else if (phase === 'idle') text = `Pressione Espaço${tap} para um novo embaralhamento.`;
  else if (phase === 'ready')
    text = usesInspection(mode)
      ? `Pressione Espaço${tap} para iniciar os 15 s de inspeção.`
      : timerStart === 'manual'
        ? `Pressione Espaço${tap} para iniciar.`
        : 'O cronômetro começa no seu primeiro movimento.';
  else if (phase === 'inspection') text = 'Inspecione o cubo. O tempo começa no primeiro giro (ou Espaço).';
  else if (phase === 'finished') text = `Pressione Espaço${tap} para a próxima tentativa.`;
  if (!text) return null;
  return (
    <div className="chip" role="status" data-testid="stage-hint">
      {text}
    </div>
  );
}

export function Stage() {
  const size = useCube((s) => s.size);
  const mode = useCube((s) => s.mode);
  const showNet = useSettings((s) => s.showNet);
  const solverStatus = useUI((s) => s.solverStatus);
  const support = solverSupport(size);
  const pieces = getLayout(size).count;

  return (
    <main className="stage" id="stage" aria-label="Visualizador 3D do cubo">
      <div className="stage-bg" aria-hidden="true" />
      <div className="stage-noise" aria-hidden="true" />
      <CubeViewport />
      <div className="reticle" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hud-top">
        <div className="hud-left">
          <span className="chip" data-testid="size-chip">
            {size}×{size}×{size}
            <span className="chip-extra"> · {pieces} peças</span>
          </span>
          <span className="chip is-accent">{modeInfo(mode).name}</span>
          {support.available ? (
            <span
              className={`chip ${solverStatus === 'ready' ? 'is-success' : ''}`}
              title="Estado do resolvedor automático"
            >
              <Cpu aria-hidden="true" />
              {
                {
                  idle: 'Resolvedor disponível',
                  preparing: 'Preparando resolvedor',
                  ready: 'Resolvedor pronto',
                  solving: 'Calculando solução',
                  error: 'Resolvedor com falha',
                }[solverStatus]
              }
            </span>
          ) : (
            <span className="chip" title={support.reason}>
              <Cpu aria-hidden="true" /> Sem resolvedor
            </span>
          )}
        </div>
        <TimerDisplay />
        <div className="hud-right">
          <ViewControls />
        </div>
      </div>
      {showNet && (
        <div className="hud-net">
          <CubeNet cell={11} className="glass" />
        </div>
      )}
      <div className="hud-bottom">
        <StageHint />
        <PlayerBar />
      </div>
    </main>
  );
}
