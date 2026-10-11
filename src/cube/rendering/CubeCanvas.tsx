import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { prefersReducedMotion, useSettings } from '../../features/settings/settingsStore';
import { useResolvedTheme } from '../../hooks/useTheme';
import { timerAction } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { AdaptiveQuality } from './AdaptiveQuality';
import { CameraRig } from './CameraRig';
import { CubeModel } from './CubeModel';
import { Lights } from './Lights';
import { PROFILES, resolveTier } from './quality';

export default function CubeCanvas() {
  const n = useCube((s) => s.size);
  const quality = useSettings((s) => s.quality);
  const gap = useSettings((s) => s.gap);
  const showIntro = useSettings((s) => s.showIntro);
  const doubleTapStart = useSettings((s) => s.doubleTapStart);
  const autoTier = useUI((s) => s.autoTier);
  const contextLost = useUI((s) => s.contextLost);
  const theme = useResolvedTheme();
  const profile = PROFILES[resolveTier(quality, autoTier)];
  const spacing = 1 + gap;
  const [intro] = useState(() => showIntro && !prefersReducedMotion() && !useUI.getState().introDone);

  useEffect(() => {
    if (!intro) useUI.setState({ introDone: true });
  }, [intro]);

  // Toque duplo (ou clique duplo) na área do cubo inicia o cronômetro.
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const downAt = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    downAt.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = downAt.current;
    downAt.current = null;
    if (!doubleTapStart || !d) return;
    const now = performance.now();
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > 10 || now - d.t > 300) {
      lastTap.current = null;
      return;
    }
    const prev = lastTap.current;
    if (prev && now - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
      lastTap.current = null;
      timerAction();
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };

  return (
    <div className="viewport-canvas" onPointerDown={onPointerDown} onPointerUp={onPointerUp} data-testid="cube-canvas">
      <Canvas
        key={profile.antialias ? 'aa' : 'no-aa'}
        frameloop="demand"
        dpr={profile.dpr}
        shadows={profile.shadowMaps}
        camera={{ fov: 35, near: 0.1, far: 200, position: [6, 5, 8] }}
        gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.setClearColor(0x000000, 0);
          const canvas = gl.domElement;
          canvas.setAttribute('aria-label', 'Cubo mágico 3D interativo');
          canvas.setAttribute('role', 'img');
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            useUI.setState({ contextLost: true });
          });
          canvas.addEventListener('webglcontextrestored', () => useUI.setState({ contextLost: false }));
        }}
      >
        <Lights profile={profile} n={n} spacing={spacing} dark={theme === 'dark'} />
        <CubeModel key={n} profile={profile} spacing={spacing} intro={intro} />
        <CameraRig spacing={spacing} />
        <AdaptiveQuality />
      </Canvas>
      {contextLost && (
        <div className="viewport-message" role="alert">
          <strong>O contexto gráfico foi perdido.</strong>
          <span>Isso pode acontecer quando o dispositivo libera memória de vídeo. Aguarde a recuperação ou recarregue a página.</span>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      )}
    </div>
  );
}
