// @ts-expect-error Native Node tests share the TypeScript implementation.
import {assessSkillsEvidenceFreshness,type PlanningEvidenceHandoff,type EvidenceFreshness} from "./evidence-handoff.ts";
import type {SkillsResponse} from "./types";

type ValidationResult = {freshness:EvidenceFreshness;skills?:SkillsResponse};
// Abort is checked after body parsing as well: an already-arriving response may
// finish parsing after its goal, packet or planning destination was abandoned.
export async function validateSkillsEvidence(handoff:PlanningEvidenceHandoff,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<ValidationResult|null>{
 if(signal.aborted)return null;
 try{
  const response=await fetcher("/api/skills",{cache:"no-store",signal});
  const payload=await response.json();
  if(signal.aborted)return null;
  if(!response.ok)throw new Error(payload?.error??"Current Skills evidence is unavailable.");
  const skills=payload as SkillsResponse;
  return {skills,freshness:assessSkillsEvidenceFreshness(handoff,skills)};
 }catch(error){
  if(signal.aborted)return null;
  return {freshness:{status:"unavailable",reason:error instanceof Error?error.message:"Current Skills evidence is unavailable."}};
 }
}
