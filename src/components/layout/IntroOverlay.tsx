import { useEffect, useState } from 'react';
import { prefersReducedMotion, useSettings } from '../../features/settings/settingsStore';
import { LogoMark } from '../ui/Logo';

/** Abertura discreta com a marca. Opcional e ignorada com movimento reduzido. */
export function IntroOverlay() {
  const [visible, setVisible] = useState(() => useSettings.getState().showIntro && !prefersReducedMotion());
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), 2150);
    return () => clearTimeout(id);
  }, [visible]);
  if (!visible) return null;
  return (
    <div className="intro" onClick={() => setVisible(false)} role="presentation" aria-hidden="true">
      <div className="intro-inner">
        <LogoMark className="intro-mark" />
        <div className="intro-name">
          Cube<em>Forge</em> 3D
        </div>
        <div className="intro-line" />
        <span className="micro">Simulador de precisão</span>
      </div>
    </div>
  );
}
