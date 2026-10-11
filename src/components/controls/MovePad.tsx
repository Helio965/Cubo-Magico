import { CornerDownLeft } from 'lucide-react';
import { useState } from 'react';
import { formatMove, type FaceBase, type Move, type MoveAmount } from '../../engine/moves/notation';
import { buildMove } from './moveBuilder';
import { usePlayer } from '../../features/player/playerStore';
import { useSettings } from '../../features/settings/settingsStore';
import { performMove, performSequence } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { Segmented } from '../ui/controls';

const FACES: { base: FaceBase; name: string }[] = [
  { base: 'U', name: 'Cima' },
  { base: 'D', name: 'Baixo' },
  { base: 'L', name: 'Esquerda' },
  { base: 'R', name: 'Direita' },
  { base: 'F', name: 'Frente' },
  { base: 'B', name: 'Trás' },
];
const AMOUNTS: MoveAmount[] = [1, -1, 2];


export function MovePad() {
  const size = useCube((s) => s.size);
  const lock = useCube((s) => s.lock);
  const colors = useSettings((s) => s.colors);
  const depth = useUI((s) => s.layerDepth);
  const wide = useUI((s) => s.wide);
  const next = usePlayer((s) => (s.active && s.expectUser && s.status === 'ready' ? s.moves[s.index] : undefined));
  const nextText = next ? formatMove(next) : null;
  const disabled = lock === 'scramble' || lock === 'playback';
  const maxDepth = Math.max(1, Math.floor(size / 2));

  const button = (m: Move, key: string, title: string) => {
    const text = formatMove(m);
    return (
      <button
        key={key}
        type="button"
        className={`move-btn ${nextText === text ? 'is-next' : ''}`}
        disabled={disabled}
        onClick={() => performMove(m)}
        title={title}
        aria-label={`Movimento ${text}: ${title}`}
        data-testid={`move-${text}`}
      >
        {text}
      </button>
    );
  };

  return (
    <div className="stack">
      {size >= 3 && (
        <div className="row">
          {size >= 4 && (
            <div className="grow">
              <Segmented
                label="Camada"
                value={Math.min(depth, maxDepth)}
                onChange={(v) => useUI.setState({ layerDepth: v })}
                options={Array.from({ length: maxDepth }, (_, i) => ({
                  value: i + 1,
                  label: i === 0 ? 'Externa' : `Camada ${i + 1}`,
                }))}
              />
            </div>
          )}
          <button
            type="button"
            className={`btn btn-sm ${wide ? 'btn-primary' : ''}`}
            aria-pressed={wide}
            onClick={() => useUI.setState({ wide: !wide })}
            title="Movimentos largos: giram várias camadas a partir da face (Rw, Uw…)"
          >
            Larga (w)
          </button>
        </div>
      )}
      <div className="movepad" role="group" aria-label="Movimentos de face">
        {FACES.map(({ base, name }) => (
          <div className="movepad-group" key={base} style={{ gridColumn: 'span 3' }}>
            <span className="movepad-dot" style={{ background: colors[base] }} title={name} aria-hidden="true" />
            {AMOUNTS.map((a) =>
              button(
                buildMove(base, a, Math.min(depth, maxDepth), wide),
                `${base}${a}`,
                `${name} ${a === 1 ? 'horário' : a === -1 ? 'anti-horário' : '180°'}`,
              ),
            )}
          </div>
        ))}
      </div>
      <div className="movepad" role="group" aria-label="Fatias e rotações">
        {size % 2 === 1 &&
          (['M', 'E', 'S'] as const).map((b) => (
            <div className="movepad-group" key={b} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {AMOUNTS.map((a) => button(buildMove(b, a, 1, false), `${b}${a}`, `Fatia ${b}`))}
            </div>
          ))}
        {(['x', 'y', 'z'] as const).map((b) => (
          <div className="movepad-group" key={b} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {AMOUNTS.map((a) => button(buildMove(b, a, 1, false), `${b}${a}`, `Rotação do cubo inteiro em ${b}`))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotationInput() {
  const [text, setText] = useState('');
  const lock = useCube((s) => s.lock);
  const apply = () => {
    if (!text.trim()) return;
    if (performSequence(text)) setText('');
  };
  return (
    <form
      className="input-group"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <input
        className="input mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="R U R' U'"
        aria-label="Digite uma sequência de movimentos em notação padrão"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        data-testid="notation-input"
      />
      <button type="submit" className="btn" disabled={lock === 'scramble' || lock === 'playback'} aria-label="Aplicar sequência">
        <CornerDownLeft aria-hidden="true" />
        Aplicar
      </button>
    </form>
  );
}
