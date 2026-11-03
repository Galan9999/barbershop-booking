'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, kept fresh while the page is open, so a booking form left
 * in a tab does not keep offering hours that have already gone by.
 *
 * Returns null until mounted: the server already filtered the grid at request
 * time, and starting from null keeps the first client render identical to the
 * server one (no hydration mismatch). Ticks every `intervalMs` and whenever the
 * tab becomes visible again, which is when a phone resumes a backgrounded tab.
 *
 * `onResume` fires when the tab comes back after `staleAfterMs` hidden, so the
 * caller can refetch data that other people may have changed meanwhile.
 */
export function useNow(options: {
  intervalMs: number;
  staleAfterMs: number;
  onResume?: () => void;
}): number | null {
  const { intervalMs, staleAfterMs, onResume } = options;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let hiddenSince: number | null = null;
    const tick = () => setNow(Date.now());
    tick();

    const timer = window.setInterval(tick, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSince = Date.now();
        return;
      }
      tick();
      if (hiddenSince !== null && Date.now() - hiddenSince >= staleAfterMs) onResume?.();
      hiddenSince = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, staleAfterMs, onResume]);

  return now;
}
