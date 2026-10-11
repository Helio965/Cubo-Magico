import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useSettings } from '../../features/settings/settingsStore';
import type { QualityProfile } from './quality';

export function Lights({ profile, n, spacing, dark }: { profile: QualityProfile; n: number; spacing: number; dark: boolean }) {
  const k = useSettings((s) => s.lightIntensity);
  const shadows = useSettings((s) => s.shadows);
  const effects = useSettings((s) => s.effects);
  const half = (n * spacing) / 2;
  return (
    <>
      <hemisphereLight args={['#e6ecff', dark ? '#1b1530' : '#c9cedb', 0.55 * k]} />
      <ambientLight intensity={0.12 * k} />
      <directionalLight
        position={[half * 2.2, half * 4, half * 3]}
        intensity={2.1 * k}
        castShadow={shadows && profile.shadowMaps}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-half * 2}
        shadow-camera-right={half * 2}
        shadow-camera-top={half * 2}
        shadow-camera-bottom={-half * 2}
      />
      <directionalLight position={[-half * 3, half * 1.5, -half * 2]} intensity={0.9 * k} color="#8b9dff" />
      <directionalLight position={[half * 0.5, -half * 3, half * 2]} intensity={0.35 * k} color="#c4b5ff" />
      {effects && profile.environment && (
        <Environment resolution={profile.envResolution} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 6, -3]} rotation={[Math.PI / 2.4, 0, 0]} scale={[12, 4, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#7c8cff" position={[-6, 1.5, 2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#b48cff" position={[6, 1, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
          <Lightformer form="circle" intensity={2.5} position={[2, 4, 6]} scale={2.5} />
        </Environment>
      )}
      {shadows && profile.contactShadowResolution > 0 && (
        <ContactShadows
          position={[0, -half - 0.45, 0]}
          scale={n * spacing * 3.4}
          far={n * spacing * 1.4}
          blur={2.6}
          opacity={dark ? 0.7 : 0.38}
          resolution={profile.contactShadowResolution}
          color={dark ? '#000000' : '#1c1b2e'}
          frames={Infinity}
        />
      )}
    </>
  );
}
