"use client";
import {useEffect,useRef} from 'react';
import {syntheticCapacityDraft} from '@/lib/synthetic-capacity-risk';
import {PlanningSessionProvider,usePlanningSession,useCapacitySessionState} from './workforce-planning/planning-session-context';
import {CapacityWorkspace} from './workforce-planning/capacity-workspace';
function Worksheet(){
 const {capacitySession,setCapacitySession}=usePlanningSession(),initialized=useRef(false);
 // The explicit review link mounts this isolated worksheet; never seed the parent worksheet or saved store.
 useEffect(()=>{if(initialized.current)return;initialized.current=true;if(capacitySession.draft.scope)return;setCapacitySession({draft:syntheticCapacityDraft(),result:null,cost:null,error:'',scope:null,capture:null});},[capacitySession.draft.scope,setCapacitySession]);
 return <CapacityWorkspace/>;
}
export function SyntheticCapacityRiskScenario({onClose}:{onClose:()=>void}){
 const {goalKey,positionGoalActions:goalActions}=usePlanningSession();
 const capacityState=useCapacitySessionState(goalKey);
 const carry=(select:()=>string)=>{const snapshot=capacityState.capacitySession;const id=select();capacityState.setCapacitySessionForGoal(id,snapshot);};
 const close=()=>{if(JSON.stringify(capacityState.capacitySession.draft)!==JSON.stringify(syntheticCapacityDraft())&&!window.confirm('Close this worksheet? Saved scenarios are kept; unsaved edits will be discarded.'))return;onClose();};
 const carriedGoalActions=goalActions?{businessGoal:'Review the Service Analyst worked example',goals:goalActions.goals,disabled:goalActions.disabled,onCreate:(statement:string)=>carry(()=>goalActions.onCreate(statement)),onSelect:(id:string)=>carry(()=>goalActions.onSelect(id))}:undefined;
 return <section aria-label="Worked workload scenario" className="mt-3 space-y-3"><button type="button" className="min-h-11 underline" onClick={close}>Close demo workload</button><p className="text-sm">Demo workload · Oct–Dec 2026</p><PlanningSessionProvider goalKey={goalKey} capacityState={capacityState} carriedGoalActions={carriedGoalActions} onTalentEvidenceContextChange={()=>{}}><Worksheet key={goalKey}/></PlanningSessionProvider></section>;
}
