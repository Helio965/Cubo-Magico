import { Crosshair, Grid3x3, Hand, Pointer, Rotate3d } from 'lucide-react';
import { useSettings, type InteractionMode } from '../../features/settings/settingsStore';
import { ui } from '../../store/uiStore';
import { IconButton } from '../ui/IconButton';

const MODES: { id: InteractionMode; label: string; icon: typeof Hand }[] = [
  { id: 'auto', label: 'Automático: arraste no cubo gira camadas; fora dele, a câmera', icon: Pointer },
  { id: 'camera', label: 'Modo câmera: arrastar apenas gira a visão', icon: Rotate3d },
  { id: 'cube', label: 'Modo cubo: arrastar apenas gira camadas (câmera travada)', icon: Hand },
];

export function ViewControls() {
  const mode = useSettings((s) => s.interactionMode);
  const showNet = useSettings((s) => s.showNet);
  const set = useSettings((s) => s.set);
  return (
    <div className="toolbar glass" role="toolbar" aria-label="Controles de visualização">
      {MODES.map((m) => (
        <IconButton
          key={m.id}
          icon={m.icon}
          label={m.label}
          pressed={mode === m.id}
          tipPos="bottom"
          onClick={() => set('interactionMode', m.id)}
          data-testid={`mode-${m.id}`}
        />
      ))}
      <span className="toolbar-sep" aria-hidden="true" />
      <IconButton icon={Grid3x3} label="Planificação 2D" pressed={showNet} tipPos="bottom" onClick={() => set('showNet', !showNet)} />
      <IconButton icon={Crosshair} label="Redefinir câmera" shortcut="C" tipPos="bottom" className="view-extra" onClick={ui.resetCamera} />
    </div>
  );
}
