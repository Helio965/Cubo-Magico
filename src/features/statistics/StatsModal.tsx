import { Download, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ui } from '../../store/uiStore';
import { MODES, SUPPORTED_SIZES, modeInfo, type GameMode, type Penalty, type SolveRecord } from '../../types/game';
import { formatDate, formatNumber, formatTime } from '../../utils/format';
import { effectiveTime, filterRecords, summarize } from './stats';
import { useStats } from './statsStore';
import { TimesChart } from './TimesChart';

function Kpi({ label, value, highlight, unit }: { label: string; value: string | number; highlight?: boolean; unit?: string }) {
  return (
    <div className={`kpi ${highlight ? 'is-highlight' : ''}`}>
      <span className="micro">{label}</span>
      <div className="kpi-value">{value}</div>
      {unit && <span className="hint">{unit}</span>}
    </div>
  );
}

const t = (v: number | null) => (v === null ? '—' : formatTime(v));

function exportCsv(records: SolveRecord[]) {
  const header = ['data', 'tamanho', 'modalidade', 'tempo_ms', 'penalidade', 'tempo_efetivo', 'movimentos', 'assistida', 'embaralhamento', 'semente'];
  const rows = records.map((r) => [
    new Date(r.date).toISOString(),
    `${r.size}x${r.size}`,
    modeInfo(r.mode).name,
    r.timeMs,
    r.penalty,
    Number.isFinite(effectiveTime(r)) ? formatTime(effectiveTime(r)) : 'DNF',
    r.moves,
    r.assisted ? 'sim' : 'não',
    `"${r.scramble}"`,
    r.seed ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cubeforge-estatisticas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StatsModal() {
  const records = useStats((s) => s.records);
  const setPenalty = useStats((s) => s.setPenalty);
  const removeRecord = useStats((s) => s.removeRecord);
  const clear = useStats((s) => s.clear);
  const [size, setSize] = useState<number | 'all'>(3);
  const [mode, setMode] = useState<GameMode | 'all'>('all');

  const filtered = useMemo(() => filterRecords(records, { size, mode }), [records, size, mode]);
  const s = useMemo(() => summarize(filtered), [filtered]);
  const recent = useMemo(() => [...filtered].sort((a, b) => b.date - a.date), [filtered]);
  const perSize = useMemo(
    () => SUPPORTED_SIZES.map((n) => ({ n, s: summarize(filterRecords(records, { size: n, mode })) })),
    [records, mode],
  );

  return (
    <Modal title="Estatísticas de desempenho" onClose={ui.closeModal} wide>
      <div className="stack">
        <div className="row row-wrap" role="group" aria-label="Filtros">
          <label className="field" style={{ minWidth: 150 }}>
            <span className="micro">Tamanho</span>
            <select className="input" value={size} onChange={(e) => setSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">Todos</option>
              {SUPPORTED_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}×{n}×{n}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 200 }}>
            <span className="micro">Modalidade</span>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as GameMode | 'all')}>
              <option value="all">Todas</option>
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <span className="grow" />
          <button type="button" className="btn btn-sm" disabled={!filtered.length} onClick={() => exportCsv(recent)}>
            <Download aria-hidden="true" /> Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={!filtered.length}
            onClick={() =>
              ui.askConfirm({
                title: 'Apagar registros?',
                message: `Isso remove ${filtered.length} registro(s) do filtro atual deste navegador. A ação não pode ser desfeita.`,
                confirmLabel: 'Apagar',
                danger: true,
                onConfirm: () =>
                  clear({ size: size === 'all' ? undefined : size, mode: mode === 'all' ? undefined : mode }),
              })
            }
          >
            <Trash2 aria-hidden="true" /> Limpar
          </button>
        </div>

        <div className="kpi-grid" data-testid="stats-kpis">
          <Kpi label="Tentativas" value={s.attempts} />
          <Kpi label="Resolvidos" value={s.solved} />
          <Kpi label="Melhor tempo" value={t(s.best)} highlight />
          <Kpi label="Tempo médio" value={t(s.mean)} />
          <Kpi label="Última" value={t(s.last)} />
          <Kpi label="Ao5 atual" value={t(s.ao5)} />
          <Kpi label="Ao12 atual" value={t(s.ao12)} />
          <Kpi label="Melhor Ao5" value={t(s.bestAo5)} />
          <Kpi label="Melhor Ao12" value={t(s.bestAo12)} />
          <Kpi label="Movimentos" value={s.totalMoves} unit="total" />
          <Kpi label="Média mov." value={s.meanMoves === null ? '—' : formatNumber(s.meanMoves, 1)} unit="por resolução" />
          <Kpi label="Velocidade média" value={s.meanTps === null ? '—' : formatNumber(s.meanTps)} unit="movimentos por segundo" />
        </div>
        <p className="hint">
          Ao5 e Ao12 descartam o melhor e o pior resultado (DNF conta como o pior); dois ou mais DNFs tornam a média DNF.
          Tentativas assistidas ({s.assisted}) e DNFs ({s.dnf}) aparecem no histórico, mas não contam como recordes.
        </p>

        <TimesChart records={filtered} />

        {size === 'all' && (
          <div className="kpi-grid">
            {perSize.map(({ n, s: ps }) => (
              <div className="kpi" key={n}>
                <span className="micro">
                  {n}×{n} · {ps.attempts} tent.
                </span>
                <div className="kpi-value">{t(ps.best)}</div>
                <span className="hint">Ao5 {t(ps.ao5)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="table-wrap scroll-y">
          {recent.length === 0 ? (
            <div className="empty">Nenhuma tentativa registrada para este filtro. Complete um desafio cronometrado para começar.</div>
          ) : (
            <table className="history" data-testid="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Cubo</th>
                  <th>Modalidade</th>
                  <th>Tempo</th>
                  <th>Mov.</th>
                  <th>Mov/s</th>
                  <th>Penalidade</th>
                  <th>Embaralhamento</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => {
                  const eff = effectiveTime(r);
                  return (
                    <tr key={r.id}>
                      <td className="num">{recent.length - i}</td>
                      <td>{formatDate(r.date)}</td>
                      <td className="num">
                        {r.size}×{r.size}
                      </td>
                      <td>
                        {modeInfo(r.mode).short}
                        {r.level ? ` · nível ${r.level}` : ''}
                        {r.assisted && <span className="chip is-warning" style={{ marginLeft: 6 }}>assistida</span>}
                      </td>
                      <td className="num">{Number.isFinite(eff) ? formatTime(eff) : 'DNF'}</td>
                      <td className="num">{r.moves}</td>
                      <td className="num">{Number.isFinite(eff) && eff > 0 ? formatNumber(r.moves / (eff / 1000)) : '—'}</td>
                      <td>
                        <select
                          className="input"
                          style={{ height: 30, width: 92 }}
                          value={r.penalty}
                          aria-label="Penalidade"
                          onChange={(e) => setPenalty(r.id, e.target.value as Penalty)}
                        >
                          <option value="none">OK</option>
                          <option value="+2">+2</option>
                          <option value="DNF">DNF</option>
                        </select>
                      </td>
                      <td className="scr" title={r.scramble}>
                        {r.scramble || '—'}
                      </td>
                      <td>
                        <button type="button" className="icon-btn" aria-label="Excluir registro" onClick={() => removeRecord(r.id)}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
