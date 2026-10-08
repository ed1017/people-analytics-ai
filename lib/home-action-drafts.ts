// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys,readHomeActionProposal,type HomeAction,type HomeActionProposal} from './home-action-proposal.ts';
import {homeEvidenceBindingValue} from './home-pack.mjs';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {CHAT_MODEL} from './chat-model.ts';
export const homeActionDraftField='homeActionDraftV1' as const;
export type ActionBinding={version:1;goalId:string;goal:string;evidenceDigest:string;planningDigest:string};
export type ActionUsage={model:string;inputTokens:number|null;cachedInputTokens:number|null;outputTokens:number|null;reasoningTokens:number|null;totalTokens:number|null;latencyMs:number|null};
export type ActionDraft={version:1;status:'proposed';binding:ActionBinding;preparedAt:string;proposal:HomeActionProposal;localEvaluations:[];usage:ActionUsage};
const canonical=(value:unknown):string=>JSON.stringify(value,(_,item)=>plain(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
export async function actionBinding(goalId:string,goal:string,packet:unknown,localPlanningInputs:unknown):Promise<ActionBinding>{
 if(!goalId||goalId.length>120||!goal.trim()||goal.length>240||!validateJson(localPlanningInputs)||new TextEncoder().encode(canonical(localPlanningInputs)).length>128*1024)throw Error('Action preparation context is invalid.');
 return {version:1,goalId,goal,evidenceDigest:await digest(homeEvidenceBindingValue(packet)),planningDigest:await digest(localPlanningInputs)};
}
export function validActionBinding(raw:unknown):raw is ActionBinding{const value=plain(raw);return !!value&&exactKeys(value,['version','goalId','goal','evidenceDigest','planningDigest'])&&value.version===1&&typeof value.goalId==='string'&&!!value.goalId&&value.goalId.length<=120&&typeof value.goal==='string'&&!!value.goal.trim()&&value.goal.length<=240&&typeof value.evidenceDigest==='string'&&/^[a-f0-9]{64}$/.test(value.evidenceDigest)&&typeof value.planningDigest==='string'&&/^[a-f0-9]{64}$/.test(value.planningDigest)}
export const actionBindingKey=(binding:ActionBinding)=>canonical(binding);
const count=(value:unknown,max=100_000_000)=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=max?Number(value):null;
export function actionUsage(raw:unknown,latencyMs:unknown):ActionUsage{
 const value=plain(raw);return {model:CHAT_MODEL,inputTokens:count(value?.input_tokens),cachedInputTokens:count(plain(value?.input_tokens_details)?.cached_tokens),outputTokens:count(value?.output_tokens),reasoningTokens:count(plain(value?.output_tokens_details)?.reasoning_tokens),totalTokens:count(value?.total_tokens),latencyMs:count(latencyMs,3_600_000)};
}
export function readActionDraft(raw:unknown,binding:ActionBinding,packet:unknown):ActionDraft|null{
 if(!validActionBinding(binding)||!validateJson(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>32768)return null;
 const draft=plain(raw);if(!draft||!exactKeys(draft,['version','status','binding','preparedAt','proposal','localEvaluations','usage'])||draft.version!==1||draft.status!=='proposed'||actionBindingKey(draft.binding as ActionBinding)!==actionBindingKey(binding)||typeof draft.preparedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(draft.preparedAt)||!Number.isFinite(Date.parse(draft.preparedAt))||!Array.isArray(draft.localEvaluations)||draft.localEvaluations.length)return null;
 const usage=plain(draft.usage);if(!usage||!exactKeys(usage,['model','inputTokens','cachedInputTokens','outputTokens','reasoningTokens','totalTokens','latencyMs'])||usage.model!==CHAT_MODEL||Object.entries(usage).some(([key,value])=>key!=='model'&&value!==null&&count(value,key==='latencyMs'?3_600_000:100_000_000)===null))return null;
 const proposal=readHomeActionProposal(draft.proposal,binding.goal,packet);return proposal?structuredClone({...draft,proposal}) as ActionDraft:null;
}
export function actionDraftPatch(draft:ActionDraft){return {field:homeActionDraftField,value:structuredClone(draft)}}
export const actionSignature=(action:HomeAction)=>canonical(action);
export type ActionReview={confirmed:true;binding:ActionBinding;actionSignature:string;scope:'additional_capacity'|'retention_program'};
export function actionCalculatorRoute(action:HomeAction,binding:ActionBinding,review:ActionReview|null){
 if(action.route==='unmodeled')return 'unmodeled';
 if(!review||review.confirmed!==true||actionBindingKey(review.binding)!==actionBindingKey(binding)||review.actionSignature!==actionSignature(action))return 'review_required';
 if(action.route==='capacity'&&review.scope==='additional_capacity')return 'capacity';
 if(action.route==='retention_what_if'&&review.scope==='retention_program')return 'retention_what_if';
 return 'scope_mismatch';
}
