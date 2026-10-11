import { useEffect } from 'react';
import { Dock } from './components/layout/Dock';
import { Header } from './components/layout/Header';
import { IntroOverlay } from './components/layout/IntroOverlay';
import { Sidebar } from './components/layout/Sidebar';
import { Stage } from './components/layout/Stage';
import { CompletionModal } from './components/panels/CompletionModal';
import { ShortcutsModal } from './components/panels/ShortcutsModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Toasts } from './components/ui/Toasts';
import { SettingsDrawer } from './features/settings/SettingsDrawer';
import { StatsModal } from './features/statistics/StatsModal';
import { useKeyboard } from './hooks/useKeyboard';
import { useApplyTheme } from './hooks/useTheme';
import { initAudioBridge, warmSolver } from './store/controller';
import { useCube } from './store/cubeStore';
import { useUI } from './store/uiStore';

export default function App() {
  useApplyTheme();
  useKeyboard();
  const modal = useUI((s) => s.modal);

  useEffect(() => {
    initAudioBridge();
    // Pré-calcula o resolvedor quando o navegador estiver ocioso.
    const start = () => warmSolver(useCube.getState().size);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 2500 });
    else setTimeout(start, 1200);
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#side-body">
        Ir para os controles
      </a>
      <Header />
      <Sidebar />
      <Stage />
      <Dock />
      {modal === 'settings' && <SettingsDrawer />}
      {modal === 'stats' && <StatsModal />}
      {modal === 'shortcuts' && <ShortcutsModal />}
      <CompletionModal />
      <ConfirmDialog />
      <Toasts />
      <IntroOverlay />
    </div>
  );
}
