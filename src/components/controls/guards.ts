import { attemptInProgress, isCompetitiveMode } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { ui } from '../../store/uiStore';

/**
 * Executa uma ação que interromperia uma tentativa competitiva em andamento,
 * pedindo confirmação antes (a tentativa será registrada como DNF).
 */
export function guardAttempt(action: () => void, what: string): void {
  if (attemptInProgress() && isCompetitiveMode(useCube.getState().mode)) {
    ui.askConfirm({
      title: 'Abandonar a tentativa?',
      message: `${what} interrompe a tentativa em andamento, que será registrada como DNF (não concluída).`,
      confirmLabel: 'Abandonar e continuar',
      danger: true,
      onConfirm: action,
    });
    return;
  }
  action();
}

export function isFullscreenSupported(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Alguns navegadores (ex.: iOS) não permitem tela cheia para páginas.
  }
}
