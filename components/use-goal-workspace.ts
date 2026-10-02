"use client";
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {decisionStore,useDecisionStorage} from "@/components/decision-store";
// Named fields are durable for saved goals; unnamed freshness/loading fields stay transient.
export function useGoalWorkspace<T>(key: string, validKeys: string[], initial: () => T, field?:string): [T, Dispatch<SetStateAction<T>>] {
  const durable=useDecisionStorage();
  const id=key.slice(key.indexOf(":")+1);
  const canSave=Boolean(field&&id&&durable.ready);
  const [slots, setSlots] = useState<Record<string,T>>({});
  const fallback = useMemo(() => initial(), [initial]);
  const allowed = JSON.stringify(validKeys);
  const [previousAllowed, setPreviousAllowed] = useState(allowed);
  if (allowed !== previousAllowed) { const keys = new Set(validKeys); setPreviousAllowed(allowed); setSlots(current=>Object.fromEntries(Object.entries(current).filter(([k])=>keys.has(k)))); }
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(update=>setSlots(current=>({...current,[key]: typeof update === "function" ? (update as (value:T)=>T)(current[key] ?? fallback) : update})),[key,fallback]);
  const persisted=canSave?(durable.data.workspaces[id]?.fields[field!] as T|undefined)??fallback:slots[key]??fallback;
  const updateValue=useCallback<Dispatch<SetStateAction<T>>>(update=>{
    if(canSave){const current=decisionStore.getField<T>(id,field!,fallback);decisionStore.setField(id,field!,typeof update==="function"?(update as (value:T)=>T)(current):update)}else setValue(update);
  },[canSave,id,field,fallback,setValue]);
  return [persisted,updateValue];
}
