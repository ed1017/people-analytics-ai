import type {BundleDraft,BundleResult} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,reconcileBundle} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleChatEditIntent,previewBundleChatEdit,acceptBundleChatEdit} from './home-bundle-chat-edit.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {combinePlanSnapshots,type CombinationReview} from './home-plan-combination.ts';

export const planAlternativesField='homePlanAlternativesV1';
export type AlternativeContext={goalId:string;goal:string};
export type AlternativeSourceRef={id:string;revision:number};
export type AlternativeOperation={kind:'edit'|'combine';text:string;sourceIds:string[];review?:CombinationReview};
export type PlanAlternative={id:string;number:number;draft:BundleDraft;result:BundleResult;sourceRefs:AlternativeSourceRef[];requestId:string|null;operation:AlternativeOperation|null;notes:string[];deleted:boolean;applied:boolean};
export type AlternativeAttachment={id:string;planId:string;attachedAt:string};
export type PlanAlternatives={version:1;goalId:string;goal:string;nextNumber:number;order:string[];plans:PlanAlternative[];attachments:AlternativeAttachment[]};
export type AlternativeRequest={requestId:string;text:string;sourceIds:string[];expectedInputs:Record<string,string>;review?:CombinationReview};
export type AlternativeOutcome={status:'ready';catalog:PlanAlternatives;plan:PlanAlternative;reused:boolean}|{status:'not-an-edit'}|{status:'needs-review';questions:string[]};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const idValid=(id:string)=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id);
function fail(message:string):never{throw Error(message);}
function assertContext(catalog:PlanAlternatives,context:AlternativeContext){if(catalog.goalId!==context.goalId||catalog.goal!==context.goal)fail('The active goal changed. Review the current goal’s plans.');}

/** Alternative IDs and display numbers are independent of the calculator’s legacy A/B/C slots. */
export function createPlanAlternatives(context:AlternativeContext,sources:{id:string;draft:BundleDraft}[]):PlanAlternatives{
 if(!idValid(context.goalId)||!context.goal.trim()||!sources.length)fail('A saved goal and its actual plan snapshots are required.');
 const plans=sources.map(({id,draft},index):PlanAlternative=>{
  if(!idValid(id)||!readBundleDraft(draft)||draft.binding.goalId!==context.goalId||draft.binding.goal!==context.goal)fail('Every original plan must belong to this exact goal.');
  return {id,number:index+1,draft:structuredClone(draft),result:reconcileBundle(draft),sourceRefs:[],requestId:null,operation:null,notes:[],deleted:false,applied:false};
 });
 const catalog:PlanAlternatives={version:1,...context,nextNumber:plans.length+1,order:plans.map(plan=>plan.id),plans,attachments:[]};
 if(!readPlanAlternatives(catalog,context))fail('The original plan catalog cannot be verified.');return catalog;
}

/** No migration/write: old Home history remains under its existing fields. */
export function readPlanAlternatives(raw:unknown,context:AlternativeContext):PlanAlternatives|null{
 try{
  const catalog=raw as PlanAlternatives;
  if(!catalog||catalog.version!==1||catalog.goalId!==context.goalId||catalog.goal!==context.goal||!Array.isArray(catalog.plans)||!catalog.plans.length||catalog.plans.length>30||!Array.isArray(catalog.order)||!Array.isArray(catalog.attachments)||catalog.attachments.length>30||new TextEncoder().encode(JSON.stringify(catalog)).length>450000)return null;
  const seen=new Map<string,PlanAlternative>(),numbers=new Set<number>(),requests=new Set<string>();
  for(const plan of catalog.plans){
   if(!idValid(plan.id)||seen.has(plan.id)||!Number.isSafeInteger(plan.number)||plan.number<1||numbers.has(plan.number)||!readBundleDraft(plan.draft)||plan.draft.binding.goalId!==context.goalId||plan.draft.binding.goal!==context.goal||typeof plan.deleted!=='boolean'||typeof plan.applied!=='boolean'||!Array.isArray(plan.sourceRefs)||!Array.isArray(plan.notes)||!plan.notes.every(note=>typeof note==='string')||!equal(reconcileBundle(plan.draft),plan.result))return null;
   if(new Set(plan.sourceRefs.map(ref=>ref.id)).size!==plan.sourceRefs.length||plan.sourceRefs.some(ref=>!seen.has(ref.id)||seen.get(ref.id)!.draft.revision!==ref.revision)||plan.number!==seen.size+1)return null;
   if(plan.requestId!==null){if(!idValid(plan.requestId)||requests.has(plan.requestId)||!plan.operation||!['edit','combine'].includes(plan.operation.kind)||typeof plan.operation.text!=='string'||!plan.operation.text.trim()||plan.operation.text.length>1200||!equal(plan.operation.sourceIds,plan.sourceRefs.map(ref=>ref.id))||plan.sourceRefs.length!==(plan.operation.kind==='edit'?1:2))return null;requests.add(plan.requestId);}
   else if(plan.sourceRefs.length||plan.operation!==null)return null;
   seen.set(plan.id,plan);numbers.add(plan.number);
  }
  if(catalog.nextNumber!==Math.max(...numbers)+1||new Set(catalog.order).size!==catalog.order.length||catalog.order.length!==catalog.plans.filter(plan=>!plan.deleted).length||catalog.order.some(id=>!seen.has(id)||seen.get(id)!.deleted))return null;
  if(new Set(catalog.attachments.map(item=>item.id)).size!==catalog.attachments.length||catalog.attachments.some(item=>!idValid(item.id)||!seen.has(item.planId)||!/^\d{4}-\d\d-\d\dT/.test(item.attachedAt)||!Number.isFinite(Date.parse(item.attachedAt))))return null;
  return structuredClone(catalog);
 }catch{return null;}
}
function checked(raw:PlanAlternatives,context:AlternativeContext){assertContext(raw,context);const catalog=readPlanAlternatives(raw,context);if(!catalog)fail('Saved alternatives cannot be verified. Earlier plans are kept.');return catalog;}

