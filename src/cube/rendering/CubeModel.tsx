import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Group,
  Matrix4,
  Mesh,
  Plane,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ROTATIONS, type Axis } from '../../engine/math/rotations';
import { toPrimitive, type PrimitiveMove } from '../../engine/moves/notation';
import { applyPrimitive, piecesInLayers, type CubeState } from '../../engine/state/cube';
import { FACE_NORMALS } from '../../engine/state/faces';
import { getLayout } from '../../engine/state/layout';
import { prefersReducedMotion, useSettings, type Easing } from '../../features/settings/settingsStore';
import { usePlayer } from '../../features/player/playerStore';
import { performMove } from '../../store/controller';
import { useCube } from '../../store/cubeStore';
import { useUI } from '../../store/uiStore';
import { visualBus } from '../animations/visualBus';
import { createBodyGeometry, createStickerGeometry } from '../geometry/pieceGeometry';
import { dragToTurn, layerTurnToMove, snapToAxis, type DragTurn, type SignedAxis } from '../interaction/drag';
import { createMaterials } from '../materials/materials';
import type { QualityProfile } from './quality';

/** Quatérnios das 24 orientações possíveis de uma peça. */
const ORIENTATION_QUATS: Quaternion[] = ROTATIONS.map((m) =>
  new Quaternion().setFromRotationMatrix(
    new Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1),
  ),
);

const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
const HALF_PI = Math.PI / 2;

/** Rotação local que leva o adesivo (voltado para +Z) até a normal de cada face. */
const STICKER_ROTATIONS: [number, number, number][] = [
  [-HALF_PI, 0, 0], // U
  [0, HALF_PI, 0], // R
  [0, 0, 0], // F
  [HALF_PI, 0, 0], // D
  [0, -HALF_PI, 0], // L
  [0, Math.PI, 0], // B
];

