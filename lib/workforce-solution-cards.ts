/** Bounded local comparisons, explicit revised saves and exact-result bookmarks. No IO. */
// @ts-expect-error Native Node tests share TypeScript.
import {calculateWorkforceIncrement,validateWorkforcePlanInput,workforcePlanFields,workforceIncrementMethodVersion,type WorkforcePlanInput,type WorkforcePlanField,type WorkforceIncrement} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript.
import {readSavedWorkforceReview,type WorkforceReview} from './workforce-solution-review.ts';
// @ts-expect-error Native Node tests share TypeScript.
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent,reviseWorkforceSolution,beginSolutionRun,completeSolutionRun,solutionSections,type WorkforceSolution} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript.
import {localFingerprint,readLocalWorkforceReview,type LocalWorkforceReview} from './workforce-local-search.ts';
import type {RecruitingTimingEvidence} from './recruiting-timing';
import type {Json} from './local-decisions';
export type CardPriority=''|'cash'|'employees'|'coverage';
export const cardPriorities={cash:'Lower incremental cash',employees:'Fewer added employees',coverage:'Earlier conditional coverage'} as const;
export const sharedWhatIfFields=['budget','maxAddedEmployees','deadlineMonth','annualHireCost','hireFee','recruitingStart','arrivalMode','arrivalDate','loadedHourlyCost'] as const;
const fixedFields=['businessUnit','jobProfile','intent','roles','planningMonth','months'] as const;
export type SolutionCard={id:string;title:string;input:WorkforcePlanInput;plan:WorkforceIncrement;reviewId:string|null;slot:number|null};
export type CardsSnapshot={cards:SolutionCard[];benchmark:SolutionCard;sourceHash:string;review:WorkforceReview;alternative:LocalWorkforceReview|null;historyNotice:string};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function requireValue(value:unknown,message:string):asserts value {if(!value)throw Error(message)}
export function cardSourceIdentity(solution:WorkforceSolution,resultId:string){return JSON.stringify({id:solution.id,goalId:solution.goalId,versions:solution.versions,evidence:solution.evidence,result:solution.results.find(r=>r.id===resultId),pending:solution.pending})}
export function cardVerificationIdentity(solution:WorkforceSolution,resultId:string,history:unknown){return JSON.stringify([cardSourceIdentity(solution,resultId),history])}
export function fullCoverage(plan:WorkforceIncrement):string|null{return plan.rows.find(row=>row.conditionalRoleCoverage!==null&&row.conditionalRoleCoverage>=Number(plan.input.roles))?.month??null}
export function rankSolutionCards(cards:SolutionCard[],priority:CardPriority){
 requireValue(priority===''||Object.hasOwn(cardPriorities,priority),'Choose a supported comparison priority.');
 const metric=(card:SolutionCard):number|null=>priority==='cash'?card.plan.totalCash:priority==='employees'?card.plan.maxAddedEmployees:fullCoverage(card.plan)?Number(fullCoverage(card.plan)!.replace('-','')):null;
 const eligible=cards.filter(card=>card.plan.checks.length===3&&card.plan.checks.every(check=>check.status==='met')&&metric(card)!==null);
 if(!priority)return {cards,preferred:null,message:'Neutral options. Choose your priority to compare; there is no default best.'};
 if(!eligible.length)return {cards,preferred:null,message:'No preferred option: no shown option has known comparison metrics and meets all entered constraints.'};
 const sorted=[...eligible].sort((a,b)=>metric(a)!-metric(b)!),ties=sorted.filter(card=>metric(card)===metric(sorted[0]));
 // Unknown eligible metrics preclude claiming a unique preference among all passing options.
 const missing=cards.some(card=>card.plan.checks.every(check=>check.status==='met')&&metric(card)===null);
 const preferred=ties.length===1&&!missing?sorted[0].id:null;
 return {cards:[...sorted,...cards.filter(card=>!eligible.includes(card))],preferred,message:missing?'No unique preferred option: a passing option has an unknown comparison metric.':ties.length>1?`No unique preferred option: ${ties.length} options tie on ${cardPriorities[priority].toLowerCase()}.`:`Preferred under ${cardPriorities[priority].toLowerCase()} among these compared options that meet the entered constraints. Operational feasibility remains unverified.`};
}
function savedReview(solution:WorkforceSolution,resultId:string){
 requireValue(readWorkforceSolution(solution),'Saved solution is unreadable.');
 const result=solution.results.find(item=>item.id===resultId),review=result&&readSavedWorkforceReview(solution,result);
 requireValue(result&&review,'Saved calculation is unavailable or unreadable.');return {result,review};
}
export async function loadSolutionCards(solution:WorkforceSolution,resultId:string,history:unknown):Promise<CardsSnapshot>{
 const {review}=savedReview(solution,resultId);await pinFingerprint(solution,resultId,history);let alternative:LocalWorkforceReview|null=null,historyNotice='';
 if(!Array.isArray(history)||history.length>10)historyNotice='Alternative history is unreadable; original records retained.';
 else for(const raw of history){const item=await readLocalWorkforceReview(raw,solution);if(!item){historyNotice='Some alternative history is unreadable; original records retained.';continue}if(item.binding.evidenceResultId===resultId)alternative=item}
 const make=(id:string,title:string,input:WorkforcePlanInput,plan:WorkforceIncrement,slot:number|null=null):SolutionCard=>({id,title,input,plan,reviewId:slot===null?null:alternative!.id,slot});
 const base=make('saved','Saved response mix',review.input,review.proposed),benchmark=make('hiring-only','Hiring-only benchmark',review.hireOnly.input,review.hireOnly);
 const cards=alternative?[base,...alternative.reviewedRevisions.map((input,i)=>make(`alternative-${i+1}`,`Saved alternative ${i+1}`,input,alternative!.comparisons.find(c=>c.optionId===`revision-${i+1}`)!.plan,i))]:[base,benchmark];
 requireValue(cards.length<=3,'At most two saved alternatives are supported.');
 return {cards,benchmark,sourceHash:await localFingerprint(cardSourceIdentity(solution,resultId)),review,alternative,historyNotice};
}
export type WhatIfPreview={schemaVersion:1;sourceHash:string;historyHash:string;cardId:string;priority:CardPriority;draft:WorkforcePlanInput;cards:SolutionCard[];benchmark:SolutionCard;changedFields:WorkforcePlanField[]};
export async function previewSolutionWhatIf(solution:WorkforceSolution,resultId:string,history:unknown,cardId:string,raw:unknown,priority:CardPriority):Promise<WhatIfPreview>{
 const {result}=savedReview(solution,resultId);requireValue(!solution.pending&&solutionResultIsCurrent(solution,result),'Select the current saved calculation before tailoring.');
 const snapshot=await loadSolutionCards(solution,resultId,history),original=snapshot.cards.find(card=>card.id===cardId);requireValue(original,'The selected option is unavailable.');
 const draft=validateWorkforcePlanInput(raw);requireValue(fixedFields.every(key=>draft[key]===original.input[key]),'Role, business unit, demand and horizon remain fixed to saved evidence.');
 const shared=Object.fromEntries(sharedWhatIfFields.map(key=>[key,draft[key]]));
 const calculate=(card:SolutionCard)=>{const input=validateWorkforcePlanInput(card.id===cardId?draft:{...card.input,...shared});return {...card,input,plan:calculateWorkforceIncrement(input,snapshot.review.timing as RecruitingTimingEvidence|null)}};
 const cards=snapshot.cards.map(calculate),benchmark=calculate(snapshot.benchmark);rankSolutionCards(cards,priority);
 return {schemaVersion:1,sourceHash:snapshot.sourceHash,historyHash:await localFingerprint(history),cardId,priority,draft,cards,benchmark,changedFields:workforcePlanFields.filter(key=>draft[key]!==snapshot.review.input[key])};
}
export async function saveSolutionWhatIf(solution:WorkforceSolution,resultId:string,history:unknown,preview:WhatIfPreview,runId:string,newResultId:string,at:string){
 const replay=await previewSolutionWhatIf(solution,resultId,history,preview.cardId,preview.draft,preview.priority);
 requireValue(same(replay,preview),'Draft, source evidence or comparison history changed; recalculate before saving.');
 requireValue(preview.changedFields.length,'This option matches the saved inputs; no revised solution is needed.');
 const snapshot=await loadSolutionCards(solution,resultId,history),card=preview.cards.find(item=>item.id===preview.cardId)!;
 const prior=currentSolutionVersion(solution),inputs=structuredClone(prior.inputs);
 for(const key of workforcePlanFields){const sections=solutionSections.filter(section=>Object.hasOwn(inputs[section],key));requireValue(sections.length===1,'Saved input sections are ambiguous.');inputs[sections[0]][key]=preview.draft[key]}
 const origin={schemaVersion:1,kind:'local-what-if',sourceGoalId:solution.goalId,sourceSolutionId:solution.id,sourceVersion:prior.version,sourceResultId:resultId,sourceHash:await pinFingerprint(solution,resultId,history),alternativeReviewId:card.reviewId,alternativeSlot:card.slot,alternativeHash:card.reviewId&&snapshot.alternative?await localFingerprint(snapshot.alternative):null,searchFingerprint:card.reviewId&&snapshot.alternative?.schemaVersion===2?snapshot.alternative.selectionOrigin.search.fingerprint:null,method:workforceIncrementMethodVersion,changedFields:preview.changedFields,priority:preview.priority};
 const hireOnly=calculateWorkforceIncrement({...preview.draft,build:'0',move:'0',buy:preview.draft.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},snapshot.review.timing as RecruitingTimingEvidence|null);
 const payload={...snapshot.review,calculatedAt:at,input:preview.draft,proposed:card.plan,hireOnly,localWhatIf:origin};
 const revised=reviseWorkforceSolution(solution,prior.version,inputs,'sidebar','Saved reviewed local what-if; retained source evidence',at),run=beginSolutionRun(revised,currentSolutionVersion(revised).version,runId,['brief'],at);
 const next=completeSolutionRun(run.state,run.ticket,[{id:newResultId,kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:payload as unknown as Record<string,Json>}],at);
 requireValue(readSavedWorkforceReview(next,next.results.at(-1)!),'Revised calculation failed local validation.');return next;
}
export type SolutionPin={schemaVersion:1;id:string;createdAt:string;goalId:string;solutionId:string;version:number;resultId:string;fingerprint:string};
export function readSolutionPins(raw:unknown):SolutionPin[]|null{
 if(!Array.isArray(raw)||raw.length>10)return null;
 const keys=['schemaVersion','id','createdAt','goalId','solutionId','version','resultId','fingerprint'];
 if(raw.some(p=>!p||typeof p!=='object'||Object.keys(p).length!==keys.length||!keys.every(k=>Object.hasOwn(p,k))||p.schemaVersion!==1||!['id','goalId','solutionId','resultId'].every(k=>typeof p[k]==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(p[k]))||!Number.isSafeInteger(p.version)||p.version<1||typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||typeof p.fingerprint!=='string'||! /^[a-f0-9]{64}$/.test(p.fingerprint)))return null;
 if(new Set(raw.map(p=>p.id)).size!==raw.length||new Set(raw.map(p=>`${p.goalId}:${p.solutionId}:${p.resultId}`)).size!==raw.length)return null;return raw;
}
async function pinFingerprint(solution:WorkforceSolution,resultId:string,history:unknown=[]):Promise<string>{const {result}=savedReview(solution,resultId);
 const origin=result.payload.localWhatIf as Record<string,Json>|undefined;
 if(origin){
  requireValue(await pinFingerprint(solution,String(origin.sourceResultId),history)===origin.sourceHash,'Local what-if source evidence or lineage changed; original records retained.');
  if(origin.alternativeReviewId!==null){
   requireValue(Array.isArray(history)&&history.length<=10,'Saved alternative lineage is unavailable; original records retained.');
   const matches=history.filter(raw=>raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.id===origin.alternativeReviewId);
   requireValue(matches.length===1,'Saved alternative lineage is missing or ambiguous; original records retained.');
   const review=await readLocalWorkforceReview(matches[0],solution);
   requireValue(review&&review.binding.evidenceResultId===origin.sourceResultId&&review.binding.goalId===solution.goalId&&review.binding.solutionId===solution.id&&review.reviewedRevisions[Number(origin.alternativeSlot)]&&await localFingerprint(review)===origin.alternativeHash&&(review.schemaVersion===2?review.selectionOrigin.search.fingerprint:null)===origin.searchFingerprint,'Saved alternative lineage changed; original records retained.');
  }
 }
 return localFingerprint({goalId:solution.goalId,solutionId:solution.id,result,version:solution.versions.find(v=>v.version===result.version),evidence:solution.evidence.filter(e=>result.evidenceIds.includes(e.id))})}
