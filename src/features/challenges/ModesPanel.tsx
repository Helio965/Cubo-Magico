import { Compass, Dumbbell, Footprints, Lock, Medal, Play, Route, Star, Timer, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Field, FieldRow, Panel, Segmented, Switch } from '../../components/ui/controls';
import { guardAttempt } from '../../components/controls/guards';
import { solverSupport } from '../../engine/solver';
import {
  isLevelUnlocked,
  newScramble,
  setMode,
  startGuided,
  startLevel,
  startTraining,
} from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { MODES, type GameMode } from '../../types/game';
import { formatTime } from '../../utils/format';
import { usePlayer } from '../player/playerStore';
import { useSettings } from '../settings/settingsStore';
import { filterRecords, summarize } from '../statistics/stats';
import { useStats } from '../statistics/statsStore';
import { useAttempt } from '../timer/attemptStore';
import { ALGORITHMS } from '../tutorials/algorithms';
import { LEVELS } from './levels';

const ICONS: Record<GameMode, typeof Compass> = {
  free: Compass,
  timed: Timer,
  speed: Zap,
  training: Dumbbell,
  guided: Route,
  fewest: Footprints,
  progressive: Medal,
};

function Stars({ count }: { count: number }) {
  return (
    <span className="level-stars" aria-label={`${count} de 3 estrelas`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={i <= count ? 'on' : ''} aria-hidden="true" />
      ))}
    </span>
  );
}