const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  snappy: (t) => 1 - Math.pow(1 - t, 4),
  elastic: (t) => {
    const c1 = 1.25;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

interface QueueItem {
  move: Parameters<typeof toPrimitive>[0];
  durationScale: number;
  fromAngle?: number;
}

interface ActiveTurn {
  prim: PrimitiveMove;
  pieces: number[];
  from: number;
  to: number;
  elapsed: number;
  duration: number;
  commit: boolean;
}

interface DragState {
  pointerId: number;
  piece: number;
  normal: SignedAxis;
  plane: Plane;
  start: Vector3;
  startClient: Vector2;
  turn: DragTurn | null;
  layer: number;
  pieces: number[];
  angle: number;
  samples: { t: number; a: number }[];
}

export interface CubeModelProps {
  profile: QualityProfile;
  spacing: number;
  intro: boolean;
}

export function CubeModel({ profile, spacing, intro }: CubeModelProps) {
  const n = useCube((s) => s.size);
  const layout = getLayout(n);
  const settings = useSettings();
  const { roundness, colors, finish, bodyColor, reflections, interactionMode } = settings;
  const { camera, gl, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const rootRef = useRef<Group>(null);
  const pieceRefs = useRef<(Group | null)[]>([]);
  const bodyRefs = useRef<(Mesh | null)[]>([]);
  const stickerRefs = useRef<(Mesh | null)[][]>([]);
  const displayRef = useRef<CubeState>(useCube.getState().state);
  const queueRef = useRef<QueueItem[]>([]);
  const activeRef = useRef<ActiveTurn | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingDragAngle = useRef<{ axis: Axis; layer: number; angle: number } | null>(null);
  const introRef = useRef<{ t: number; duration: number } | null>(intro ? { t: 0, duration: 1.9 } : null);
  const spacingRef = useRef(spacing);
  spacingRef.current = spacing;

  const geometry = useMemo(
    () => ({
      body: createBodyGeometry({ roundness, segments: profile.segments, bevel: profile.bevel }),
      sticker: createStickerGeometry({ roundness, segments: profile.segments, bevel: profile.bevel }),
    }),
    [roundness, profile.segments, profile.bevel],
  );
  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.sticker.dispose();
    },
    [geometry],
  );

  const materials = useMemo(
    () => createMaterials({ colors, finish, bodyColor, reflections }),
    [colors, finish, bodyColor, reflections],
  );
  useEffect(() => () => materials.dispose(), [materials]);

  // ---------- Transformações ----------

  const tmpQ = useRef(new Quaternion()).current;
  const tmpV = useRef(new Vector3()).current;

  const placePiece = (i: number, state: CubeState, layerQuat?: Quaternion) => {
    const g = pieceRefs.current[i];
    if (!g) return;
    const half = spacingRef.current / 2;
    tmpV.set(state.pos[i * 3] * half, state.pos[i * 3 + 1] * half, state.pos[i * 3 + 2] * half);
    g.quaternion.copy(ORIENTATION_QUATS[state.ori[i]]);
    if (layerQuat) {
      tmpV.applyQuaternion(layerQuat);
      g.quaternion.premultiply(layerQuat);
    }
    g.position.copy(tmpV);
  };

  const placeAll = (state: CubeState) => {
    for (let i = 0; i < layout.count; i++) placePiece(i, state);
  };

  const setLayerAngle = (pieces: number[], axis: Axis, angle: number) => {
    tmpQ.setFromAxisAngle(AXES[axis], angle);
    const state = displayRef.current;
    for (const i of pieces) placePiece(i, state, tmpQ);
  };

  // Reposiciona tudo quando o espaçamento muda.
  useEffect(() => {
    placeAll(displayRef.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacing, layout]);

  // ---------- Conexão com o estado lógico ----------

  useEffect(() => {
    displayRef.current = useCube.getState().state;
    placeAll(displayRef.current);
    visualBus.setInspector(() => displayRef.current);
    const detach = visualBus.attach((cmd) => {
      if (cmd.kind === 'snap') {
        if (cmd.state.n !== n) return;
        queueRef.current = [];
        activeRef.current = null;
        if (dragRef.current) latest.current?.end(false);
        displayRef.current = cmd.state;
        placeAll(cmd.state);
        visualBus.setBusy(false);
      } else {
        const item: QueueItem = { move: cmd.move, durationScale: cmd.durationScale };
        const pending = pendingDragAngle.current;
        if (pending) {
          const prim = toPrimitive(cmd.move, n);
          if (prim.axis === pending.axis && prim.layers.length === 1 && prim.layers[0] === pending.layer) {
            item.fromAngle = pending.angle;
          }
          pendingDragAngle.current = null;
        }
        queueRef.current.push(item);
        visualBus.setBusy(true);
      }
      invalidate();
    });
    return () => {
      detach();
      visualBus.setInspector(null);
      queueRef.current = [];
      activeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // ---------- Destaques (tutoriais e resolução guiada) ----------

  const highlight = useUI((s) => s.highlight);
  const nextMove = usePlayer((s) =>
    s.active && s.expectUser && s.status === 'ready' && s.offPath.length === 0 ? s.moves[s.index] : undefined,
  );
  const logical = useCube((s) => s.state);
  const showHints = settings.showHints;

  useEffect(() => {
    const glow = new Set<number>();
    if (nextMove && showHints) {
      try {
        for (const i of piecesInLayers(logical, toPrimitive(nextMove, n))) glow.add(i);
      } catch {
        // movimento incompatível: sem destaque
      }
    }
    for (let i = 0; i < layout.count; i++) {
      const dim = highlight !== null && !highlight.includes(layout.kinds[i]);
      const body = bodyRefs.current[i];
      if (body) body.material = glow.has(i) ? materials.bodyGlow : dim ? materials.bodyDim : materials.body;
      const stickers = stickerRefs.current[i] ?? [];
      layout.stickers[i].forEach((face, k) => {
        const m = stickers[k];
        if (m) m.material = dim ? materials.stickersDim[face] : materials.stickers[face];
      });
    }
    invalidate();
  }, [highlight, nextMove, logical, materials, layout, n, showHints, invalidate]);

  // ---------- Animação ----------

  // Com frameloop "demand", o primeiro quadro após um período ocioso recebe um
  // delta enorme; nesse caso usamos 1/60 s. Nos demais, o tempo real (limitado),
  // para que as animações durem o mesmo em dispositivos lentos.
  const wasAnimating = useRef(false);
  useFrame((_, rawDelta) => {
    const delta = wasAnimating.current ? Math.min(rawDelta, 0.1) : Math.min(rawDelta, 1 / 60);
    const root = rootRef.current;
    const introState = introRef.current;
    if (root && introState) {
      introState.t += delta;
      const t = Math.min(1, introState.t / introState.duration);
      const e = 1 - Math.pow(1 - t, 3);
      root.scale.setScalar(0.55 + 0.45 * e);
      root.rotation.set((1 - e) * 0.5, (1 - e) * -Math.PI * 1.25, 0);
      root.position.y = (1 - e) * -0.6;
      if (t >= 1) {
        introRef.current = null;
        root.scale.setScalar(1);
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        useUI.setState({ introDone: true });
      }
      invalidate();
    }

    let active = activeRef.current;
    if (!active && queueRef.current.length > 6 && !dragRef.current) {
      // Fila muito longa (comandos muito rápidos ou dispositivo lento): aplica os
      // giros excedentes sem animação, preservando a ordem e o estado exato.
      while (queueRef.current.length > 2) {
        const skipped = queueRef.current.shift()!;
        displayRef.current = applyPrimitive(displayRef.current, toPrimitive(skipped.move, n));
        visualBus.emitTurn(skipped.move);
      }
      placeAll(displayRef.current);
    }
    if (!active && queueRef.current.length > 0 && !dragRef.current) {
      const item = queueRef.current.shift()!;
      const prim = toPrimitive(item.move, n);
      const pieces = piecesInLayers(displayRef.current, prim);
      const to = prim.qt * HALF_PI;
      const from = item.fromAngle ?? 0;
      const reduced = prefersReducedMotion(useSettings.getState().motion);
      const base = (useSettings.getState().turnDurationMs / 1000) * item.durationScale * (Math.abs(prim.qt) === 2 ? 1.45 : 1);
      // Fila longa (comandos rápidos): acelera para acompanhar, sem afetar o estado lógico.
      const backlog = queueRef.current.length;
      const catchUp = backlog > 1 ? Math.max(0.2, 1 / (1 + (backlog - 1) * 0.45)) : 1;
      const remaining = Math.abs(to) > 0 ? Math.abs(to - from) / Math.abs(to) : 1;
      active = {
        prim,
        pieces,
        from,
        to,
        elapsed: 0,
        duration: reduced ? 0 : base * catchUp * remaining,
        commit: true,
      };
      activeRef.current = active;
      visualBus.emitTurn(item.move);
    }

    if (active) {
      active.elapsed += delta;
      const t = active.duration <= 0 ? 1 : Math.min(1, active.elapsed / active.duration);
      const easing = EASINGS[useSettings.getState().easing] ?? EASINGS.smooth;
      const angle = active.from + (active.to - active.from) * easing(t);
      setLayerAngle(active.pieces, active.prim.axis, angle);
      if (t >= 1) {
        if (active.commit) displayRef.current = applyPrimitive(displayRef.current, active.prim);
        for (const i of active.pieces) placePiece(i, displayRef.current);
        activeRef.current = null;
        if (queueRef.current.length === 0 && !dragRef.current) visualBus.setBusy(false);
      }
      invalidate();
    }
    wasAnimating.current = !!(introRef.current || activeRef.current || queueRef.current.length);
  });

  // ---------- Giro por arrasto (mouse e toque) ----------

  const latest = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    cancel: (e: PointerEvent) => void;
    end: (commit: boolean) => void;
  } | null>(null);
  const stable = useMemo(
    () => ({
      move: (e: PointerEvent) => latest.current?.move(e),
      up: (e: PointerEvent) => latest.current?.up(e),
      cancel: (e: PointerEvent) => latest.current?.cancel(e),
    }),
    [],
  );
  const raycaster = useRef(new Raycaster()).current;
  const ndc = useRef(new Vector2()).current;

  const pointerToPlane = (clientX: number, clientY: number, plane: Plane, out: Vector3) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(plane, out);
  };

  const restoreControls = () => {
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  function endDrag(commit: boolean) {
    const drag = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', stable.move);
    window.removeEventListener('pointerup', stable.up);
    window.removeEventListener('pointercancel', stable.cancel);
    restoreControls();
    if (useCube.getState().lock === 'drag') useCube.setState({ lock: null });
    if (!drag || !drag.turn) return;
    const { axis } = drag.turn;
    let quarter = Math.round(drag.angle / HALF_PI);
    // Gesto rápido ("flick") conta como um quarto de volta.
    const s = drag.samples;
    if (quarter === 0 && s.length >= 2) {
      const a = s[s.length - 1];
      const b = s[Math.max(0, s.length - 5)];
      const velocity = (a.a - b.a) / Math.max(1e-3, (a.t - b.t) / 1000);
      if (Math.abs(velocity) > 2.2 && Math.abs(drag.angle) > 0.12) quarter = Math.sign(drag.angle);
    }
    quarter = Math.max(-2, Math.min(2, quarter));
    if (commit && quarter !== 0) {
      const move = layerTurnToMove(axis, drag.layer, quarter, n);
      pendingDragAngle.current = { axis, layer: drag.layer, angle: drag.angle };
      const ok = performMove(move, 'user');
      pendingDragAngle.current = null;
      if (ok) {
        invalidate();
        return;
      }
    }
    // Volta a camada para a posição original.
    activeRef.current = {
      prim: { axis, layers: [drag.layer], qt: 0 },
      pieces: drag.pieces,
      from: drag.angle,
      to: 0,
      elapsed: 0,
      duration: 0.16,
      commit: false,
    };
    visualBus.setBusy(true);
    invalidate();
  }

  const tmpHit = useRef(new Vector3()).current;

  function onWindowMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const hit = pointerToPlane(e.clientX, e.clientY, drag.plane, tmpHit);
    if (!hit) return;
    const d = hit.clone().sub(drag.start);
    if (!drag.turn) {
      const px = Math.hypot(e.clientX - drag.startClient.x, e.clientY - drag.startClient.y);
      if (px < (e.pointerType === 'touch' ? 12 : 7)) return;
      if (activeRef.current || queueRef.current.length) return;
      if (useCube.getState().lock) {
        endDrag(false);
        return;
      }
      drag.turn = dragToTurn(drag.normal, [d.x, d.y, d.z]);
      const coord = displayRef.current.pos[drag.piece * 3 + drag.turn.axis];
      drag.layer = (coord + n - 1) / 2;
      drag.pieces = piecesInLayers(displayRef.current, { axis: drag.turn.axis, layers: [drag.layer], qt: 0 });
      useCube.setState({ lock: 'drag' });
      visualBus.setBusy(true);
    }
    const along = d.getComponent(drag.turn.dir.axis) * drag.turn.dir.sign;
    const scale = n * spacingRef.current * 0.5;
    drag.angle = (drag.turn.sign * along * HALF_PI) / scale;
    drag.samples.push({ t: performance.now(), a: drag.angle });
    if (drag.samples.length > 8) drag.samples.shift();
    setLayerAngle(drag.pieces, drag.turn.axis, drag.angle);
    invalidate();
  }

  function onWindowUp(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(true);
  }

  function onWindowCancel(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(false);
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (interactionMode === 'camera') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (introRef.current || dragRef.current || !e.face) return;
    // Segundo dedo na tela: deixa a câmera tratar o gesto (pinça/rotação).
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    const pieceIndex = (e.object.userData.piece as number | undefined) ?? -1;
    if (pieceIndex < 0) return;
    if (useCube.getState().lock === 'playback') return;
    e.stopPropagation();
    if (controls) controls.enabled = false;
    const worldNormal = e.face.normal.clone().transformDirection(e.object.matrixWorld);
    const normal = snapToAxis([worldNormal.x, worldNormal.y, worldNormal.z]);
    const planeNormal = AXES[normal.axis].clone().multiplyScalar(normal.sign);
    dragRef.current = {
      pointerId: e.pointerId,
      piece: pieceIndex,
      normal,
      plane: new Plane().setFromNormalAndCoplanarPoint(planeNormal, e.point),
      start: e.point.clone(),
      startClient: new Vector2(e.nativeEvent.clientX, e.nativeEvent.clientY),
      turn: null,
      layer: 0,
      pieces: [],
      angle: 0,
      samples: [],
    };
    window.addEventListener('pointermove', stable.move);
    window.addEventListener('pointerup', stable.up);
    window.addEventListener('pointercancel', stable.cancel);
  };

  // Funções estáveis que delegam para a implementação mais recente.
  latest.current = { move: onWindowMove, up: onWindowUp, cancel: onWindowCancel, end: endDrag };

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', stable.move);
      window.removeEventListener('pointerup', stable.up);
      window.removeEventListener('pointercancel', stable.cancel);
      if (controlsRef.current) controlsRef.current.enabled = true;
    },
    [stable],
  );

  // ---------- Cena ----------

  return (
    <group ref={rootRef} onPointerDown={onPointerDown}>
      {Array.from({ length: layout.count }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            pieceRefs.current[i] = g;
          }}
        >
          <mesh
            ref={(m) => {
              bodyRefs.current[i] = m;
            }}
            geometry={geometry.body as BufferGeometry}
            material={materials.body as Material}
            userData={{ piece: i }}
            castShadow={profile.shadowMaps}
            receiveShadow={profile.shadowMaps}
          />
          {layout.stickers[i].map((face, k) => {
            const nrm = FACE_NORMALS[face];
            return (
              <mesh
                key={face}
                ref={(m) => {
                  (stickerRefs.current[i] ??= [])[k] = m;
                }}
                geometry={geometry.sticker as BufferGeometry}
                material={materials.stickers[face] as Material}
                position={[nrm[0] * 0.5, nrm[1] * 0.5, nrm[2] * 0.5]}
                rotation={STICKER_ROTATIONS[face]}
                userData={{ piece: i }}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
}
