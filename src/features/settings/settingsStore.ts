import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FaceId } from '../../engine/state/faces';
import { safeJSONStorage } from '../../utils/storage';

export type ThemePreference = 'dark' | 'light' | 'system';
export type Finish = 'glossy' | 'satin' | 'matte';
export type BodyColor = 'black' | 'graphite' | 'white';
export type Quality = 'low' | 'medium' | 'high' | 'auto';
export type Easing = 'smooth' | 'linear' | 'snappy' | 'elastic';
export type Background = 'aurora' | 'studio' | 'solid' | 'grid';
export type CameraPreset = 'iso' | 'front' | 'top';
export type InteractionMode = 'auto' | 'camera' | 'cube';
export type MotionPreference = 'system' | 'reduce' | 'full';
export type TimerStart = 'firstMove' | 'manual';
export type ScrambleKind = 'random-move' | 'random-state';

export type FaceColors = Record<FaceId, string>;

export interface ColorPreset {
  id: string;
  name: string;
  colors: FaceColors;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  {
    id: 'classic',
    name: 'Clássico',
    colors: { U: '#f4f6f8', D: '#ffd23f', F: '#18b85a', B: '#1f6fe5', R: '#e8322f', L: '#ff8a1f' },
  },
  {
    id: 'vivid',
    name: 'Vibrante',
    colors: { U: '#ffffff', D: '#fff200', F: '#00e05a', B: '#0a84ff', R: '#ff1744', L: '#ff9100' },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    colors: { U: '#f7f3ee', D: '#f6e58d', F: '#7bd389', B: '#7aa7ff', R: '#ff7a85', L: '#ffb37a' },
  },
  {
    id: 'contrast',
    name: 'Alto contraste',
    colors: { U: '#ffffff', D: '#ffe600', F: '#00a651', B: '#0033cc', R: '#d50000', L: '#ff6d00' },
  },
];

export interface Settings {
  theme: ThemePreference;
  // Cubo
  colorPreset: string;
  colors: FaceColors;
  finish: Finish;
  bodyColor: BodyColor;
  reflections: number;
  roundness: number;
  gap: number;
  // Ambiente
  lightIntensity: number;
  background: Background;
  shadows: boolean;
  effects: boolean;
  quality: Quality;
  // Animações
  turnDurationMs: number;
  easing: Easing;
  motion: MotionPreference;
  showIntro: boolean;
  // Câmera e interação
  cameraSensitivity: number;
  zoomSpeed: number;
  cameraPreset: CameraPreset;
  interactionMode: InteractionMode;
  // Áudio
  sound: boolean;
  moveSound: boolean;
  completeSound: boolean;
  volume: number;
  // Cronômetro e embaralhamento
  inspection: boolean;
  timerStart: TimerStart;
  doubleTapStart: boolean;
  /** Casas decimais do cronômetro ao vivo: centésimos (2) ou milésimos (3). */
  timerDigits: 2 | 3;
  scrambleKind: ScrambleKind;
  scrambleAnimated: boolean;
  scrambleLengths: Record<string, number>;
  // Visualização
  showNet: boolean;
  showHints: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  colorPreset: 'classic',
  colors: { ...COLOR_PRESETS[0].colors },
  finish: 'glossy',
  bodyColor: 'black',
  reflections: 1,
  roundness: 0.55,
  gap: 0.035,
  lightIntensity: 1,
  background: 'aurora',
  shadows: true,
  effects: true,
  quality: 'auto',
  turnDurationMs: 180,
  easing: 'smooth',
  motion: 'system',
  showIntro: true,
  cameraSensitivity: 1,
  zoomSpeed: 1,
  cameraPreset: 'iso',
  interactionMode: 'auto',
  sound: true,
  moveSound: true,
  completeSound: true,
  volume: 0.5,
  inspection: true,
  timerStart: 'firstMove',
  doubleTapStart: true,
  timerDigits: 3,
  scrambleKind: 'random-move',
  scrambleAnimated: true,
  scrambleLengths: {},
  showNet: false,
  showHints: true,
};

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  update: (patch: Partial<Settings>) => void;
  applyPreset: (id: string) => void;
  setFaceColor: (face: FaceId, color: string) => void;
  resetAll: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      update: (patch) => set(patch),
      applyPreset: (id) => {
        const preset = COLOR_PRESETS.find((p) => p.id === id);
        if (preset) set({ colorPreset: id, colors: { ...preset.colors } });
      },
      setFaceColor: (face, color) =>
        set((s) => ({ colorPreset: 'custom', colors: { ...s.colors, [face]: color } })),
      resetAll: () => set({ ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } }),
    }),
    {
      name: 'cubeforge.settings',
      version: 1,
      storage: safeJSONStorage,
      partialize: (s) => {
        const out: Partial<Settings> = {};
        for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
          (out as Record<string, unknown>)[key] = s[key];
        }
        return out as Settings;
      },
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Settings>) }),
    },
  ),
);

export function getSettings(): Settings {
  return useSettings.getState();
}

/** Respeita a preferência do sistema por movimento reduzido. */
export function prefersReducedMotion(pref: MotionPreference = getSettings().motion): boolean {
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
