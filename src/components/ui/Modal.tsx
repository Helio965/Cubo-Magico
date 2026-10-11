import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'modal' | 'drawer';
  wide?: boolean;
  hideHeader?: boolean;
  labelledBy?: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/** Diálogo acessível: foco preso, Esc para fechar, retorno de foco ao abrir. */
export function Modal({ title, onClose, children, footer, variant = 'modal', wide, hideHeader }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    // Foca o botão marcado como principal; senão, o próprio diálogo (o leitor de
    // tela anuncia o título e o Tab percorre o conteúdo).
    const preferred = el?.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === 'Tab' && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        if (document.activeElement === el) {
          e.preventDefault();
          (e.shiftKey ? items[items.length - 1] : items[0]).focus();
          return;
        }
        const firstItem = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className={`overlay ${variant === 'drawer' ? 'is-drawer' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={variant === 'drawer' ? 'drawer' : `modal ${wide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        {hideHeader ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <div className="modal-head">
            <h2 id={titleId}>{title}</h2>
            <IconButton icon={X} label="Fechar" shortcut="Esc" onClick={onClose} tipPos="bottom" />
          </div>
        )}
        <div className="modal-body scroll-y">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
