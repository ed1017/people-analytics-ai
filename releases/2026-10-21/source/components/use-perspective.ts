"use client";
import { useSyncExternalStore } from 'react';
import { createPerspectivePreference } from '@/lib/perspective-preference';

const preference = createPerspectivePreference(() => window.localStorage);

export function usePerspective() {
  const perspective = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getServerSnapshot);
  return [perspective, preference.set] as const;
}
