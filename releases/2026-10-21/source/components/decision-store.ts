"use client";
import {useSyncExternalStore} from "react";
import {DecisionStore,DATASET_WORKSPACE_POINTER,readDatasetGoalSeed,hasSavedDatasetTransition} from "@/lib/local-decisions";
import { LEGACY_DATASET_TOKEN } from "@/lib/dataset-identity.mjs";
import {HOME_INSTRUCTIONS_DISMISSED_KEY,isFirstHomeVisit} from '@/lib/home-onboarding';
export let decisionStore=new DecisionStore();
let pendingHomeVisit:{token:string;first:boolean}|null=null;
/** Consume the pre-hydration observation once; saved records remain authoritative on remount. */
export function consumeFirstHomeVisit(){
 const pending=pendingHomeVisit;pendingHomeVisit=null;
 try {
  if(localStorage.getItem(HOME_INSTRUCTIONS_DISMISSED_KEY)!==null)return false;
  return pending?.token===decisionStore.getDatasetToken()?pending.first:isFirstHomeVisit(localStorage,sessionStorage,decisionStore.getDatasetToken());
 } catch {return false;}
}
export function switchDecisionDataset(token:string){
 if(typeof window==="undefined")throw Error("Dataset workspace is browser-owned");
 const port={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value),removeItem:(key:string)=>localStorage.removeItem(key)};
 const previous=decisionStore.getSnapshot();
 // Legacy first-visit detection and demo seeding still belong to Home. Creating
 // an empty envelope here would hide onboarding before Home can inspect storage.
 if(token===LEGACY_DATASET_TOKEN&&!previous.ready)return false;
 // Observe before initialize creates a new dataset envelope for a genuinely fresh visitor.
 pendingHomeVisit={token,first:!previous.ready&&isFirstHomeVisit(port,sessionStorage,token)};
 const transitioned=hasSavedDatasetTransition(port,token);
 const seed=previous.ready||token===LEGACY_DATASET_TOKEN?previous.data.goals:readDatasetGoalSeed(port);
 decisionStore=new DecisionStore(token,seed);
 const recoveryPort={getItem:(key:string)=>sessionStorage.getItem(key),setItem:(key:string,value:string)=>sessionStorage.setItem(key,value),removeItem:(key:string)=>sessionStorage.removeItem(key)};
 decisionStore.initialize(port,undefined,recoveryPort);
 if(decisionStore.getSnapshot().saved)port.setItem(DATASET_WORKSPACE_POINTER,token);
 return transitioned&&decisionStore.getSnapshot().saved;
}
const serverSnapshot=decisionStore.getSnapshot();
export function useDecisionStorage(){return useSyncExternalStore(decisionStore.subscribe,decisionStore.getSnapshot,()=>serverSnapshot)}

export function recordDecisionEvidence(id:string,page:string,evidence:unknown){
 if(!id)return;
 const value=JSON.parse(JSON.stringify(evidence));
 const previous=decisionStore.getField<Array<{page:string;capturedAt:string;schemaVersion:number;evidence:unknown}>>(id,"evidence",[]);
 if(previous.some(item=>item.page===page&&JSON.stringify(item.evidence)===JSON.stringify(value)))return;
 decisionStore.setField(id,"evidence",[...previous,{page,capturedAt:new Date().toISOString(),schemaVersion:1,evidence:value}]);
}
