import { useEffect, useRef, useState } from 'react';
import { useCube } from '../../store/cubeStore';
import { useAttempt, elapsedOf, type AttemptPhase } from './attemptStore';
import { INSPECTION_MS, inspectionWarning } from './inspection';
import { playTickSound } from '../audio/audio';
import { modeInfo } from '../../types/game';
import { useSettings } from '../settings/settingsStore';

const PHASE_LABEL: Record<AttemptPhase, string> = {
  idle: 'Aguardando',
  ready: 'Pronto',
  inspection: 'Inspeção',
  running: 'Em andamento',
  paused: 'Pausado',
  finished: 'Concluído',
};

function splitTime(ms: number, digits: 2 | 3): { main: string; frac: string } {
  const total = Math.max(0, ms);
  const frac = digits === 3 ? Math.floor(total) % 1000 : Math.floor(total / 10) % 100;
  const s = Math.floor(total / 1000);
  const m = Math.floor(s / 60);
  const main = m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : String(s);
  return { main, frac: `.${String(frac).padStart(digits, '0')}` };
}

/** Cronômetro principal. Atualiza por requestAnimationFrame apenas enquanto corre. */
export function TimerDisplay({ compact }: { compact?: boolean }) {
  const phase = useAttempt((s) => s.phase);
  const penalty = useAttempt((s) => s.penalty);
  const mode = useCube((s) => s.mode);
  const digits = useSettings((s) => s.timerDigits);
  const [now, setNow] = useState(() => performance.now());
  const lastWarn = useRef<string>('none');

  useEffect(() => {
    if (phase !== 'running' && phase !== 'inspection') return;
    let raf = 0;
    const loop = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const s = useAttempt.getState();
  let warn: ReturnType<typeof inspectionWarning> = 'none';
  let text: { main: string; frac: string };
  if (phase === 'inspection' && s.inspectionStartedAt !== null) {
    const el = now - s.inspectionStartedAt;
    warn = inspectionWarning(el);
    const remaining = Math.ceil((INSPECTION_MS - el) / 1000);
    text = el > INSPECTION_MS ? { main: el > 17_000 ? 'DNF' : '+2', frac: '' } : { main: String(remaining), frac: '' };
  } else {
    text = splitTime(elapsedOf(s, now), digits);
  }

  useEffect(() => {
    if (warn !== lastWarn.current) {
      if (warn === '8s' || warn === '12s') playTickSound();
      lastWarn.current = warn;
    }
  }, [warn]);

  const label =
    phase === 'inspection' && warn !== 'none'
      ? warn === '8s'
        ? '8 segundos'
        : warn === '12s'
          ? '12 segundos'
          : 'Tempo de inspeção excedido'
      : PHASE_LABEL[phase];

  return (
    <div
      className={`timer ${compact ? '' : 'glass'}`}
      data-phase={phase}
      data-warn={warn}
      role="timer"
      aria-live="off"
      aria-label={`Cronômetro: ${text.main}${text.frac}`}
      data-testid="timer"
    >
      <span className="timer-status micro">
        <span className="chip-dot" style={{ color: phase === 'running' ? 'var(--success)' : phase === 'inspection' ? 'var(--accent)' : 'var(--text-3)' }} />
        {modeInfo(mode).short} · {label}
      </span>
      <span className="timer-value">
        {text.main}
        {text.frac && <span className="frac">{text.frac}</span>}
      </span>
      {(penalty !== 'none' || phase === 'finished') && (
        <span className="timer-sub">
          {penalty !== 'none' && <span className="chip is-warning">{penalty === '+2' ? 'Penalidade +2' : 'DNF'}</span>}
        </span>
      )}
    </div>
  );
}
