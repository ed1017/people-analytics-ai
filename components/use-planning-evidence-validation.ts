"use client";
import {useEffect,useMemo,useState} from "react";
import {assessSkillsEvidenceFreshness,type PlanningEvidenceHandoff,type EvidenceFreshness} from "@/lib/evidence-handoff";
import {validateSkillsEvidence} from "@/lib/skills-evidence-validation";
import type {SkillsResponse} from "@/lib/types";

export function usePlanningEvidenceValidation(workspaceKey:string,active:boolean,handoff:PlanningEvidenceHandoff|null,skills:SkillsResponse|null,onSkills:(value:SkillsResponse)=>void){
 const [revision,setRevision]=useState(0);
 // Each activation (including A -> B -> A) owns a different request identity.
 const request=useMemo(()=>({workspaceKey,active,handoff,revision}),[workspaceKey,active,handoff,revision]);
 const [result,setResult]=useState<{request:typeof request;freshness:EvidenceFreshness}|null>(null);
 useEffect(()=>{
  if(!request.active||!request.handoff)return;
  const controller=new AbortController();
  void validateSkillsEvidence(request.handoff,controller.signal).then(value=>{
   if(controller.signal.aborted||!value)return;
   if(value.skills)onSkills(value.skills);
   setResult({request,freshness:value.freshness});
  });
  return ()=>controller.abort();
 },[request,onSkills]);
 const current=result?.request===request;
 return {
  freshness:current?result.freshness:assessSkillsEvidenceFreshness(handoff,skills),
  checking:Boolean(active&&handoff&&!current),
  refresh:()=>setRevision(value=>value+1),
 };
}
