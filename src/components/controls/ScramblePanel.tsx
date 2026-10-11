import { Check, Copy, Repeat, Shuffle, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { defaultScrambleLength } from '../../engine/scramble/scramble';
import { useSettings } from '../../features/settings/settingsStore';
import { newScramble, repeatScramble, scrambleLengthFor, undo } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { toast } from '../../store/toastStore';
import { IconButton } from '../ui/IconButton';
import { Field, FieldRow, Range, Segmented, Switch } from '../ui/controls';
import { guardAttempt } from './guards';

export function ScramblePanel() {
  const size = useCube((s) => s.size);
  const scramble = useCube((s) => s.scramble);
  const lock = useCube((s) => s.lock);
  const canUndo = useCube((s) => s.history.length > 0);
  const lastScramble = useCube((s) => s.lastScramble);
  const animated = useSettings((s) => s.scrambleAnimated);
  const kind = useSettings((s) => s.scrambleKind);
  const lengths = useSettings((s) => s.scrambleLengths);
  const set = useSettings((s) => s.set);
  const [seed, setSeed] = useState('');
  const [copied, setCopied] = useState(false);
  const length = scrambleLengthFor(size);
  const randomStateAvailable = size === 2 || size === 3;
  const effectiveKind = randomStateAvailable ? kind : 'random-move';

  const copy = async () => {
    if (!scramble) return;
    const text = `${scramble.text}${scramble.seed ? `  (semente: ${scramble.seed})` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.', 'warning');
    }
  };

  return (
    <div className="stack">
      <div className="sequence" aria-live="polite" data-testid="scramble-text">
        {scramble ? (
          scramble.moves.length ? (
            scramble.text
          ) : (
            <span className="hint">{scramble.text}</span>
          )
        ) : (
          <span className="hint">Nenhum embaralhamento ativo. O cubo está no estado inicial ou foi movido livremente.</span>
        )}
      </div>
      {scramble?.seed && (
        <div className="row row-between">
          <span className="micro">
            Semente <span className="mono" style={{ color: 'var(--text-2)', letterSpacing: 0 }}>{scramble.seed}</span>
            {' · '}
            {scramble.kind === 'random-state' ? 'estado aleatório' : `${scramble.moves.length} mov.`}
          </span>
          <IconButton icon={copied ? Check : Copy} label={copied ? 'Copiado!' : 'Copiar sequência'} onClick={copy} />
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={lock === 'scramble'}
        onClick={() => guardAttempt(() => void newScramble({ seed: seed || undefined }), 'Embaralhar')}
        data-testid="scramble-button"
      >
        <Shuffle aria-hidden="true" /> Embaralhar cubo
      </button>
      <div className="row">
        <button
          type="button"
          className="btn btn-sm grow"
          disabled={!lastScramble || lastScramble.size !== size || lock === 'scramble'}
          onClick={() => guardAttempt(() => void repeatScramble(), 'Repetir o embaralhamento')}
        >
          <Repeat aria-hidden="true" /> Repetir
        </button>
        <button type="button" className="btn btn-sm grow" disabled={!canUndo || lock !== null} onClick={undo}>
          <Undo2 aria-hidden="true" /> Desfazer
        </button>
      </div>
      <Field label="Método" hint={randomStateAvailable ? 'Estado aleatório segue o padrão das competições WCA.' : 'Estado aleatório disponível apenas para 2×2 e 3×3.'}>
        <Segmented
          label="Método de embaralhamento"
          value={effectiveKind}
          onChange={(v) => set('scrambleKind', v)}
          options={[
            { value: 'random-move', label: 'Movimentos aleatórios' },
            { value: 'random-state', label: 'Estado aleatório', disabled: !randomStateAvailable },
          ]}
        />
      </Field>
      <Field label="Quantidade de movimentos">
        <Range
          label="Quantidade de movimentos"
          value={length}
          min={1}
          max={size * 25}
          step={1}
          onChange={(v) => set('scrambleLengths', { ...lengths, [size]: v })}
          format={(v) => `${v}${v === defaultScrambleLength(size) ? ' (padrão)' : ''}`}
        />
      </Field>
      <Field label="Semente (opcional)" hint="Use a mesma semente para reproduzir exatamente o mesmo embaralhamento.">
        <input
          className="input mono"
          value={seed}
          placeholder="ex.: campeonato-01"
          onChange={(e) => setSeed(e.target.value)}
          aria-label="Semente do embaralhamento"
          data-testid="seed-input"
        />
      </Field>
      <FieldRow label="Embaralhamento animado" hint="Desative para embaralhar instantaneamente.">
        <Switch label="Embaralhamento animado" checked={animated} onChange={(v) => set('scrambleAnimated', v)} />
      </FieldRow>
    </div>
  );
}
