import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SolveRecord } from '../../types/game';
import { formatTime } from '../../utils/format';
import { averageOf, effectiveTime } from './stats';
import { niceStep, tickLabel } from './chartScale';

interface Point {
  i: number;
  record: SolveRecord;
  time: number; // efetivo (infinito para DNF)
  ao5: number | null;
}

const H = 230;

const PAD = { top: 18, right: 18, bottom: 26, left: 52 };


/**
 * Evolução dos tempos: cada tentativa como ponto (série 1) e a média Ao5
 * móvel como linha (série 2). DNFs aparecem como marcas no topo.
 */
export function TimesChart({ records }: { records: SolveRecord[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points: Point[] = useMemo(() => {
    const ordered = [...records].sort((a, b) => a.date - b.date).slice(-100);
    const times = ordered.map(effectiveTime);
    return ordered.map((record, i) => ({
      i,
      record,
      time: times[i],
      ao5: i >= 4 ? averageOf(times.slice(i - 4, i + 1), 5) : null,
    }));
  }, [records]);

  const finite = points.map((p) => p.time).filter(Number.isFinite);
  if (finite.length < 2) {
    return <div className="empty">Registre pelo menos duas tentativas válidas para ver a evolução do desempenho.</div>;
  }

  const minT = Math.min(...finite);
  const maxT = Math.max(...finite);
  const step = niceStep(Math.max(1000, maxT - minT), 4);
  const y0 = Math.max(0, Math.floor((minT - step * 0.5) / step) * step);
  const y1 = Math.ceil((maxT + step * 0.3) / step) * step;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const inset = 14; // afasta os pontos extremos dos eixos
  const x = (i: number) =>
    PAD.left + inset + (points.length === 1 ? (innerW - inset * 2) / 2 : (i / (points.length - 1)) * (innerW - inset * 2));
  const y = (t: number) => PAD.top + innerH - ((t - y0) / (y1 - y0)) * innerH;
  const ticks: number[] = [];
  for (let t = y0; t <= y1 + 1; t += step) ticks.push(t);

  const ao5Path = points
    .filter((p) => p.ao5 !== null && Number.isFinite(p.ao5))
    .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.ao5!).toFixed(1)}`)
    .join(' ');
  const best = points.reduce<Point | null>((b, p) => (Number.isFinite(p.time) && (!b || p.time < b.time) ? p : b), null);
  const hovered = hover === null ? null : points[hover];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    const i = Math.round(rel * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div className="chart-wrap">
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="swatch-dot" style={{ background: 'var(--series-1)', marginRight: 6 }} />
          Tempo de cada tentativa
        </span>
        <span>
          <i style={{ background: 'var(--series-2)' }} />
          Média Ao5
        </span>
        <span>
          <i style={{ background: 'var(--text-3)', height: 8, width: 2 }} />
          DNF
        </span>
      </div>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          className="chart chart-svg"
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={`Evolução de ${points.length} tentativas. Melhor tempo ${best ? formatTime(best.time) : '—'}.`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end">
                {tickLabel(t, step)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 6}>
            #1
          </text>
          <text x={width - PAD.right} y={H - 6} textAnchor="end">
            #{points.length}
          </text>
          {ao5Path && (
            <path d={ao5Path} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {points.map((p) =>
            Number.isFinite(p.time) ? (
              <circle
                key={p.i}
                cx={x(p.i)}
                cy={y(p.time)}
                r={hover === p.i ? 5.5 : 4}
                fill="var(--series-1)"
                stroke="var(--surface-solid)"
                strokeWidth={2}
                opacity={p.record.assisted ? 0.4 : 1}
              />
            ) : (
              <line key={p.i} x1={x(p.i)} x2={x(p.i)} y1={PAD.top - 6} y2={PAD.top + 4} stroke="var(--text-3)" strokeWidth={2} strokeLinecap="round" />
            ),
          )}
          {best && (
            <text
              className="label-strong"
              x={x(best.i) + (best.i < points.length / 2 ? 10 : -10)}
              y={y(best.time) < PAD.top + 24 ? y(best.time) + 16 : y(best.time) - 10}
              textAnchor={best.i < points.length / 2 ? 'start' : 'end'}
            >
              Melhor {formatTime(best.time)}
            </text>
          )}
          {hovered && (
            <line className="grid" x1={x(hovered.i)} x2={x(hovered.i)} y1={PAD.top} y2={H - PAD.bottom} style={{ stroke: 'var(--line-strong)' }} />
          )}
          <rect
            x={PAD.left - 6}
            y={0}
            width={innerW + 12}
            height={H}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hovered && (
          <div className="chart-tooltip" style={{ left: x(hovered.i), top: Number.isFinite(hovered.time) ? y(hovered.time) : PAD.top }}>
            <div className="micro" style={{ marginBottom: 4 }}>
              Tentativa #{hovered.i + 1}
              {hovered.record.assisted ? ' · assistida' : ''}
            </div>
            <div className="tt-row">
              <span>
                <i className="swatch-dot" style={{ background: 'var(--series-1)' }} />
                Tempo
              </span>
              <b>{Number.isFinite(hovered.time) ? formatTime(hovered.time) : 'DNF'}</b>
            </div>
            <div className="tt-row">
              <span>
                <i className="swatch-line" style={{ background: 'var(--series-2)' }} />
                Ao5
              </span>
              <b>{hovered.ao5 === null ? '—' : formatTime(hovered.ao5)}</b>
            </div>
            <div className="tt-row">
              <span>Movimentos</span>
              <b>{hovered.record.moves}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
