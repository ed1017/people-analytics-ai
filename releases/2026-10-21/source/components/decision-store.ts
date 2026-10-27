"use client";
import {useSyncExternalStore} from "react";
import {DecisionStore,DATASET_WORKSPACE_POINTER,readDatasetGoalSeed,hasSavedDatasetTransition} from "@/lib/local-decisions";
import { LEGACY_DATASET_TOKEN } from "@/lib/dataset-identity.mjs";
import {HOME_INTRO_OPT_OUT_KEY,isFirstHomeVisit} from '@/lib/home-onboarding';
export let decisionStore=new DecisionStore();
let pendingHomeVisit:{token:string;first:boolean}|null=null;
let homeVisitConsumed=false;
/** One automatic introduction opportunity per page load, not per internal remount. */
export function consumeFirstHomeVisit(){
 if(homeVisitConsumed)return false;
 homeVisitConsumed=true;
 const pending=pendingHomeVisit;pendingHomeVisit=null;
 try {
  if(localStorage.getItem(HOME_INTRO_OPT_OUT_KEY)==='1')return false;
  return pending?.token===decisionStore.getDatasetToken()?pending.first:isFirstHomeVisit(localStorage);
 } catch {return true;}
}
export function switchDecisionDataset(token:string){
 if(typeof window==="undefined")throw Error("Dataset workspace is browser-owned");
 const port={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value),removeItem:(key:string)=>localStorage.removeItem(key)};
 const previous=decisionStore.getSnapshot();
 // Preserve legacy Home-owned initialization and demo seeding.
 if(token===LEGACY_DATASET_TOKEN&&!previous.ready)return false;
 // Capture preference once at initial dataset hydration; dataset switches are not new visits.
 pendingHomeVisit={token,first:!previous.ready&&isFirstHomeVisit(port)};
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
