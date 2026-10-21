"use client";
import {useCallback,useState,type Dispatch,type SetStateAction} from "react";
import {decisionStore,useDecisionStorage} from "@/components/decision-store";
import {usePlanningSession} from "./planning-session-context";
export function usePlanningDecisionState<T>(field:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{
 const {goalKey}=usePlanningSession(),id=goalKey.slice(goalKey.indexOf(":")+1);
 const storage=useDecisionStorage();const [local,setLocal]=useState(initial);
 const key="planning."+field,canSave=Boolean(id&&storage.ready);
 // Store publications must not restart the effects that load planning defaults.
 // Functional updates always read the latest saved field, never a render snapshot.
 const setValue=useCallback<Dispatch<SetStateAction<T>>>(update=>{
  if(!canSave){setLocal(update);return;}
  const value=decisionStore.getField<T>(id,key,local);
  decisionStore.setField(id,key,typeof update==="function"?(update as (value:T)=>T)(value):update);
 },[canSave,id,key,local]);
 return [canSave?(storage.data.workspaces[id]?.fields[key] as T|undefined)??local:local,canSave?setValue:setLocal];
}
