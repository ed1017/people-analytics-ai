import type {SolutionState} from './home-solution-conversation';
// @ts-expect-error Native Node tests share application source.
import {calculateRequiredStaffing,requiredStaffingFields,type StaffingInputField} from './required-staffing.ts';

type ReceiptContext={requestId:string;endpoint:string;status:number;startedAt:string;receivedAt:string;elapsedMs:number};
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const count=(value:unknown,max=4000000)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;
const timestamp=(value:string)=>/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))?value:null;
const tiers=['default','standard','auto','flex','scale','priority','fast','ultrafast'];

/** Only scenario quantities from an already validated reply; no role labels, quotes or source packets. */
function calculatorReceipt(state:SolutionState|undefined){
 const review=state?.requiredStaffing;if(!review)return null;
 const result=calculateRequiredStaffing(review.inputs),fields=requiredStaffingFields.filter(field=>field!=='role');
 return {stateValidated:true,revision:review.revision,
  inputs:Object.fromEntries(fields.map(field=>[field,review.inputs[field]])),
  origins:Object.fromEntries(fields.map(field=>[field,review.origins[field as StaffingInputField]?.kind??null])),
  options:result.options.map(({train,redeploy,hire,coveredRoles,listedCash,completeCash,plannedTrainingHours,totalTrainingHours,newHireTrainingUnspecified,readyAfterMonths,coverage,budgetStatus})=>({train,redeploy,hire,coveredRoles,listedCash,completeCash,plannedTrainingHours,totalTrainingHours,newHireTrainingUnspecified,readyAfterMonths,coverage,budgetStatus})),
  workingProposalCount:state.working.length,analysisCount:state.analyses.length};
}

/** This response field exists only on the isolated Preview route. Projection never persists raw data. */
export function visibleProviderPreviewReceipt(raw:unknown,context:ReceiptContext,validatedState?:SolutionState){
 const data=record(raw);if(!Object.hasOwn(data,'providerReceipt'))return null;
 const receipt=record(data.providerReceipt),usage=record(data.usage),attempts=count(receipt.modelAttempts,2);
 const sourceRounds=Array.isArray(receipt.providerRounds)?receipt.providerRounds:[];
 const rounds=sourceRounds.slice(0,2).map(item=>{
  const r=record(item);
  return {attempt:count(r.attempt,2),elapsedMs:count(r.elapsedMs,600000),model:r.model==='gpt-6.1-sol'?r.model:null,
   serviceTier:typeof r.serviceTier==='string'&&tiers.includes(r.serviceTier)?r.serviceTier:null,
   inputTokens:count(r.inputTokens),cachedInputTokens:count(r.cachedInputTokens),outputTokens:count(r.outputTokens),reasoningTokens:count(r.reasoningTokens),totalTokens:count(r.totalTokens)};
 });
 const providerUsageComplete=receipt.version===1&&uuid(receipt.correlationId)!==null&&attempts!==null&&sourceRounds.length===attempts&&rounds.every((r,i)=>
  r.attempt===i+1&&r.model==='gpt-6.1-sol'&&r.serviceTier==='default'&&r.inputTokens!==null&&r.inputTokens<=1050000&&r.cachedInputTokens!==null&&r.cachedInputTokens<=r.inputTokens&&r.outputTokens!==null&&r.outputTokens<=5000&&r.reasoningTokens!==null&&r.reasoningTokens<=r.outputTokens&&r.totalTokens===r.inputTokens+r.outputTokens);
 return {version:1,requestId:uuid(context.requestId),correlationId:uuid(receipt.correlationId),
  endpoint:context.endpoint==='/api/home-solution-conversation'?context.endpoint:null,method:'POST',httpStatus:count(context.status,599),
  startedAt:timestamp(context.startedAt),receivedAt:timestamp(context.receivedAt),responseElapsedMs:count(context.elapsedMs,600000),
  applicationOutcome:context.status>=200&&context.status<300?(validatedState?'validated':'unverified'):'failed',
  providerUsageComplete,modelAttempts:attempts,modelRounds:count(usage.modelRounds,2),toolCalls:count(usage.toolCalls,6),rounds,
  calculator:calculatorReceipt(validatedState)};
}
export type VisibleProviderPreviewReceipt=NonNullable<ReturnType<typeof visibleProviderPreviewReceipt>>;
