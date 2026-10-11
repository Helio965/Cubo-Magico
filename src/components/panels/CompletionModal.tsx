import { Play, Star, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { prefersReducedMotion } from '../../features/settings/settingsStore';
import { effectiveTime } from '../../features/statistics/stats';
import { nextTrainingRep, setLastPenalty, startLevel, timerAction } from '../../store/controller';
import { useUI } from '../../store/uiStore';
import { modeInfo, type Penalty } from '../../types/game';
import { formatNumber, formatTime } from '../../utils/format';
import { Modal } from '../ui/Modal';

const CONFETTI_COLORS = ['#5d8bff', '#9b6bff', '#3ee0a1', '#ffbd4a', '#ff5f73', '#f4f6f8'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dx: (Math.random() - 0.5) * 220,
        rot: (Math.random() - 0.5) * 900,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  );
  if (prefersReducedMotion()) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ['--dx' as string]: `${p.dx}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function CompletionModal() {
  const info = useUI((s) => s.completion);
  if (!info) return null;
  const close = () => useUI.setState({ completion: null });
  const record = info.record;
  const time = record ? effectiveTime(record) : null;
  const finite = time !== null && Number.isFinite(time);
  const tps = finite && time! > 0 ? info.moves / (time! / 1000) : null;
  const competitive = record && ['timed', 'speed', 'fewest', 'progressive'].includes(record.mode);

  const primary = () => {
    close();
    if (info.mode === 'training') nextTrainingRep();
    else if (info.mode === 'progressive' && info.level) void startLevel(info.level.next ?? info.level.level);
    else if (info.mode !== 'free' && info.mode !== 'guided') timerAction();
  };
  const primaryLabel =
    info.mode === 'training'
      ? 'Próxima repetição'
      : info.mode === 'progressive'
        ? info.level?.next
          ? `Nível ${info.level.next}`
          : 'Jogar novamente'
        : info.mode === 'free' || info.mode === 'guided'
          ? null
          : 'Novo desafio';

  return (
    <Modal
      title="Cubo resolvido"
      onClose={close}
      hideHeader
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Fechar
          </button>
          {primaryLabel && (
            <button type="button" className="btn btn-primary" onClick={primary} data-autofocus data-testid="completion-next">
              <Play aria-hidden="true" /> {primaryLabel}
            </button>
          )}
        </>
      }
    >
      <Confetti />
      <div className="completion" data-testid="completion">
        <span className="micro">
          {modeInfo(info.mode).name} · {info.size}×{info.size}×{info.size}
        </span>
        <h2 style={{ marginTop: 8 }}>PARABÉNS!</h2>
        <p className="lead">Cubo resolvido!</p>
        {record && (
          <div className="completion-time" data-testid="completion-time">
            {finite ? formatTime(time!, { forceMinutes: true }) : 'DNF'}
          </div>
        )}
        {info.isBest && (
          <span className="chip is-success completion-badge">
            <Trophy aria-hidden="true" /> Novo recorde pessoal
          </span>
        )}
        {record?.assisted && (
          <span className="chip is-warning completion-badge">Tentativa assistida — não conta para recordes</span>
        )}
        {info.level && (
          <div className="stars-big" aria-label={`${info.level.stars} de 3 estrelas`}>
            {[1, 2, 3].map((i) => (
              <Star key={i} className={i <= info.level!.stars ? 'on' : ''} aria-hidden="true" />
            ))}
          </div>
        )}
        {record ? (
          <div className="completion-stats">
            <div className="kpi">
              <span className="micro">Tempo</span>
              <div className="kpi-value">{finite ? formatTime(time!) : 'DNF'}</div>
            </div>
            <div className="kpi">
              <span className="micro">Movimentos</span>
              <div className="kpi-value">{info.moves}</div>
            </div>
            <div className="kpi">
              <span className="micro">Velocidade</span>
              <div className="kpi-value">{tps === null ? '—' : `${formatNumber(tps)}`}</div>
              <span className="hint">mov/s</span>
            </div>
          </div>
        ) : (
          <div className="completion-stats" style={{ gridTemplateColumns: '1fr' }}>
            <div className="kpi">
              <span className="micro">Movimentos desde o embaralhamento</span>
              <div className="kpi-value">{info.moves}</div>
              <span className="hint">
                {info.mode === 'guided'
                  ? 'Resolução guiada concluída.'
                  : 'O cronômetro não estava ativo. Use um desafio cronometrado (ou Espaço no modo livre) para registrar o tempo.'}
              </span>
            </div>
          </div>
        )}
        {info.assisted && !record && (
          <span className="chip is-warning completion-badge">Concluído com ajuda do resolvedor automático</span>
        )}
        {info.reference !== undefined && info.reference !== null && (
          <p className="lead">
            Solução do computador: <strong>{info.reference}</strong> movimentos ·{' '}
            {info.moves <= info.reference ? 'você igualou ou superou o computador!' : `diferença de ${info.moves - info.reference}`}
          </p>
        )}
        {info.ao5 !== null && <p className="hint">Ao5 atual: {formatTime(info.ao5)}</p>}
        {record && competitive && (
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <span className="micro">Penalidade</span>
            <div className="segmented" role="group" aria-label="Penalidade">
              {(['none', '+2', 'DNF'] as Penalty[]).map((p) => (
                <button key={p} type="button" aria-pressed={record.penalty === p} onClick={() => setLastPenalty(record, p)}>
                  {p === 'none' ? 'OK' : p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
