import { Info, WandSparkles } from 'lucide-react';
import { solverSupport } from '../../engine/solver';
import { requestSolution } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { usePlayer } from '../player/playerStore';
import { useAttempt } from '../timer/attemptStore';
import { isCompetitiveMode } from '../../store/controller';

export function SolverPanel() {
  const size = useCube((s) => s.size);
  const solved = useCube((s) => s.solved);
  const lock = useCube((s) => s.lock);
  const mode = useCube((s) => s.mode);
  const status = useUI((s) => s.solverStatus);
  const phase = useAttempt((s) => s.phase);
  const playerKind = usePlayer((s) => (s.active ? s.kind : null));
  const support = solverSupport(size);

  if (!support.available) {
    return (
      <div className="callout is-info" data-testid="solver-unavailable">
        <Info aria-hidden="true" />
        <span>{support.reason}</span>
      </div>
    );
  }
  const competitive = isCompetitiveMode(mode) && (phase === 'running' || phase === 'ready' || phase === 'inspection');
  return (
    <div className="stack">
      <button
        type="button"
        className="btn btn-block btn-lg"
        disabled={solved || lock !== null || status === 'solving'}
        onClick={() => void requestSolution()}
        data-testid="solve-button"
      >
        <WandSparkles aria-hidden="true" />
        {status === 'solving' ? 'Calculando…' : 'Resolver automaticamente'}
      </button>
      <p className="hint">
        Método: <strong>{support.method}</strong>. A solução é calculada a partir do estado atual (sem usar o histórico),
        validada em uma cópia do cubo e reproduzida movimento a movimento.
        {status === 'preparing' && ' Preparando tabelas do resolvedor em segundo plano…'}
      </p>
      {competitive && (
        <div className="callout is-warning">
          <Info aria-hidden="true" />
          <span>Usar a resolução automática marca a tentativa atual como <strong>assistida</strong>: ela não conta para recordes nem médias.</span>
        </div>
      )}
      {solved && playerKind !== 'solution' && <p className="hint">O cubo já está resolvido. Embaralhe para testar o resolvedor.</p>}
    </div>
  );
}
