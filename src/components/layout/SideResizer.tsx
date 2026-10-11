import { useEffect, useRef, useState } from 'react';

const KEY = 'cubeforge.sideWidth';
const MIN = 290;
const MAX = 560;

function apply(width: number) {
  document.documentElement.style.setProperty('--side-w', `${width}px`);
}

function readStored(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v >= MIN && v <= MAX ? v : null;
  } catch {
    return null;
  }
}

/** Alça para redimensionar o painel lateral (mouse, toque ou setas do teclado). */
export function SideResizer() {
  const [width, setWidth] = useState<number | null>(() => readStored());
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (width === null) return;
    apply(width);
    try {
      localStorage.setItem(KEY, String(width));
    } catch {
      // preferência apenas visual: ignorar falhas de armazenamento
    }
  }, [width]);

  const current = () => {
    const el = document.querySelector('.side');
    return el ? el.getBoundingClientRect().width : 372;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startW: current() };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const next = Math.round(Math.min(MAX, Math.max(MIN, drag.current.startW + e.clientX - drag.current.startX)));
    setWidth(next);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className="side-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionar painel lateral"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={Math.round(width ?? current())}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => {
        setWidth(null);
        document.documentElement.style.removeProperty('--side-w');
        try {
          localStorage.removeItem(KEY);
        } catch {
          // ignorar
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const base = width ?? current();
          setWidth(Math.min(MAX, Math.max(MIN, base + (e.key === 'ArrowRight' ? 16 : -16))));
        }
      }}
      title="Arraste para redimensionar · duplo clique para restaurar"
    />
  );
}
