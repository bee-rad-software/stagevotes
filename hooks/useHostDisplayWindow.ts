'use client';

import { useEffect, useState } from 'react';

// Keep handles when the host leaves and returns to a show within the app.
const windows = new Map<string, Window>();

export function useHostDisplayWindow(eventId: string, route: 'display' | 'karafun-display' | 'stage-display') {
  const key = `stagevotes-${route}-${eventId}`;
  const [openKey, setOpenKey] = useState<string | null>(null);

  function sync() {
    const display = windows.get(key);
    if (display?.closed) windows.delete(key);
    setOpenKey(windows.has(key) ? key : null);
  }

  useEffect(() => {
    sync();
    const timer = window.setInterval(sync, 750);
    window.addEventListener('focus', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
    };
  }, [key]);

  return {
    isOpen: openKey === key,
    open: () => {
      const existing = windows.get(key);
      if (existing && !existing.closed) {
        existing.focus();
        return;
      }
      const display = window.open(`/${route}/${eventId}`, key);
      if (display) windows.set(key, display);
      sync();
    },
    close: () => {
      windows.get(key)?.close();
      sync();
    },
  };
}