const combinationCourtesy=(text:string)=>text.trim().replace(/^(?:please\s+|(?:can|could|would)\s+you\s+|i(?:’|')?d like to\s+|i want to\s+)/i,'');
export function combinationIntent(text:string){return /^(?:combine|merge|join)\b/i.test(combinationCourtesy(text));}
function combinationOnly(text:string){
 const label='(?:(?:action\\s+)?plans?\\s*)?#?\\s*\\d+';
 return new RegExp('^(?:combine|merge|join)\\s+(?:the\\s+)?'+label+'\\s*(?:and|with|\\+|&)\\s*'+label+'(?:\\s+into\\s+(?:one|a single)(?:\\s+(?:action\\s+)?plan)?)?(?:\\s+for\\s+this\\s+goal)?(?:\\s+please)?[.!?]?$','i').test(combinationCourtesy(text));
}
/** Resolve labels, never indexes: #1 still means #1 after display reordering or deletion. */
export function resolveNumberedPlans(text:string,catalog:PlanAlternatives,context:AlternativeContext):PlanAlternative[]{
 const valid=checked(catalog,context),numbers=[...text.matchAll(/(?:\b(?:action\s+)?plans?\s*#?\s*|#)(\d+)\b/gi)].map(match=>Number(match[1]));
 // Also accept the unnumbered second half of “plans 1 and 2”.
 const pair=text.match(/\b(?:action\s+)?plans?\s*#?\s*(\d+)\s*(?:and|with|\+|&)\s*(?:(?:action\s+)?plan\s*)?#?\s*(\d+)\b/i);
 if(pair&&!numbers.includes(Number(pair[2])))numbers.push(Number(pair[2]));
 if(!numbers.length)fail('Name the Action Plan number shown on its tab.');
 if(new Set(numbers).size!==numbers.length)fail('Choose different Action Plan numbers.');
 return numbers.map(number=>{const plan=valid.plans.find(item=>item.number===number&&!item.deleted);if(!plan)fail(`Action Plan #${number} is not available in this goal.`);return plan;});
}

function sourcesFor(catalog:PlanAlternatives,request:AlternativeRequest){
 if(!idValid(request.requestId)||!request.text.trim()||request.text.length>1200||!request.sourceIds.length||new Set(request.sourceIds).size!==request.sourceIds.length)fail('Review one request with distinct current source plans.');
 return request.sourceIds.map(id=>{const source=catalog.plans.find(plan=>plan.id===id&&!plan.deleted);if(!source)fail('A selected source plan is no longer available.');if(request.expectedInputs[id]!==bundleInputKey(source.draft))fail('A source plan revision changed. Review the current plans before continuing.');return source;});
}
function retry(catalog:PlanAlternatives,request:AlternativeRequest,operation:AlternativeOperation):AlternativeOutcome|null{
 const prior=catalog.plans.find(plan=>plan.requestId===request.requestId);if(!prior)return null;
 if(!equal(prior.operation,operation))fail('This retry token belongs to a different request.');
 if(prior.deleted)fail('This request’s alternative was removed. Use a new request to create another alternative.');
 return {status:'ready',catalog,plan:structuredClone(prior),reused:true};
}
function append(catalog:PlanAlternatives,request:AlternativeRequest,operation:AlternativeOperation,sources:PlanAlternative[],draft:BundleDraft,result:BundleResult,notes:string[]):AlternativeOutcome{
 const number=catalog.nextNumber;let id=`alternative-${number}`;while(catalog.plans.some(plan=>plan.id===id))id+='x';
 const plan:PlanAlternative={id,number,draft:structuredClone(draft),result:structuredClone(result),sourceRefs:sources.map(source=>({id:source.id,revision:source.draft.revision})),requestId:request.requestId,operation:structuredClone(operation),notes:[...notes],deleted:false,applied:false};
 catalog.plans.push(plan);catalog.order.push(id);catalog.nextNumber++;
 if(!readPlanAlternatives(catalog,catalog))fail('The alternative history is full or cannot be verified. Earlier plans are kept.');
 return {status:'ready',catalog,plan:structuredClone(plan),reused:false};
}

/** Returns a new numbered proposal; never edits its source, applies it, or attaches it. */
export function proposeEditedAlternative(raw:PlanAlternatives,context:AlternativeContext,request:AlternativeRequest):AlternativeOutcome{
 const catalog=checked(raw,context);if(!bundleChatEditIntent(request.text).edit||combinationIntent(request.text))return {status:'not-an-edit'};
 const operation:AlternativeOperation={kind:'edit',text:request.text,sourceIds:request.sourceIds};
 const sources=sourcesFor(catalog,request),existing=retry(catalog,request,operation);if(existing)return existing;
 if(sources.length!==1)fail('Choose one source Action Plan to adjust.');
 let text=request.text;
 if(/\b(?:action\s+)?plan\s*#?\s*\d+\b|#\d+/i.test(text)){
  const named=resolveNumberedPlans(text,catalog,context);if(named.length!==1||named[0].id!==sources[0].id)fail('The numbered plan does not match the selected source.');
  text=text.replace(/\b(?:in|for|on)\s+(?:action\s+)?plan\s*#?\s*\d+\b\s*[:,]?\s*/i,' ').replace(/^(?:action\s+)?plan\s*#?\s*\d+\s*[:,]?\s*/i,'').trim();
 }
 // Numbering is resolved above; the legacy parser need not impose its three-option UI limit.
 const source=sources[0].draft,preview=previewBundleChatEdit(source,text),draft=acceptBundleChatEdit(source,preview);
 return append(catalog,request,operation,sources,draft,reconcileBundle(draft),[]);
}
export function proposeCombinedAlternative(raw:PlanAlternatives,context:AlternativeContext,request:AlternativeRequest):AlternativeOutcome{
 const catalog=checked(raw,context);if(!combinationIntent(request.text))return {status:'not-an-edit'};
 if(!combinationOnly(request.text))return {status:'needs-review',questions:['The combination includes additional instructions. Review those changes explicitly so no activities or assumptions are silently dropped.']};
 const operation:AlternativeOperation={kind:'combine',text:request.text,sourceIds:request.sourceIds,...(request.review?{review:request.review}:{})};
 const sources=sourcesFor(catalog,request),existing=retry(catalog,request,operation);if(existing)return existing;
 const named=resolveNumberedPlans(request.text,catalog,context);if(named.length!==2||!equal(named.map(plan=>plan.id),request.sourceIds))fail('Choose the two current numbered plans named in this combination.');
 const combined=combinePlanSnapshots(sources,request.review);if(combined.status!=='ready')return combined;
 return append(catalog,request,operation,sources,combined.draft,combined.result,combined.notes);
}

/** Metadata-only view changes: deleted plans remain as lineage/attachment tombstones. */
export function changeAlternativeView(raw:PlanAlternatives,context:AlternativeContext,change:{order?:string[];deleteId?:string}):PlanAlternatives{
 const catalog=checked(raw,context);
 if(change.deleteId){const plan=catalog.plans.find(item=>item.id===change.deleteId&&!item.deleted);if(!plan)fail('This alternative is unavailable.');plan.deleted=true;catalog.order=catalog.order.filter(id=>id!==plan.id);}
 if(change.order)catalog.order=[...change.order];
 if(!readPlanAlternatives(catalog,context))fail('Keep each available alternative once in the display order.');return catalog;
}
export function applyPlanAlternative(raw:PlanAlternatives,context:AlternativeContext,planId:string,expectedInput:string):PlanAlternatives{
 const catalog=checked(raw,context),plan=catalog.plans.find(item=>item.id===planId&&!item.deleted);
 if(!plan||bundleInputKey(plan.draft)!==expectedInput)fail('The alternative changed. Review it before applying.');plan.applied=true;return catalog;
}
/** An explicit new attachment references the immutable alternative. Existing attachments remain intact. */
export function attachPlanAlternative(raw:PlanAlternatives,context:AlternativeContext,planId:string,confirmation:{inputKey:string;attachmentId:string;at:string;acknowledgeUnknowns:boolean}):PlanAlternatives{
 const catalog=checked(raw,context),plan=catalog.plans.find(item=>item.id===planId&&!item.deleted);
 if(!plan||bundleInputKey(plan.draft)!==confirmation.inputKey)fail('Review this exact alternative before attaching.');
 const existing=catalog.attachments.find(item=>item.id===confirmation.attachmentId);if(existing){if(existing.planId!==planId)fail('That attachment ID belongs to another alternative.');return catalog;}
 if(plan.result.issues.length&&!confirmation.acknowledgeUnknowns)fail('Acknowledge unresolved assumptions before attaching this proposal.');
 catalog.attachments.push({id:confirmation.attachmentId,planId,attachedAt:confirmation.at});
 if(!readPlanAlternatives(catalog,context))fail('This attachment could not be verified. Existing snapshots are kept.');return catalog;
}