function ModeDetails({ mode }: { mode: GameMode }) {
  const size = useCube((s) => s.size);
  const settings = useSettings();
  const records = useStats((s) => s.records);
  const progress = useStats((s) => s.progress[size]);
  const level = useAttempt((s) => s.level);
  const reference = useAttempt((s) => s.reference);
  const algId = usePlayer((s) => s.meta.algorithmId);
  const [algSize, setAlgSize] = useState<number | 'all'>('all');
  const summary = useMemo(() => summarize(filterRecords(records, { size, mode })), [records, size, mode]);
  const support = solverSupport(size);

  switch (mode) {
    case 'free':
      return (
        <p className="hint">
          Gire camadas arrastando sobre o cubo, use os botões de movimento ou o teclado. O cronômetro pode ser iniciado
          e pausado manualmente (Espaço) e, se estiver correndo quando o cubo for resolvido, o tempo é registrado.
        </p>
      );
    case 'timed':
    case 'speed':
      return (
        <div className="stack">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => guardAttempt(() => void newScramble(), 'Um novo desafio')}
            data-testid="new-challenge"
          >
            <Play aria-hidden="true" /> Novo desafio
          </button>
          {mode === 'speed' && (
            <FieldRow label="Inspeção de 15 s" hint="+2 após 15 s, DNF após 17 s (regras WCA).">
              <Switch label="Inspeção" checked={settings.inspection} onChange={(v) => settings.set('inspection', v)} />
            </FieldRow>
          )}
          <Field label="Início do cronômetro">
            <Segmented
              label="Início do cronômetro"
              value={settings.timerStart}
              onChange={(v) => settings.set('timerStart', v)}
              options={[
                { value: 'firstMove', label: 'Primeiro movimento' },
                { value: 'manual', label: 'Espaço / botão' },
              ]}
            />
          </Field>
          <FieldRow label="Toque duplo inicia" hint="Toque (ou clique) duas vezes na área do cubo.">
            <Switch label="Toque duplo" checked={settings.doubleTapStart} onChange={(v) => settings.set('doubleTapStart', v)} />
          </FieldRow>
          <div className="kpi-grid">
            <div className="kpi">
              <span className="micro">Melhor</span>
              <div className="kpi-value">{summary.best === null ? '—' : formatTime(summary.best)}</div>
            </div>
            <div className="kpi">
              <span className="micro">Ao5</span>
              <div className="kpi-value">{summary.ao5 === null ? '—' : formatTime(summary.ao5)}</div>
            </div>
            <div className="kpi">
              <span className="micro">Ao12</span>
              <div className="kpi-value">{summary.ao12 === null ? '—' : formatTime(summary.ao12)}</div>
            </div>
          </div>
        </div>
      );
    case 'training': {
      const list = ALGORITHMS.filter((a) => algSize === 'all' || a.size === algSize);
      return (
        <div className="stack">
          <p className="hint">
            Escolha um algoritmo: o sistema prepara o caso no cubo e confere cada movimento que você executar. O
            cronômetro inicia no primeiro giro e pode ser pausado com Espaço.
          </p>
          <Segmented
            label="Filtrar por tamanho"
            value={algSize}
            onChange={setAlgSize}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 2, label: '2×2' },
              { value: 3, label: '3×3' },
              { value: 4, label: '4×4' },
            ]}
          />
          <div className="alg-list">
            {list.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`alg-item ${algId === a.id ? 'is-active' : ''}`}
                onClick={() => guardAttempt(() => startTraining(a.id), 'Iniciar o treino')}
                data-testid={`alg-${a.id}`}
              >
                <strong>
                  {a.name} <span className="micro">· {a.group} · {a.size}×{a.size}</span>
                </strong>
                <code>{a.alg}</code>
                <span>{a.description}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'guided':
      return support.available ? (
        <div className="stack">
          <p className="hint">
            O resolvedor calcula a solução do estado atual (ou de um novo embaralhamento) e destaca a próxima camada a
            girar. Você executa cada movimento; desvios são detectados e podem ser desfeitos ou recalculados.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void startGuided()} data-testid="start-guided">
            <Route aria-hidden="true" /> Iniciar resolução guiada
          </button>
        </div>
      ) : (
        <div className="callout is-info">
          <Lock aria-hidden="true" />
          <span>A resolução guiada exige um resolvedor validado e está disponível apenas para 2×2 e 3×3.</span>
        </div>
      );
    case 'fewest':
      return (
        <div className="stack">
          <p className="hint">
            Resolva com o menor número de movimentos. Desfazer remove o movimento da contagem. Ao final, compare com a
            solução calculada pelo computador
            {support.available ? '.' : ' (comparação indisponível para este tamanho).'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => guardAttempt(() => void newScramble(), 'Um novo desafio')}
          >
            <Play aria-hidden="true" /> Novo desafio de movimentos
          </button>
          {reference !== undefined && (
            <div className="callout is-info">
              <Footprints aria-hidden="true" />
              <span>
                {reference === null
                  ? 'Referência do computador indisponível.'
                  : `O computador encontrou uma solução com ${reference} movimentos. Consegue igualar?`}
              </span>
            </div>
          )}
          <div className="kpi-grid">
            <div className="kpi">
              <span className="micro">Menos movimentos</span>
              <div className="kpi-value">{summary.bestMoves ?? '—'}</div>
            </div>
            <div className="kpi">
              <span className="micro">Média</span>
              <div className="kpi-value">{summary.meanMoves === null ? '—' : Math.round(summary.meanMoves)}</div>
            </div>
          </div>
        </div>
      );
    case 'progressive':
      return (
        <div className="stack">
          <p className="hint">
            Cada nível tem um embaralhamento fixo e verificável, do mais simples ao completo. Resolva com até o
            "par" de movimentos para ganhar 3 estrelas.
          </p>
          <div className="level-grid" role="list">
            {LEVELS.map((l) => {
              const unlocked = isLevelUnlocked(size, l.level);
              const result = progress?.[l.level];
              return (
                <button
                  key={l.level}
                  type="button"
                  role="listitem"
                  className={`level ${level === l.level ? 'is-current' : ''}`}
                  disabled={!unlocked}
                  title={unlocked ? `${l.title} · ${l.length} movimento(s) de embaralhamento` : 'Resolva o nível anterior para desbloquear'}
                  onClick={() => guardAttempt(() => void startLevel(l.level), 'Iniciar o nível')}
                  data-testid={`level-${l.level}`}
                >
                  {unlocked ? l.level : <Lock size={14} aria-label="Bloqueado" />}
                  <Stars count={result?.stars ?? 0} />
                </button>
              );
            })}
          </div>
        </div>
      );
  }
}

export function ModesPanel() {
  const mode = useCube((s) => s.mode);
  return (
    <>
      <Panel index="01" title="Modalidades">
        <div className="mode-grid" role="group" aria-label="Modalidades de jogo">
          {MODES.map((m) => {
            const Icon = ICONS[m.id];
            return (
              <button
                key={m.id}
                type="button"
                className="mode-card"
                aria-pressed={mode === m.id}
                onClick={() => guardAttempt(() => setMode(m.id), 'Trocar de modalidade')}
                data-testid={`mode-card-${m.id}`}
              >
                <Icon aria-hidden="true" />
                <strong>{m.name}</strong>
                <span className="micro">{m.timed ? 'Cronometrado' : 'Sem pressão de tempo'}</span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel index="02" title={MODES.find((m) => m.id === mode)!.name}>
        <p className="lead">{MODES.find((m) => m.id === mode)!.description}</p>
        <ModeDetails mode={mode} />
      </Panel>
    </>
  );
}
