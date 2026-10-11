import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, RotateCcw, SkipForward, User, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { formatMove, formatMoves, invertMoves } from '../../engine/moves/notation';
import {
  closePlayer,
  playerBack,
  playerPause,
  playerPlay,
  playerRestart,
  playerSeek,
  playerStep,
  requestSolution,
  setPlayerExpectUser,
  setPlayerSpeed,
} from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { usePlayer } from './playerStore';

const SPEEDS = [0.5, 1, 2, 3];

const KIND_LABEL = {
  solution: 'Resolução automática',
  lesson: 'Demonstração',
  guided: 'Resolução guiada',
  training: 'Treino de algoritmo',
} as const;

/** Reprodutor de sequências: soluções, demonstrações, treino e resolução guiada. */
export function PlayerBar() {
  const p = usePlayer();
  const lock = useCube((s) => s.lock);
  const solverStatus = useUI((s) => s.solverStatus);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current?.querySelector<HTMLElement>('.is-current');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [p.index]);

  if (!p.active) return null;
  const total = p.moves.length;
  const progress = total ? (p.index / total) * 100 : 100;
  const deviating = p.offPath.length > 0;
  const scrambling = lock === 'scramble';
  const next = p.moves[p.index];

  let message: string;
  if (p.status === 'done') message = p.kind === 'lesson' ? 'Sequência concluída.' : 'Concluído! O cubo chegou ao estado esperado.';
  else if (deviating)
    message = `Fora do roteiro: desfaça ${formatMoves(invertMoves(p.offPath))} para voltar.`;
  else if (p.partial) message = `Continue o giro de ${next ? formatMove(next) : ''}.`;
  else if (p.expectUser) message = next ? `Sua vez: execute ${formatMove(next)}` : '';
  else message = `${p.index} de ${total} movimentos`;

  return (
    <section className="player glass" aria-label={KIND_LABEL[p.kind]} data-testid="player">
      <div className="player-head">
        <span className="chip is-accent">{KIND_LABEL[p.kind]}</span>
        <span className="player-title grow">{p.title}</span>
        {p.meta.method && (
          <span className="micro" title="Algoritmo e tempo de cálculo">
            {p.meta.method}
            {p.meta.elapsedMs !== undefined ? ` · ${Math.round(p.meta.elapsedMs)} ms` : ''}
          </span>
        )}
        <IconButton icon={X} label="Fechar reprodutor" tipPos="left" onClick={closePlayer} />
      </div>
      <div className="player-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="player-track" ref={trackRef} role="list" aria-label="Sequência de movimentos">
        {p.moves.map((m, i) => (
          <button
            key={i}
            type="button"
            role="listitem"
            className={`seq-move ${i < p.index ? 'is-done' : ''} ${i === p.index && p.status !== 'done' ? 'is-current' : ''}`}
            onClick={() => playerSeek(i)}
            title={`Ir para o movimento ${i + 1}`}
            disabled={scrambling}
          >
            {formatMove(m)}
          </button>
        ))}
      </div>
      <div className="player-controls">
        <IconButton icon={RotateCcw} label="Voltar ao início" onClick={playerRestart} disabled={scrambling || p.index === 0} />
        <IconButton icon={ChevronLeft} label="Voltar um movimento" shortcut="[" onClick={playerBack} disabled={scrambling || p.index === 0 || deviating || p.playing} data-testid="player-back" />
        {p.playing ? (
          <IconButton icon={Pause} label="Pausar" shortcut="P" primary onClick={playerPause} data-testid="player-pause" />
        ) : (
          <IconButton icon={Play} label={p.status === 'done' ? 'Repetir' : 'Reproduzir'} shortcut="P" primary onClick={playerPlay} disabled={scrambling || deviating} data-testid="player-play" />
        )}
        <IconButton icon={ChevronRight} label="Avançar um movimento" shortcut="]" onClick={playerStep} disabled={scrambling || p.index >= total || deviating || p.playing} data-testid="player-step" />
        <IconButton icon={SkipForward} label="Ir para o fim" onClick={() => playerSeek(total)} disabled={scrambling || p.index >= total} />
        <div className="segmented" role="group" aria-label="Velocidade" style={{ marginLeft: 6 }}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={p.speed === s} onClick={() => setPlayerSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
        <span className="grow" />
        {(p.kind === 'lesson' || p.kind === 'solution') && (
          <IconButton
            icon={User}
            label={p.expectUser ? 'Modo execução ativo: você faz os movimentos' : 'Executar eu mesmo'}
            pressed={p.expectUser}
            onClick={() => setPlayerExpectUser(!p.expectUser)}
          />
        )}
        {(p.kind === 'guided' || p.kind === 'solution') && deviating && (
          <IconButton
            icon={RefreshCw}
            label="Recalcular a partir do estado atual"
            disabled={solverStatus === 'solving'}
            onClick={() => void requestSolution(p.kind === 'guided' ? 'guided' : 'solution')}
          />
        )}
      </div>
      <p className="hint" style={{ marginTop: 6 }} aria-live="polite" data-testid="player-message">
        {message}
      </p>
    </section>
  );
}
