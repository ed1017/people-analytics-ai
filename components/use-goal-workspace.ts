"use client";
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
// Per-goal transient user-carried inputs. No source evidence is persisted to browser storage.
export function useGoalWorkspace<T>(key: string, validKeys: string[], initial: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [slots, setSlots] = useState<Record<string,T>>({});
  const fallback = useMemo(() => initial(), [initial]);
  const allowed = JSON.stringify(validKeys);
  const [previousAllowed, setPreviousAllowed] = useState(allowed);
  if (allowed !== previousAllowed) { const keys = new Set(validKeys); setPreviousAllowed(allowed); setSlots(current=>Object.fromEntries(Object.entries(current).filter(([k])=>keys.has(k)))); }
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(update=>setSlots(current=>({...current,[key]: typeof update === "function" ? (update as (value:T)=>T)(current[key] ?? fallback) : update})),[key,fallback]);
  return [slots[key] ?? fallback, setValue];
}
