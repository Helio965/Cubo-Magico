import { solverSupport } from '../../engine/solver';
import { setSize } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { SUPPORTED_SIZES } from '../../types/game';
import { guardAttempt } from './guards';

export function SizeSelector() {
  const size = useCube((s) => s.size);
  return (
    <div className="size-grid" role="group" aria-label="Tamanho do cubo">
      {SUPPORTED_SIZES.map((n) => (
        <button
          key={n}
          type="button"
          className="size-card"
          aria-pressed={size === n}
          onClick={() => guardAttempt(() => setSize(n), 'Trocar o tamanho do cubo')}
          data-testid={`size-${n}`}
        >
          <span className="size-glyph" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-hidden="true">
            {Array.from({ length: n * n }, (_, i) => (
              <span key={i} />
            ))}
          </span>
          <span className="size-label">
            {n}×{n}×{n}
          </span>
          <span className="size-badge">{solverSupport(n).available ? 'Com resolvedor' : 'Manual'}</span>
        </button>
      ))}
    </div>
  );
}
