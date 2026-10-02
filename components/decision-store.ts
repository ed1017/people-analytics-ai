"use client";
import {useSyncExternalStore} from "react";
import {DecisionStore} from "@/lib/local-decisions";
export const decisionStore=new DecisionStore();
const serverSnapshot=decisionStore.getSnapshot();
export function useDecisionStorage(){return useSyncExternalStore(decisionStore.subscribe,decisionStore.getSnapshot,()=>serverSnapshot)}

export function recordDecisionEvidence(id:string,page:string,evidence:unknown){
 if(!id)return;
 const value=JSON.parse(JSON.stringify(evidence));
 const previous=decisionStore.getField<Array<{page:string;capturedAt:string;schemaVersion:number;evidence:unknown}>>(id,"evidence",[]);
 if(previous.some(item=>item.page===page&&JSON.stringify(item.evidence)===JSON.stringify(value)))return;
 decisionStore.setField(id,"evidence",[...previous,{page,capturedAt:new Date().toISOString(),schemaVersion:1,evidence:value}]);
}