export async function pinSavedSolution(raw:unknown,solution:WorkforceSolution,resultId:string,id:string,at:string,history:unknown=[]){
 const pins=readSolutionPins(raw);requireValue(pins,'Pin history is unreadable; records retained.');const {result}=savedReview(solution,resultId);
 requireValue(pins.length<10,'Ten-pin limit reached; unpin explicitly before adding another.');requireValue(!pins.some(p=>p.solutionId===solution.id&&p.resultId===resultId),'This saved calculation is already pinned.');
 const next=[...pins,{schemaVersion:1 as const,id,createdAt:at,goalId:solution.goalId,solutionId:solution.id,version:result.version,resultId,fingerprint:await pinFingerprint(solution,resultId,history)}];requireValue(readSolutionPins(next),'Invalid pin identity.');return next;
}
export async function resolveSolutionPin(pin:SolutionPin,solution:WorkforceSolution|null,history:unknown=[]){try{requireValue(readSolutionPins([pin])&&solution&&pin.goalId===solution.goalId&&pin.solutionId===solution.id,'Unavailable');const {result}=savedReview(solution,pin.resultId);requireValue(result.version===pin.version&&await pinFingerprint(solution,pin.resultId,history)===pin.fingerprint,'Unavailable');return {resultId:result.id,historical:currentSolutionVersion(solution).version!==result.version||!solutionResultIsCurrent(solution,result)}}catch{return null}}
export function unpinSolution(raw:unknown,id:string){const pins=readSolutionPins(raw);requireValue(pins,'Pin history is unreadable; records retained.');return pins.filter(pin=>pin.id!==id)}
