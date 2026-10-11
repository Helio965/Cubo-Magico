import { RotateCcw } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Field, FieldRow, Range, Segmented, Switch } from '../../components/ui/controls';
import { FACE_IDS } from '../../engine/state/faces';
import { ui, useUI } from '../../store/uiStore';
import { PROFILES } from '../../cube/rendering/quality';
import { COLOR_PRESETS, useSettings } from './settingsStore';

const FACE_NAMES: Record<string, string> = { U: 'Cima', R: 'Dir.', F: 'Frente', D: 'Baixo', L: 'Esq.', B: 'Trás' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function SettingsDrawer() {
  const s = useSettings();
  const autoTier = useUI((st) => st.autoTier);
  const tierName = { low: 'baixa', medium: 'média', high: 'alta' }[PROFILES[autoTier].tier];

  return (
    <Modal
      title="Configurações"
      onClose={ui.closeModal}
      variant="drawer"
      footer={
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            ui.askConfirm({
              title: 'Restaurar padrões?',
              message: 'Todas as preferências voltarão aos valores iniciais. Estatísticas não são afetadas.',
              confirmLabel: 'Restaurar',
              onConfirm: s.resetAll,
            })
          }
        >
          <RotateCcw aria-hidden="true" /> Restaurar padrões
        </button>
      }
    >
      <section className="settings-section">
        <span className="micro">Cubo</span>
        <Field label="Esquema de cores">
          <div className="preset-row">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset"
                aria-pressed={s.colorPreset === p.id}
                onClick={() => s.applyPreset(p.id)}
              >
                <span className="preset-dots" aria-hidden="true">
                  {FACE_IDS.map((f) => (
                    <i key={f} style={{ background: p.colors[f] }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
            {s.colorPreset === 'custom' && <span className="chip is-accent">Personalizado</span>}
          </div>
        </Field>
        <div className="color-row" style={{ marginTop: 10 }}>
          {FACE_IDS.map((f) => (
            <label key={f} className="color-swatch">
              <input type="color" value={s.colors[f]} onChange={(e) => s.setFaceColor(f, e.target.value)} aria-label={`Cor da face ${FACE_NAMES[f]}`} />
              {FACE_NAMES[f]}
            </label>
          ))}
        </div>
        <Field label="Acabamento">
          <Segmented
            label="Acabamento"
            value={s.finish}
            onChange={(v) => s.set('finish', v)}
            options={[
              { value: 'glossy', label: 'Brilhante' },
              { value: 'satin', label: 'Acetinado' },
              { value: 'matte', label: 'Fosco' },
            ]}
          />
        </Field>
        <Field label="Corpo das peças">
          <Segmented
            label="Corpo das peças"
            value={s.bodyColor}
            onChange={(v) => s.set('bodyColor', v)}
            options={[
              { value: 'black', label: 'Preto' },
              { value: 'graphite', label: 'Grafite' },
              { value: 'white', label: 'Branco' },
            ]}
          />
        </Field>
        <Field label="Intensidade dos reflexos">
          <Range label="Reflexos" value={s.reflections} min={0} max={2} step={0.05} onChange={(v) => s.set('reflections', v)} format={pct} />
        </Field>
        <Field label="Arredondamento">
          <Range label="Arredondamento" value={s.roundness} min={0} max={1} step={0.05} onChange={(v) => s.set('roundness', v)} format={pct} />
        </Field>
        <Field label="Espaçamento entre peças">
          <Range label="Espaçamento" value={s.gap} min={0} max={0.12} step={0.005} onChange={(v) => s.set('gap', v)} format={(v) => v.toFixed(3)} />
        </Field>
      </section>

      <section className="settings-section">
        <span className="micro">Ambiente</span>
        <Field label="Tema">
          <Segmented
            label="Tema"
            value={s.theme}
            onChange={(v) => s.set('theme', v)}
            options={[
              { value: 'dark', label: 'Escuro' },
              { value: 'light', label: 'Claro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
        </Field>
        <Field label="Fundo do palco">
          <Segmented
            label="Fundo"
            value={s.background}
            onChange={(v) => s.set('background', v)}
            options={[
              { value: 'aurora', label: 'Aurora' },
              { value: 'studio', label: 'Estúdio' },
              { value: 'grid', label: 'Grade' },
              { value: 'solid', label: 'Sólido' },
            ]}
          />
        </Field>
        <Field label="Intensidade da iluminação">
          <Range label="Iluminação" value={s.lightIntensity} min={0.3} max={1.8} step={0.05} onChange={(v) => s.set('lightIntensity', v)} format={pct} />
        </Field>
        <FieldRow label="Sombras">
          <Switch label="Sombras" checked={s.shadows} onChange={(v) => s.set('shadows', v)} />
        </FieldRow>
        <FieldRow label="Efeitos visuais" hint="Reflexos de ambiente nas peças.">
          <Switch label="Efeitos visuais" checked={s.effects} onChange={(v) => s.set('effects', v)} />
        </FieldRow>
        <Field label="Qualidade gráfica" hint={s.quality === 'auto' ? `Automática: usando qualidade ${tierName} (ajusta-se ao desempenho do dispositivo).` : undefined}>
          <Segmented
            label="Qualidade gráfica"
            value={s.quality}
            onChange={(v) => s.set('quality', v)}
            options={[
              { value: 'low', label: 'Baixa' },
              { value: 'medium', label: 'Média' },
              { value: 'high', label: 'Alta' },
              { value: 'auto', label: 'Automática' },
            ]}
          />
        </Field>
      </section>

      <section className="settings-section">
        <span className="micro">Animações</span>
        <Field label="Duração do giro">
          <Range label="Duração do giro" value={s.turnDurationMs} min={40} max={600} step={10} onChange={(v) => s.set('turnDurationMs', v)} format={(v) => `${v} ms`} />
        </Field>
        <Field label="Suavidade">
          <Segmented
            label="Suavidade"
            value={s.easing}
            onChange={(v) => s.set('easing', v)}
            options={[
              { value: 'smooth', label: 'Suave' },
              { value: 'snappy', label: 'Ágil' },
              { value: 'elastic', label: 'Elástica' },
              { value: 'linear', label: 'Linear' },
            ]}
          />
        </Field>
        <Field label="Movimento reduzido" hint="Desativa transições e anima giros instantaneamente.">
          <Segmented
            label="Movimento reduzido"
            value={s.motion}
            onChange={(v) => s.set('motion', v)}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'reduce', label: 'Reduzir' },
              { value: 'full', label: 'Completo' },
            ]}
          />
        </Field>
        <FieldRow label="Animação de abertura">
          <Switch label="Animação de abertura" checked={s.showIntro} onChange={(v) => s.set('showIntro', v)} />
        </FieldRow>
      </section>

      <section className="settings-section">
        <span className="micro">Câmera e interação</span>
        <Field label="Interação por arraste">
          <Segmented
            label="Interação"
            value={s.interactionMode}
            onChange={(v) => s.set('interactionMode', v)}
            options={[
              { value: 'auto', label: 'Automática' },
              { value: 'camera', label: 'Câmera' },
              { value: 'cube', label: 'Cubo' },
            ]}
          />
        </Field>
        <Field label="Sensibilidade da rotação">
          <Range label="Sensibilidade" value={s.cameraSensitivity} min={0.3} max={2.5} step={0.05} onChange={(v) => s.set('cameraSensitivity', v)} format={(v) => `${v.toFixed(2)}×`} />
        </Field>
        <Field label="Velocidade do zoom">
          <Range label="Zoom" value={s.zoomSpeed} min={0.3} max={2.5} step={0.05} onChange={(v) => s.set('zoomSpeed', v)} format={(v) => `${v.toFixed(2)}×`} />
        </Field>
        <Field label="Posição inicial">
          <Segmented
            label="Posição inicial da câmera"
            value={s.cameraPreset}
            onChange={(v) => s.set('cameraPreset', v)}
            options={[
              { value: 'iso', label: 'Isométrica' },
              { value: 'front', label: 'Frontal' },
              { value: 'top', label: 'Superior' },
            ]}
          />
        </Field>
        <FieldRow label="Destacar próximo movimento" hint="Na resolução guiada e no treino.">
          <Switch label="Destacar próximo movimento" checked={s.showHints} onChange={(v) => s.set('showHints', v)} />
        </FieldRow>
      </section>

      <section className="settings-section">
        <span className="micro">Áudio</span>
        <FieldRow label="Efeitos sonoros">
          <Switch label="Efeitos sonoros" checked={s.sound} onChange={(v) => s.set('sound', v)} />
        </FieldRow>
        <FieldRow label="Som de movimentação">
          <Switch label="Som de movimentação" checked={s.moveSound} disabled={!s.sound} onChange={(v) => s.set('moveSound', v)} />
        </FieldRow>
        <FieldRow label="Som de conclusão">
          <Switch label="Som de conclusão" checked={s.completeSound} disabled={!s.sound} onChange={(v) => s.set('completeSound', v)} />
        </FieldRow>
        <Field label="Volume">
          <Range label="Volume" value={s.volume} min={0} max={1} step={0.05} onChange={(v) => s.set('volume', v)} format={pct} />
        </Field>
      </section>

      <section className="settings-section">
        <span className="micro">Cronômetro</span>
        <FieldRow label="Inspeção de 15 s (Speedcubing)" hint="+2 após 15 s; DNF após 17 s.">
          <Switch label="Inspeção" checked={s.inspection} onChange={(v) => s.set('inspection', v)} />
        </FieldRow>
        <Field label="Iniciar tentativa por">
          <Segmented
            label="Iniciar por"
            value={s.timerStart}
            onChange={(v) => s.set('timerStart', v)}
            options={[
              { value: 'firstMove', label: 'Primeiro movimento' },
              { value: 'manual', label: 'Espaço / botão' },
            ]}
          />
        </Field>
        <Field label="Precisão exibida">
          <Segmented
            label="Precisão do cronômetro"
            value={s.timerDigits}
            onChange={(v) => s.set('timerDigits', v)}
            options={[
              { value: 3, label: 'Milésimos (0.000)' },
              { value: 2, label: 'Centésimos (0.00)' },
            ]}
          />
        </Field>
        <FieldRow label="Toque duplo no cubo inicia">
          <Switch label="Toque duplo" checked={s.doubleTapStart} onChange={(v) => s.set('doubleTapStart', v)} />
        </FieldRow>
      </section>
    </Modal>
  );
}
