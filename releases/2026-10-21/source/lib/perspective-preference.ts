import type { Persona } from './types';

export const PERSPECTIVE_KEY = 'people-analytics-perspective-v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const valid = (value: unknown): Persona => value === 'Leader' || value === 'Finance' ? value : 'HR';

// Each open tab keeps its own choice. Reload restores the last saved preference;
// changing it never writes goal records or interrupts another tab's conversation.
export function createPerspectivePreference(storage: () => StoragePort) {
  let current: Persona | undefined;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: (): Persona => {
      if (current !== undefined) return current;
      try { current = valid(storage().getItem(PERSPECTIVE_KEY)); }
      catch { current = 'HR'; }
      return current;
    },
    getServerSnapshot: (): Persona => 'HR',
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set: (value: Persona) => {
      current = valid(value);
      try { storage().setItem(PERSPECTIVE_KEY, current); }
      catch { /* Selection still works in this tab when storage is unavailable. */ }
      listeners.forEach(listener => listener());
    },
  };
}
