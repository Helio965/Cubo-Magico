import { useEffect } from 'react';
import { useSettings } from '../features/settings/settingsStore';
import { useMediaQuery } from './useMediaQuery';

/** Tema efetivo (considerando a preferência do sistema) aplicado ao <html>. */
export function useResolvedTheme(): 'dark' | 'light' {
  const pref = useSettings((s) => s.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

export function useApplyTheme(): 'dark' | 'light' {
  const theme = useResolvedTheme();
  const background = useSettings((s) => s.background);
  const motion = useSettings((s) => s.motion);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.bg = background;
    root.dataset.motion = motion;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0c10' : '#eef0f6');
  }, [theme, background, motion]);
  return theme;
}
