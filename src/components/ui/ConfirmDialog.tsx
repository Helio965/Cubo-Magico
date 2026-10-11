import { useUI, ui } from '../../store/uiStore';
import { Modal } from './Modal';

export function ConfirmDialog() {
  const req = useUI((s) => s.confirm);
  if (!req) return null;
  return (
    <Modal
      title={req.title}
      onClose={ui.closeConfirm}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={ui.closeConfirm}>
            Cancelar
          </button>
          <button
            type="button"
            data-autofocus
            className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              ui.closeConfirm();
              req.onConfirm();
            }}
          >
            {req.confirmLabel}
          </button>
        </>
      }
    >
      <p className="lead">{req.message}</p>
    </Modal>
  );
}
