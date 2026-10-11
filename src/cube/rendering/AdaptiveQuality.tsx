import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { visualBus } from '../animations/visualBus';
import { useSettings } from '../../features/settings/settingsStore';
import { useUI } from '../../store/uiStore';
import { downgrade } from './quality';

/**
 * Qualidade automática: mede o tempo de quadro durante as animações (quando
 * a cena renderiza continuamente) e reduz o nível se o desempenho for baixo.
 */
export function AdaptiveQuality() {
  const samples = useRef<number[]>([]);
  const cooldown = useRef(0);
  useFrame((_, delta) => {
    if (useSettings.getState().quality !== 'auto') return;
    if (!visualBus.isBusy()) {
      samples.current.length = 0;
      return;
    }
    if (delta > 0.25) return; // ignora o primeiro quadro após inatividade
    samples.current.push(delta);
    if (samples.current.length < 90) return;
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current.length = 0;
    const now = performance.now();
    if (avg > 1 / 32 && now > cooldown.current) {
      const tier = useUI.getState().autoTier;
      if (tier !== 'low') {
        useUI.setState({ autoTier: downgrade(tier) });
        cooldown.current = now + 8000;
      }
    }
  });
  return null;
}
