/** Conversation-owned provisional business planning. No mode selection, keyword routing or save. */
import type {SolutionRequest} from './home-solution-conversation';
import type {DemandContext,DemandReview} from './swp-demand';
import type {StaffingInputs,ServiceStaffingResult} from './home-service-staffing';
// @ts-expect-error Native Node tests share TypeScript source.
import {demandContext,readDemandReview,SWP_DEMAND_MODE,serviceDemandSchema} from './swp-demand.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {reviewReferencedDemandTool,reviseReferencedDemandTool,createReferencedDemandReview,reviseReferencedDemandReview,referencedDemandView,demandReferenceId} from './swp-demand-reference.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {compareServiceStaffingTool,editStaffingInputs,readStaffingInputs,calculateServiceStaffing} from './home-service-staffing.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical} from './workforce-mix-search-core.ts';
export type BusinessPlanning={version:1;context:DemandContext;scopeKey:string;review:DemandReview;staffing:{inputs:StaffingInputs;result:ServiceStaffingResult}|null};
const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const scopeKey=(request:SolutionRequest)=>JSON.stringify([request.scope,request.filters]);
const string={type:'string',minLength:1,maxLength:400};
export const clearBusinessPlanningTool={type:'function' as const,name:'clear_business_planning',description:'Clear only this provisional business discussion or its staffing comparison when the current user changes the objective/scope or asks to clear it. Ordinary side questions need not clear it. Requires the current user turn and exact quote. Never deletes saved plans, goals or history.',strict:true,parameters:{type:'object',properties:{target:{type:'string',enum:['discussion','staffing']},turnId:string,quote:string},required:['target','turnId','quote'],additionalProperties:false}};
// Reuse checked demand references without advertising the legacy example shortcut.
const naturalReviewTool={...reviewReferencedDemandTool,description:'Initial provisional workload review for the actual literal role slice or null. Missing inputs remain Unknown or explicitly proposed; never infer availability from headcount. No automatic acceptance or save.',parameters:structuredClone(reviewReferencedDemandTool.parameters)};
naturalReviewTool.parameters.properties.spec.properties!.scope=structuredClone(serviceDemandSchema.properties!.scope);
export const businessPlanningTools=[naturalReviewTool,reviseReferencedDemandTool,compareServiceStaffingTool,clearBusinessPlanningTool];
export function readBusinessPlanning(raw:unknown):BusinessPlanning|null{
 if(raw===undefined||raw===null)return null;
 const s=raw as BusinessPlanning;
 if(!s||Object.keys(s).sort().join()!=='context,review,scopeKey,staffing,version'||s.version!==1||typeof s.scopeKey!=='string'||s.scopeKey.length>2000||!demandContext(s.context)||Object.keys(s.context).sort().join()!=='boundGoal,classification,conversationMode,datasetToken,intakeId,revision')throw Error('The provisional business context cannot be verified.');
 readDemandReview(s.review,s.context);
 if(s.staffing){if(Object.keys(s.staffing).sort().join()!=='inputs,result')throw Error('Invalid staffing state.');readStaffingInputs(s.staffing.inputs);if(!equal(calculateServiceStaffing(s.review,s.staffing.inputs),s.staffing.result))throw Error('The provisional staffing calculation changed.');}
 return structuredClone(s);
}
export function currentBusinessPlanning(request:SolutionRequest,datasetToken:string){
 const s=readBusinessPlanning(request.state.businessPlanning);
 if(s&&(s.context.datasetToken!==datasetToken||!equal(s.context.boundGoal,request.goal)||s.scopeKey!==scopeKey(request)))throw Error('The business planning goal, dataset or source scope changed. Clear this provisional discussion before continuing.');
 return s;
}
export function businessPlanningView(s:BusinessPlanning|null,requestId:string,step=0){
 return s?{demandProposal:referencedDemandView(s.review,s.context,demandReferenceId(requestId,step)),staffing:s.staffing?{inputs:s.staffing.inputs.values,result:s.staffing.result}:null,accepted:false,saved:false}:null;
}
export async function runBusinessPlanningTool(request:SolutionRequest,datasetToken:string,s:BusinessPlanning|null,name:string,args:Record<string,unknown>,step:number){
 const tool=businessPlanningTools.find(t=>t.name===name);if(!tool)throw Error('Unsupported business planning tool.');assertSolutionShape(args,tool.parameters,'business planning tool');
 const turns=[...request.state.turns.filter(t=>t.role==='user').map(({id,text})=>({id,text})),request.message];
 if(name===clearBusinessPlanningTool.name){
  if(args.turnId!==request.message.id||typeof args.quote!=='string'||!request.message.text.includes(args.quote))throw Error('Clearing requires a current-user quote.');
  return args.target==='discussion'?null:s?{...s,staffing:null}:null;
 }
 if(name===reviewReferencedDemandTool.name){
  if(s)throw Error('A demand review already exists. Use its current reference for corrections, or explicitly clear the prior objective.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([datasetToken,request.goal,request.requestId,request.message.id]))))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40);
  const context:DemandContext={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-'+digest,datasetToken,boundGoal:structuredClone(request.goal),revision:1};
  const raw=args.spec as Record<string,unknown>;
  // A natural objective keeps its literal role slice; the demo shortcut is not an implicit fallback.
  if(raw.scope&&typeof raw.scope==='object')throw Error('Use the actual literal role slice or null; natural planning does not substitute the example role.');
  return {version:1 as const,context,scopeKey:scopeKey(request),review:createReferencedDemandReview(raw,context,request.requestId,turns),staffing:null};
 }
 if(!s)throw Error('Create a checked demand review before comparing or correcting its assumptions.');
 if(name===reviseReferencedDemandTool.name){
  const review=reviseReferencedDemandReview(s.review,args.edit,s.context,request.requestId,turns,request.message.id,demandReferenceId(request.requestId,step));
  return {...s,review,staffing:s.staffing?{inputs:s.staffing.inputs,result:calculateServiceStaffing(review,s.staffing.inputs)}:null};
 }
 if(args.reviewRef!==demandReferenceId(request.requestId,step))throw Error('Use the current code-issued demand reference.');
 const inputs=editStaffingInputs(s.review,s.staffing?.inputs??null,args.changes,request.message,turns);
 return {...s,staffing:{inputs,result:calculateServiceStaffing(s.review,inputs)}};
}
export const businessPlanningInstructions=`BUSINESS PLANNING IN THE SAME CONVERSATION: Any naturally typed business objective can use these tools; no exact starter, special wording, example, mode switch, goal pin or input form is needed. Discuss professional-services, service-desk and other business objectives normally. Select a calculation by meaning and supported inputs, not keywords. Give a practical grounded or clearly conditional recommendation first, with the decisive reason and next step. Ground faster/cheaper/best claims in checked comparisons; otherwise state the decisive missing condition briefly.
For a narrow workload question, review_scoped_service_demand uses the existing contracts × effort / productive-capacity calculator. Use the user's literal role slice, or leave scope unknown until essential ambiguity is clarified; never rename it to the Service Analyst example. Other business mechanisms may need qualitative advice rather than this formula. A user headcount is not free capacity. Missing values may remain Unknown or be explicitly model-proposed assumptions with a brief rationale, never source facts or silently accepted inputs. Use read_clock for relative dates. Keep rates and denominators explicit. No speculative demand claim becomes workforce evidence.
Current businessPlanning.demandProposal supplies the code-issued reviewRef. Use revise_scoped_service_demand for current-user corrections; preserve all omitted values and provenance. Quantity value/period may use {ref:'retain'} and scope {ref:'retain'} or {ref:'scenario-scope'} only when applicable. A role-scope edit does not relabel old quantities. When the user changes the business objective, use clear_business_planning with their exact current-turn quote before starting a new review; ordinary side questions can retain it. This clears provisional context only, never saved plans. Never smuggle a new objective into a parameter edit.
Use compare_service_staffing when a provisional staffing comparison helps. It runs existing code from explicit typed assumptions, not from an example template. First compare may leave unknowns; propose inputs separately and visibly when useful. Omitted costs, dates, internal availability and overlap stay Unknown. Existing inputs change only through a quoted user correction. Internal pools must be explicitly separate from baseline availability and each other, with release/backfill assumptions; do not double count baseline capacity. Training cash/hours and internal salary uplift are TOTAL path amounts, not per-person rates. Do not copy the demo's costs or limits. The checked staffing comparison is not a fixed three-option menu: report only the mixes actually calculated. Proposed Action Plans may instead compare qualitative delivery strategies and decision gates, without inventing staffing numbers. Unsupported or zero demand retains its useful calculation without an invented staffing plan.
The returned demand/workforce numbers are code calculations of provisional assumptions, not measured productivity, verified delivery feasibility or a forecast. Include the actual workload shortfall, timing, incomplete costs and scope boundaries when comparing routes. Only results returned by a successful current-turn tool support new numerical claims. Unknown full costs do not establish affordability or cheapest. The compact review card shows inputs and options. Correct them through normal chat; an editor is optional. Comparison itself never accepts assumptions, pins a goal, saves a plan, records progress or applies changes. Only explicit UI review/selection can save a proposal. General read, proposal, projection and progress tools remain available; do not force unrelated questions into demand planning.`;
