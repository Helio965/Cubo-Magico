import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className="toast" data-kind={t.kind}>
            <Icon aria-hidden="true" />
            <span>{t.text}</span>
            <button type="button" className="icon-btn" aria-label="Dispensar" onClick={() => dismiss(t.id)}>
              <X aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
