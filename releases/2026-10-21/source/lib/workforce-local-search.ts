/** Browser/Worker implementation: only Web Crypto and shared deterministic code; no transport. */
// @ts-expect-error Native Node tests share TypeScript.
import {canonical,freeze,prepareWorkforceMixSource,preflightWorkforceMixes,evaluateWorkforceMixes,workforceSearchMethodVersion,workforceSearchCalculator,type MixBinding,type WorkforceMixSearch} from "./workforce-mix-search-core.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {validateSelectionContext,validateSelectionRequest,selectionFromReplay,type WorkforceSelectionContext} from "./workforce-mix-selection-core.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {previewWorkforceAlternatives,readWorkforceAlternativeReview,workforceAgentReviewIsCurrent,type WorkforceAlternativeReview} from "./workforce-planning-agent.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {readWorkforceSolution,workforceSolutionAtVersion,type WorkforceSolution} from "./workforce-solution.ts";
// @ts-expect-error Native Node tests share TypeScript.
import {validateJson} from "./local-decisions.ts";
import type {WorkforcePlanInput} from "./workforce-increment";
export async function localFingerprint(value: unknown) {
 if(!globalThis.crypto?.subtle)throw Error("Local verification needs Web Crypto; no service fallback is available.");
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(value)));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
}
export async function searchWorkforceMixesLocally(solution: WorkforceSolution,evidenceResultId: string,rawSpec: unknown) {
 const source=prepareWorkforceMixSource(solution,evidenceResultId),{spec,withinBudget}=preflightWorkforceMixes(Number(source.input.roles),rawSpec);
 if(!withinBudget)throw Error("The complete bounded search plus its reference calculation exceeds the evaluation budget; narrow the explicit bounds. No partial search was evaluated.");
 const entries=await Promise.all(Object.entries(source.parts).map(async([key,value])=>[key,await localFingerprint(value)]));
 const binding={...source.identity,...Object.fromEntries(entries)} as MixBinding;
 const fingerprint=await localFingerprint({binding,spec,methodVersion:workforceSearchMethodVersion,calculator:workforceSearchCalculator});
 return evaluateWorkforceMixes(source,binding,spec,fingerprint);
}
export async function runLocalWorkforceSearch(context: WorkforceSelectionContext,spec: unknown) {
 return searchWorkforceMixesLocally(validateSelectionContext(context),context.evidenceResultId,spec);
}
export async function stageWorkforceMixSelectionLocally(context: WorkforceSelectionContext,snapshot: unknown,ids: string[]) {
 const {solution,supplied}=validateSelectionRequest(context,snapshot,ids);
 const replay=await searchWorkforceMixesLocally(solution,context.evidenceResultId,supplied.spec);
 return selectionFromReplay(context,snapshot,ids,replay);
}
export type SearchOrigin = {
 schemaVersion: 1; source: MixBinding;
 search: {methodVersion: string; fingerprint: string; spec: WorkforceMixSearch["spec"]; calculator: typeof workforceSearchCalculator};
 selections: Array<{revisionSlot:number;candidateId:string;mix:{build:number;move:number;buy:number};editedSinceSelection:boolean}>;
 caveats: {feasibilityBasis:"entered-assumptions";operationalFeasibilityVerified:false;candidatePoolsAreAssignableCapacity:false};
};
export type WorkforceSearchReview = Omit<WorkforceAlternativeReview,"schemaVersion"> & {schemaVersion:2;selectionOrigin:SearchOrigin};
export type LocalWorkforceReview = WorkforceAlternativeReview | WorkforceSearchReview;
export function originForSelection(report: WorkforceMixSearch,ids: string[],revisions: WorkforcePlanInput[],slots=ids.map((_,i)=>i)): SearchOrigin {
 if(ids.length<1||ids.length>2||new Set(ids).size!==ids.length||new Set(slots).size!==slots.length||slots.length!==ids.length)throw Error("Invalid selection lineage.");
 const selections=ids.map((id,index)=>{
  const candidate=report.results.find(item=>item.id===id),slot=slots[index];
  if(!Number.isSafeInteger(slot)||slot<0||slot>=revisions.length||!candidate?.plan||candidate.isSavedMix||candidate.mix.build+candidate.mix.move===0||candidate.status!=="met"||!candidate.tradeOffs||Object.values(candidate.tradeOffs).some(value=>value===null))throw Error("Lineage must reference eligible emitted alternatives.");
  return {revisionSlot:slot,candidateId:id,mix:structuredClone(candidate.mix),editedSinceSelection:canonical(candidate.plan.input)!==canonical(revisions[slot])};
 });
 return freeze({schemaVersion:1,source:structuredClone(report.binding),search:{methodVersion:report.methodVersion,fingerprint:report.searchFingerprint,spec:structuredClone(report.spec),calculator:report.calculator},selections,
  caveats:{feasibilityBasis:"entered-assumptions",operationalFeasibilityVerified:false,candidatePoolsAreAssignableCapacity:false}});
}
async function originAgainstSource(solution: WorkforceSolution,evidenceId: string,raw: SearchOrigin,revisions: WorkforcePlanInput[],allowEdits: boolean) {
 if(!validateJson(raw)||JSON.stringify(raw).length>16000||raw?.source?.evidenceResultId!==evidenceId||!Array.isArray(raw.selections))throw Error("Unreadable selection lineage.");
 const report=await searchWorkforceMixesLocally(solution,evidenceId,raw.search?.spec);
 const expected=originForSelection(report,raw.selections.map(item=>item.candidateId),revisions,raw.selections.map(item=>item.revisionSlot));
 // Draft edits may change only this derived flag, never source identity, selected mix or settings.
 const comparable=allowEdits?{...raw,selections:raw.selections.map((item,i)=>({...item,editedSinceSelection:expected.selections[i].editedSinceSelection}))}:raw;
 if(canonical(comparable)!==canonical(expected))throw Error("Selection lineage changed or uses an unsupported calculator/search version.");
 return expected;
}
export async function previewWorkforceSearchReview(context: WorkforceSelectionContext,revisions: WorkforcePlanInput[],origin: SearchOrigin|null,id: string,createdAt: string): Promise<LocalWorkforceReview> {
 const solution=validateSelectionContext(context),base=previewWorkforceAlternatives(solution,context.evidenceResultId,revisions,id,createdAt);
 if(!origin)return base;
 const selectionOrigin=await originAgainstSource(solution,context.evidenceResultId,origin,revisions,true);
 return {...base,schemaVersion:2,selectionOrigin};
}
/** v1 remains unchanged. v2 is replayed asynchronously with Web Crypto before being displayed as verified. */
export async function readLocalWorkforceReview(raw: unknown,solution: WorkforceSolution): Promise<LocalWorkforceReview|null> {
 try {
  if(!validateJson(raw)||!readWorkforceSolution(solution))return null;
  const review=raw as WorkforceSearchReview;
  if((raw as {schemaVersion:number})?.schemaVersion===1)return readWorkforceAlternativeReview(raw,solution);
  if(review?.schemaVersion!==2||Object.keys(review).sort().join()!==["schemaVersion","kind","id","createdAt","binding","reviewedRevisions","comparisons","selectionOrigin"].sort().join())return null;
  const {selectionOrigin,...rest}=review,base=readWorkforceAlternativeReview({...rest,schemaVersion:1},solution);
  if(!base)return null;
  const historical=workforceSolutionAtVersion(solution,base.binding.version);
  await originAgainstSource(historical,base.binding.evidenceResultId,selectionOrigin,base.reviewedRevisions,false);
  return structuredClone(review);
 }catch{return null}
}
export async function retainLocalWorkforceReview(previous: unknown,review: LocalWorkforceReview,solution: WorkforceSolution) {
 if(!workforceAgentReviewIsCurrent(solution,review)||!await readLocalWorkforceReview(review,solution))throw Error("Recalculate current alternatives before saving.");
 if(!Array.isArray(previous)||previous.length>=10)throw Error("Review history is unreadable or at its ten-review limit; original records retained.");
 for(const old of previous)if(!await readLocalWorkforceReview(old,solution))throw Error("Existing review history is unreadable; original records retained.");
 if(previous.some(item=>item.id===review.id))throw Error("This review is already saved.");
 const next=[...previous,review];if(new TextEncoder().encode(JSON.stringify(next)).length>256*1024)throw Error("Review history reached its storage limit; original records retained.");
 return structuredClone(next);
}
