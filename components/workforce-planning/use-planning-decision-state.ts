"use client";
import {useState,type Dispatch,type SetStateAction} from "react";
import {decisionStore,useDecisionStorage} from "@/components/decision-store";
import {usePlanningSession} from "./planning-session-context";
export function usePlanningDecisionState<T>(field:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{
 const {goalKey}=usePlanningSession(),id=goalKey.slice(goalKey.indexOf(":")+1);
 const storage=useDecisionStorage();const [local,setLocal]=useState(initial);
 const fallback=local;
 if(!id||!storage.ready)return [local,setLocal];
 const key="planning."+field;
 return [(storage.data.workspaces[id]?.fields[key] as T|undefined)??fallback,update=>{const value=decisionStore.getField<T>(id,key,fallback);decisionStore.setField(id,key,typeof update==="function"?(update as (value:T)=>T)(value):update)}];
}
