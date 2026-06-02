import { useEffect } from 'react';

const SELECTOR = 'button, a, [role="button"], [role="checkbox"], [role="switch"]';

export function useHapticFeedback() {
  useEffect(() => {
    if (!navigator.vibrate) return;
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(SELECTOR);
      if (el) navigator.vibrate(10);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
}
