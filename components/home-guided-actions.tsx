'use client';
import type {GuidedReceipt} from '@/lib/home-guided-flow';
import {createContext,useContext,useLayoutEffect} from 'react';
export type GuidedPlanActions={goalId:string;prepare?:()=>Promise<void>;cancel?:()=>void;select?:()=>void;attach?:()=>Promise<void>;attachReady?:()=>boolean;selected?:()=>boolean;attached?:()=>boolean};
/** Imperative registrations contain handlers only; no application or saved state. */
export class GuidedActionRegistry {
 goalId:string|null=null;
 private listeners=new Set<(event:GuidedReceipt)=>void>();
 subscribe(listener:(event:GuidedReceipt)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 emit(event:GuidedReceipt){if(this.goalId===event.goalId)for(const listener of this.listeners)listener(event);}
 preparation:GuidedPlanActions|null=null;
 plan:GuidedPlanActions|null=null;
 start(id:string){this.goalId=id;}
 clear(){this.goalId=null;this.preparation=null;this.plan=null;}
 register(slot:'preparation'|'plan',actions:GuidedPlanActions){
  if(this.goalId!==actions.goalId)return;
  this[slot]=actions;
  return()=>{if(this[slot]===actions)this[slot]=null;};
 }
}
export const HomeGuidedActionsContext=createContext<GuidedActionRegistry|null>(null);
/** Register the same handlers used by ordinary controls, scoped to this example only. */
export function useHomeGuidedActions(slot:'preparation'|'plan',actions:GuidedPlanActions){
 const registry=useContext(HomeGuidedActionsContext);
 useLayoutEffect(()=>registry?.register(slot,actions));
 return registry;
}
