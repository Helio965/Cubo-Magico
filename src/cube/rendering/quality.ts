import type { Quality } from '../../features/settings/settingsStore';

export type Tier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  tier: Tier;
  dpr: [number, number];
  segments: number;
  bevel: boolean;
  antialias: boolean;
  shadowMaps: boolean;
  contactShadowResolution: number;
  environment: boolean;
  envResolution: number;
}

export const PROFILES: Record<Tier, QualityProfile> = {
  low: {
    tier: 'low',
    dpr: [0.75, 1],
    segments: 2,
    bevel: false,
    antialias: false,
    shadowMaps: false,
    contactShadowResolution: 0,
    environment: false,
    envResolution: 64,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    segments: 3,
    bevel: true,
    antialias: true,
    shadowMaps: false,
    contactShadowResolution: 256,
    environment: true,
    envResolution: 128,
  },
  high: {
    tier: 'high',
    dpr: [1, 2],
    segments: 4,
    bevel: true,
    antialias: true,
    shadowMaps: true,
    contactShadowResolution: 512,
    environment: true,
    envResolution: 256,
  },
};

/** Estimativa inicial para o modo automático a partir das capacidades do dispositivo. */
export function detectTier(): Tier {
  if (typeof navigator === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (cores <= 2 || memory <= 2) return 'low';
  if (coarse || cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

export function resolveTier(quality: Quality, autoTier: Tier): Tier {
  return quality === 'auto' ? autoTier : quality;
}

export const downgrade = (t: Tier): Tier => (t === 'high' ? 'medium' : 'low');
