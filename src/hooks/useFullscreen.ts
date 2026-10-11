import { useSyncExternalStore } from 'react';

export function useFullscreen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener('fullscreenchange', cb);
      return () => document.removeEventListener('fullscreenchange', cb);
    },
    () => !!document.fullscreenElement,
    () => false,
  );
}
