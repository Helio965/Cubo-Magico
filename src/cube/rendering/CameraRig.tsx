import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { prefersReducedMotion, useSettings, type CameraPreset } from '../../features/settings/settingsStore';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { fitDistance } from './framing';
import { usePlayer } from '../../features/player/playerStore';

const PRESETS: Record<CameraPreset, Vector3> = {
  iso: new Vector3(0.82, 0.72, 1).normalize(),
  front: new Vector3(0.18, 0.3, 1).normalize(),
  top: new Vector3(0.45, 1.35, 0.85).normalize(),
};


export function CameraRig({ spacing }: { spacing: number }) {
  const n = useCube((s) => s.size);
  const { camera, size, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const preset = useSettings((s) => s.cameraPreset);
  const sensitivity = useSettings((s) => s.cameraSensitivity);
  const zoomSpeed = useSettings((s) => s.zoomSpeed);
  const mode = useSettings((s) => s.interactionMode);
  const resetToken = useUI((s) => s.cameraResetToken);
  const anim = useRef<{ from: Vector3; to: Vector3; t: number } | null>(null);
  const aspect = size.width / Math.max(1, size.height);
  const fov = (camera as PerspectiveCamera).fov ?? 35;
  const distance = fitDistance(n, spacing, fov, aspect);
  const cubeRadius = ((n * spacing) / 2) * Math.sqrt(3);
  const minDistance = Math.max(distance * 0.55, cubeRadius + 0.9);

  // Enquadramento inicial e redefinição animada da câmera.
  const first = useRef(true);
  useEffect(() => {
    const to = PRESETS[preset].clone().multiplyScalar(distance);
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      camera.position.copy(to);
      camera.lookAt(0, 0, 0);
      controls.current?.target.set(0, 0, 0);
      controls.current?.update();
      invalidate();
      return;
    }
    anim.current = { from: camera.position.clone(), to, t: 0 };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, preset, n]);

  // Desloca a projeção levemente para baixo, abrindo espaço para o cronômetro
  // no topo do palco sem alterar o centro de órbita.
  // Com o reprodutor aberto (parte inferior do palco), o cubo sobe.
  const playerActive = usePlayer((s) => s.active);
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const shift = playerActive ? size.height * (size.width < 900 ? 0.16 : 0.11) : -size.height * 0.045;
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate, playerActive]);

  // Reenquadra quando o palco muda de tamanho (ex.: painel aberto no celular),
  // preservando o zoom relativo escolhido pelo usuário.
  const lastDistance = useRef(distance);
  useEffect(() => {
    const prev = lastDistance.current;
    lastDistance.current = distance;
    if (anim.current || Math.abs(prev - distance) < 1e-3) return;
    const len = camera.position.length() * (distance / prev);
    camera.position.setLength(Math.max(minDistance, len));
    controls.current?.update();
    invalidate();
  }, [distance, minDistance, camera, invalidate]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + Math.min(delta, 1 / 30) / 0.7);
    const e = 1 - Math.pow(1 - a.t, 3);
    // Interpolação esférica: preserva a distância ao centro durante o movimento.
    const dir = a.from.clone().normalize().lerp(a.to.clone().normalize(), e).normalize();
    const len = MathUtils.lerp(a.from.length(), a.to.length(), e);
    camera.position.copy(dir.multiplyScalar(len));
    camera.lookAt(0, 0, 0);
    if (controls.current) {
      controls.current.target.set(0, 0, 0);
      controls.current.update();
    }
    if (a.t >= 1) anim.current = null;
    invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.75 * sensitivity}
      zoomSpeed={0.8 * zoomSpeed}
      enableRotate={mode !== 'cube'}
      minDistance={minDistance}
      maxDistance={distance * 2.6}
      target={[0, 0, 0]}
    />
  );
}
