import { useMemo } from 'react';
import { getFacelets } from '../engine/state/cube';
import { FACE_IDS } from '../engine/state/faces';
import { useSettings } from '../features/settings/settingsStore';
import { useCube } from '../store/cubeStore';

/** Posição de cada face (U R F D L B) na planificação em cruz (coluna, linha). */
const LAYOUT: [number, number][] = [
  [1, 0], // U
  [2, 1], // R
  [1, 1], // F
  [1, 2], // D
  [0, 1], // L
  [3, 1], // B
];

/**
 * Planificação 2D do estado lógico: útil como visão alternativa, para
 * acessibilidade e como modo de compatibilidade sem WebGL.
 */
export function CubeNet({ cell = 10, className = '' }: { cell?: number; className?: string }) {
  const state = useCube((s) => s.state);
  const colors = useSettings((s) => s.colors);
  const n = state.n;
  const facelets = useMemo(() => getFacelets(state), [state]);
  const gap = cell * 0.12;
  const faceSize = n * cell + gap * 2;
  const margin = cell * 0.4;
  const width = faceSize * 4 + margin * 3;
  const height = faceSize * 3 + margin * 2;
  const palette = FACE_IDS.map((f) => colors[f]);
  const names = ['Cima', 'Direita', 'Frente', 'Baixo', 'Esquerda', 'Trás'];
  return (
    <svg
      className={`net ${className}`}
      width={width + cell}
      height={height + cell}
      viewBox={`${-cell / 2} ${-cell / 2} ${width + cell} ${height + cell}`}
      role="img"
      aria-label="Planificação das seis faces do cubo"
    >
      {LAYOUT.map(([col, row], face) => {
        const ox = col * (faceSize + margin);
        const oy = row * (faceSize + margin);
        return (
          <g key={face} transform={`translate(${ox} ${oy})`}>
            <title>{names[face]}</title>
            <rect width={faceSize} height={faceSize} rx={cell * 0.3} fill="rgba(0,0,0,0.55)" />
            {Array.from({ length: n * n }, (_, k) => {
              const r = Math.floor(k / n);
              const c = k % n;
              return (
                <rect
                  key={k}
                  className="sticker"
                  x={gap + c * cell + cell * 0.06}
                  y={gap + r * cell + cell * 0.06}
                  width={cell * 0.88}
                  height={cell * 0.88}
                  rx={cell * 0.18}
                  fill={palette[facelets[face * n * n + k]]}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
