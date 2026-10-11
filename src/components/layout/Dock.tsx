import { useEffect, useState } from 'react';
import { filterRecords, summarize } from '../../features/statistics/stats';
import { useStats } from '../../features/statistics/statsStore';
import { elapsedOf, useAttempt } from '../../features/timer/attemptStore';
import { useCube } from '../../store/cubeStore';
import { formatNumber, formatTime } from '../../utils/format';
import { Toolbar } from '../controls/Toolbar';
import { solvedRatio } from '../../engine/state/cube';

function useLiveElapsed(): number {
  const phase = useAttempt((s) => s.phase);
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(id);
  }, [phase]);
  return elapsedOf(useAttempt.getState(), now);
}

function Metric({ label, value, testId }: { label: string; value: React.ReactNode; testId?: string }) {
  return (
    <div className="metric">
      <span className="micro">{label}</span>
      <span className="metric-value" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

export function Dock() {
  const moves = useAttempt((s) => s.moves);
  const phase = useAttempt((s) => s.phase);
  const solved = useCube((s) => s.solved);
  const state = useCube((s) => s.state);
  const scramble = useCube((s) => s.scramble);
  const size = useCube((s) => s.size);
  const mode = useCube((s) => s.mode);
  const records = useStats((s) => s.records);
  const elapsed = useLiveElapsed();
  const summary = summarize(filterRecords(records, { size, mode }));
  const tps = elapsed > 500 && moves > 0 ? moves / (elapsed / 1000) : null;
  const ratio = Math.round(solvedRatio(state) * 100);

  const status = solved
    ? scramble && phase === 'finished'
      ? 'Resolvido ✓'
      : 'Resolvido'
    : phase === 'ready'
      ? 'Embaralhado'
      : `${ratio}% em ordem`;

  return (
    <footer className="dock" aria-label="Estado e ferramentas">
      <div className="metrics" aria-live="polite">
        <Metric label="Movimentos" value={moves} testId="metric-moves" />
        <Metric label="Estado" value={status} testId="metric-state" />
        <Metric label="Mov/s" value={tps ? formatNumber(tps) : '—'} />
        <Metric label="Ao5" value={summary.ao5 === null ? '—' : formatTime(summary.ao5)} />
        <Metric label="Ao12" value={summary.ao12 === null ? '—' : formatTime(summary.ao12)} />
        <Metric label="Melhor" value={summary.best === null ? '—' : formatTime(summary.best)} />
      </div>
      <Toolbar />
    </footer>
  );
}
