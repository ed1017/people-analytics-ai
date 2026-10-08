import {readCandidateHomeContext} from './dataset-home-context.mjs';
import type {ActionBinding} from './home-action-drafts';
import type {Assumption,BundleDraft,BundleResult,BundleInputs} from './home-bundle-reconciliation';
import type {PlanAlternatives,AlternativeSourceRef} from './home-plan-alternatives';
import type {SolutionParameterEdit,SolutionCandidate,SolutionConstraint,SolutionQuantity,SolutionSource,SolutionField,SolutionMetricRef} from './home-solution-conversation-schema';
// @ts-expect-error Native fixture tests share TypeScript source.
import {assertSolutionShape,solutionParameterEditSchema,solutionCandidateSchema,solutionConstraintSchema,solutionMetricRefSchema} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {actionBinding,actionBindingKey,validActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {createBundleDraft,readBundleDraft,reviewBundleProposal as reconcileBundle,unknownAssumption,bundleInputKey} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {bundleSignature,componentOrder} from './home-solution-bundles.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {readPlanAlternatives,appendConversationAlternative} from './home-plan-alternatives.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {actionEvidenceCatalog} from './home-action-proposal.ts';
import {normalizeHomePack} from './home-pack.mjs';
import type {DashboardFilters} from './dashboard-scope';
import type {HeadcountProjection} from './home-solution-projection';
// @ts-expect-error Native fixture tests share TypeScript source.
import {readHeadcountProjections} from './home-solution-projection.ts';

export const solutionConversationEnabled=process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION==='true';
export const solutionConversationField='homeSolutionConversationV1';
export type SolutionTurn={id:string;role:'user'|'assistant';text:string};
export const solutionProvenanceVersion=1 as const;
export type SolutionEvaluation={provenanceVersion?:1;id:string;revision:number;requestId:string;message:{id:string;text:string};candidate:SolutionCandidate;binding:ActionBinding;draft:BundleDraft|null;result:BundleResult|null;sourceRefs:AlternativeSourceRef[];sourceKeys:Record<string,string>;constraints:SolutionConstraint[];interpretations:string[];changes:string[];issues:string[];blocking:string[]};
export type SolutionState={datasetEvidenceContexts?:ReturnType<typeof readCandidateHomeContext>[];version:1;verifiedMetrics:SolutionMetricRef[];turns:SolutionTurn[];constraints:SolutionConstraint[];working:SolutionEvaluation[];analyses:HeadcountProjection[];rejected:{candidateId:string;revision:number;reason:string;turnId:string}[];questions:string[];focusCandidateId:string|null};
export type SolutionRequest={version:1;requestId:string;goal:{id:string;statement:string};scope:string;filters:DashboardFilters;timeZone:string;evidence:unknown;goalContext:unknown;goalProgress?:unknown;progressEntry?:unknown;selectedId:string|null;catalog:PlanAlternatives|null;state:SolutionState;message:{id:string;text:string}};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function fail(message:string):never {throw Error(message);}
const id=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=max;
const obj=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const emptySolutionState=():SolutionState=>({version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null});
export function readSolutionState(raw:unknown):SolutionState {
 if(raw===undefined||raw===null)return emptySolutionState();
 if(!validateJson(raw)||!obj(raw)||raw.version!==1||!Array.isArray(raw.turns)||raw.turns.length>32||!Array.isArray(raw.constraints)||raw.constraints.length>5||!Array.isArray(raw.working)||raw.working.length>12||!Array.isArray(raw.rejected)||raw.rejected.length>24||!Array.isArray(raw.questions)||raw.questions.length>2||!raw.questions.every(q=>text(q,300))||!(raw.focusCandidateId===null||id(raw.focusCandidateId)))fail('The working conversation could not be read. Saved plans are preserved.');
 if(raw.datasetEvidenceContexts!==undefined){if(!Array.isArray(raw.datasetEvidenceContexts)||raw.datasetEvidenceContexts.length>16)fail('Evidence recipes exceed the supported limit.');raw.datasetEvidenceContexts.forEach(readCandidateHomeContext);}
 const state=raw as unknown as SolutionState;
 state.analyses=readHeadcountProjections(state.analyses);
 state.verifiedMetrics??=[];if(!Array.isArray(state.verifiedMetrics)||state.verifiedMetrics.length>8)fail('Checked result references are unavailable.');
 for(const ref of state.verifiedMetrics){assertSolutionShape(ref,solutionMetricRefSchema,'checked result');resolveSolutionMetric(state,ref);}
 if(new Set(state.turns.map(turn=>turn.id)).size!==state.turns.length||state.turns.some(turn=>!id(turn.id)||!['user','assistant'].includes(turn.role)||!text(turn.text,10000)))fail('The conversation history could not be verified.');
 for(const constraint of state.constraints){constraint.action??='set';}for(const constraint of state.constraints)assertSolutionShape(constraint,solutionConstraintSchema,'constraint');
 const seen=new Set<string>();
 for(const item of state.working){
  assertSolutionShape(item.candidate,solutionCandidateSchema,'working candidate');
  const key=JSON.stringify([item.id,item.revision]);
  if(!id(item.requestId)||!item.message||!id(item.message.id)||!text(item.message.text,4000))fail('Working proposal provenance is unavailable.');
  if(!id(item.id)||item.id!==item.candidate.id||!Number.isInteger(item.revision)||item.revision<1||seen.has(key)||!validActionBinding(item.binding)||!Array.isArray(item.sourceRefs)||!obj(item.sourceKeys)||!Array.isArray(item.constraints)||!Array.isArray(item.issues)||!Array.isArray(item.blocking)||!Array.isArray(item.changes)||!Array.isArray(item.interpretations)||item.draft!==null&&!readBundleDraft(item.draft)||item.draft!==null&&!same(reconcileBundle(item.draft),item.result))fail('A working proposal could not be verified. Earlier saved work is preserved.');
  seen.add(key);
  if(item.draft&&actionBindingKey(item.binding)!==actionBindingKey(item.draft.binding))fail('The working calculation belongs to another evidence context.');
  for(const constraint of item.constraints){constraint.action??='set';}for(const constraint of item.constraints)assertSolutionShape(constraint,solutionConstraintSchema,'working constraint');
  if(item.provenanceVersion!==undefined&&item.provenanceVersion!==1)fail('Unsupported conversation provenance version.');
  if(item.draft===null&&item.result!==null||item.constraints.length>5||item.sourceRefs.length>30||!Object.values(item.sourceKeys).every(key=>typeof key==='string'&&key.length<50000)||![item.issues,item.blocking,item.changes,item.interpretations].every(list=>list.length<=80&&list.every(value=>text(value,2000))))fail('A working proposal contains unsupported metadata.');
 }
 if(state.rejected.some(item=>!id(item.candidateId)||!Number.isInteger(item.revision)||!text(item.reason,240)||!id(item.turnId)))fail('The rejected approach history could not be verified.');
 return structuredClone(state);
}
export function readSolutionRequest(raw:unknown):SolutionRequest {
 if(!validateJson(raw)||!obj(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>900000||raw.version!==1||!id(raw.requestId)||!obj(raw.goal)||typeof raw.goal.id!=='string'||raw.goal.id.length>80||typeof raw.goal.statement!=='string'||raw.goal.statement.length>240||Boolean(raw.goal.id)!==Boolean(raw.goal.statement)||typeof raw.scope!=='string'||raw.scope.length>1000||!obj(raw.message)||!id(raw.message.id)||!text(raw.message.text,4000)||!(raw.selectedId===null||id(raw.selectedId)))fail('The current conversation context could not be verified.');
 const state=readSolutionState(raw.state),goal=raw.goal as SolutionRequest['goal'];
 if(!text(raw.timeZone,100))fail('The browser time zone is unavailable.');
 try{new Intl.DateTimeFormat('en-US',{timeZone:raw.timeZone}).format();}catch{fail('The supplied time zone is unsupported.');}
 if(goal.id&&!id(goal.id)||!obj(raw.filters)||Object.keys(raw.filters).length!==3||!['country','org','level'].every(key=>text((raw.filters as Record<string,unknown>)[key],100)))fail('The active workforce filters are unavailable.');
 const catalog=raw.catalog===null?null:readPlanAlternatives(raw.catalog,{goalId:goal.id,goal:goal.statement});
 const message=raw.message as SolutionRequest['message'];
 if(raw.catalog!==null&&!catalog||raw.selectedId!==null&&!catalog?.order.includes(raw.selectedId as string)||state.turns.some(turn=>turn.id===message.id))fail('The current saved-plan identities could not be verified.');
 return {version:1,requestId:raw.requestId,goal,scope:raw.scope,filters:raw.filters as DashboardFilters,timeZone:raw.timeZone,evidence:normalizeHomePack(raw.evidence),goalContext:raw.goalContext??null,...(raw.goalProgress===undefined?{}:{goalProgress:structuredClone(raw.goalProgress)}),...(raw.progressEntry===undefined?{}:{progressEntry:structuredClone(raw.progressEntry)}),selectedId:raw.selectedId as string|null,catalog,state,message:raw.message as SolutionRequest['message']};
}
export function solutionUserTurns(request:SolutionRequest){return [...request.state.turns,{id:request.message.id,role:'user' as const,text:request.message.text}].filter(turn=>turn.role==='user');}
export function mergeSolutionConstraints(request:SolutionRequest,previous:SolutionConstraint[],updates:SolutionConstraint[]):SolutionConstraint[] {
 const turns=solutionUserTurns(request),positions=new Map(turns.map((turn,index)=>[turn.id,index])),result=new Map(previous.map(value=>[value.field,value]));
 if(updates.length>5||new Set(updates.map(item=>item.field)).size!==updates.length)fail('Review one current interpretation of each constraint.');
 for(const value of updates){
  assertSolutionShape(value,solutionConstraintSchema,'constraint');
  const unit={budget_usd:'USD',max_hours:'hours/total',horizon_months:'months',population:'text',requirements:'text'}[value.field];
  if(!positions.has(value.turnId)||value.unit!==unit||value.action==='remove'&&(value.number!==null||value.text!==null)||value.action==='set'&&(['population','requirements'].includes(value.field)?value.number!==null||!text(value.text,240):value.number===null||!Number.isFinite(value.number)||value.text!==null))fail('A constraint needs a user-turn reference and supported units.');
  const old=result.get(value.field);
  if(value.action==='set'&&value.field==='horizon_months'&&(!Number.isInteger(value.number)||value.number!<1||value.number!>24))fail('The planning horizon must be 1–24 whole months.');
  if(old&&positions.has(old.turnId)&&positions.get(value.turnId)!<positions.get(old.turnId)!)fail('An older statement cannot replace the corrected current constraint.');
  result.set(value.field,structuredClone(value));
 }
 return [...result.values()];
}
function source(request:SolutionRequest,ref:SolutionSource,checkedWorking=new Set<SolutionEvaluation>()){
 if(ref.kind==='saved'){
  const item=request.catalog?.plans.find(plan=>plan.id===ref.id&&!plan.deleted&&plan.draft.revision===ref.revision);
  if(!item)fail('A referenced saved plan or revision is no longer current.');
  if(item.workload)fail('Workload changes require the full workload calculator; generic conversation cannot derive a staffing-only replacement.');
  assertSavedProvenance(request.catalog!,item.id);
  return {draft:item.draft,sourceRefs:[{id:item.id,revision:item.draft.revision}],sourceKeys:{[item.id]:bundleInputKey(item.draft)}};
 }
 const item=request.state.working.find(candidate=>candidate.id===ref.id&&candidate.revision===ref.revision);
 if(!item?.draft)fail('The referenced working proposal cannot supply calculated assumptions.');
 if(request.state.working.filter(row=>row.id===ref.id).at(-1)!==item||request.state.rejected.some(row=>row.candidateId===ref.id&&row.revision===ref.revision))fail('The working source is stale or rejected. Review a current proposal.');
 if(item.provenanceVersion!==solutionProvenanceVersion)fail('Legacy conversation provenance requires reevaluation before reuse.');
 assertSourcesCurrent(request.catalog,item.sourceKeys);
 for(const ref of item.sourceRefs)assertSavedProvenance(request.catalog!,ref.id);
 // A contract marker cannot authenticate a working ancestor. Validate its own
 // retained inputs using only predecessors, excluding self/future/cyclic references.
 if(!checkedWorking.has(item)){
  const prior={...request,state:{...request.state,working:request.state.working.slice(0,request.state.working.indexOf(item))}};
  assertSolutionParticipationProvenance(prior,item.candidate,item.draft,checkedWorking);
  checkedWorking.add(item);
 }
 return {draft:item.draft,sourceRefs:item.sourceRefs,sourceKeys:item.sourceKeys};
}
/** A version is a code contract, not user confirmation. Never bless legacy ancestry. */
function assertSavedProvenance(catalog:PlanAlternatives,id:string,visiting=new Set<string>()){
 if(visiting.has(id))fail('The source provenance contains a cycle.');
 const plan=catalog?.plans.find(row=>row.id===id);if(!plan)fail('The source provenance is unavailable.');
 if(plan.operation?.kind==='conversation'&&plan.operation.provenanceVersion!==solutionProvenanceVersion)fail('Legacy conversation provenance requires reevaluation before reuse.');
 visiting.add(id);for(const ref of plan.sourceRefs)assertSavedProvenance(catalog,ref.id,visiting);visiting.delete(id);
}
/** Independent of counts: only an exact retained source can establish membership or overlap. */
export function assertSolutionParticipationProvenance(request:SolutionRequest,candidate:SolutionCandidate,draft:BundleDraft,checkedWorking=new Set<SolutionEvaluation>()){
 const checkedSource=(ref:SolutionSource)=>source(request,ref,checkedWorking);
 const groupProof=new Map<string,{sourceKey:string;groupId:string;draft:BundleDraft}>();
 const reverse=new Map<string,string>();
 for(const membership of draft.inputs.memberships){
  if(membership.complete.value===null)continue;
  const activity=candidate.activities.find(row=>row.id===membership.componentId);
  if(activity?.mode!=='retain'||!activity.source)fail('Participation confirmation needs an exact retained checked source.');
  const checked=checkedSource(activity.source).draft,original=checked.inputs.memberships.find(row=>row.componentId===activity.source!.activityId);
  if(!original||!same(original.complete,membership.complete)||original.groupIds.length!==membership.groupIds.length)fail('Participation completeness cannot be supplied by a model interpretation.');
  const sourceKey=JSON.stringify([activity.source.kind,activity.source.id,activity.source.revision]);
  for(let index=0;index<membership.groupIds.length;index++){
   const groupId=membership.groupIds[index],originalId=original.groupIds[index],proof=groupProof.get(groupId),identity=JSON.stringify([sourceKey,originalId]);
   if(proof&&(proof.sourceKey!==sourceKey||proof.groupId!==originalId)||reverse.has(identity)&&reverse.get(identity)!==groupId)fail('A model cannot merge or split confirmed source cohorts.');
   groupProof.set(groupId,{sourceKey,groupId:originalId,draft:checked});reverse.set(identity,groupId);
  }
 }
 const used=[...new Set(draft.inputs.memberships.flatMap(row=>row.groupIds))];
 if(draft.inputs.groupsDisjoint.value===true){
  if(draft.inputs.memberships.some(row=>row.complete.value!==true)||used.some(id=>!groupProof.has(id)))fail('Unknown membership cannot establish disjoint participation.');
  if(used.length>1){const proofs=used.map(id=>groupProof.get(id)!);if(new Set(proofs.map(p=>p.sourceKey)).size!==1||proofs.some(p=>p.draft.inputs.groupsDisjoint.value!==true))fail('Mixed sources do not establish disjoint participation.');}
 }
 const assumptions=(value:unknown,path=''):Array<{path:string;atom:unknown}>=>{if(!obj(value)&&!Array.isArray(value))return [];if(obj(value)&&value.kind==='user-entered')return [{path,atom:value}];return Object.entries(value).flatMap(([key,item])=>assumptions(item,path+'/'+key));};
 const allowed:Array<{path:string;atom:unknown}>=[],perActivity=new Set(['memberships','groups','timing','costReviews','expenses']);
 if(candidate.base){const base=checkedSource(candidate.base).draft.inputs;for(const [key,value] of Object.entries(base))if(!perActivity.has(key))allowed.push(...assumptions(value,'/'+key));}
 for(const activity of candidate.activities){
  if(activity.mode!=='retain'||!activity.source)continue;
  const checked=checkedSource(activity.source).draft.inputs;
  for(const key of ['memberships','timing','costReviews'] as const){const index=draft.inputs[key].findIndex(row=>row.componentId===activity.id),prior=checked[key].find(row=>row.componentId===activity.source!.activityId);if(index>=0&&prior)allowed.push(...assumptions(prior,`/${key}/${index}`));}
  const prior=checked.memberships.find(row=>row.componentId===activity.source!.activityId),current=draft.inputs.memberships.find(row=>row.componentId===activity.id);
  if(prior&&current&&prior.groupIds.length===current.groupIds.length)for(let i=0;i<prior.groupIds.length;i++){const index=draft.inputs.groups.findIndex(row=>row.id===current.groupIds[i]),group=checked.groups.find(row=>row.id===prior.groupIds[i]);if(index>=0&&group)allowed.push(...assumptions(group,`/groups/${index}`));}
 }
 const refs:SolutionSource[]=[];for(const ref of [candidate.base,...candidate.quantities.map(q=>q.source),...candidate.activities.map(a=>a.source)])if(ref&&!refs.some(old=>old.kind===ref.kind&&old.id===ref.id&&old.revision===ref.revision))refs.push(ref);
 const base=candidate.base?checkedSource(candidate.base).draft:null;
 const parameterLayout=base&&same(draft.bundle,base.bundle)&&same(draft.inputs.expenses.map(row=>row.id),base.inputs.expenses.map(row=>row.id));
 for(let index=0;index<draft.inputs.expenses.length;index++){
  const expense=draft.inputs.expenses[index];
  if(parameterLayout){const original=base.inputs.expenses.find(row=>row.id===expense.id);if(original)allowed.push(...assumptions(original,`/expenses/${index}`));continue;}
  for(let origin=0;origin<refs.length;origin++){
   const checked=checkedSource(refs[origin]).draft.inputs,original=checked.expenses.find(row=>`s${origin}-${row.id}`===expense.id);
   if(original)allowed.push(...assumptions(original,`/expenses/${index}`));
  }
 }

 if(assumptions(draft.inputs).some(atom=>!allowed.some(prior=>prior.path===atom.path&&same(atom.atom,prior.atom))))fail('User-confirmed values must retain their checked source field and target, never a model interpretation.');
}
export function assertSourcesCurrent(catalog:PlanAlternatives|null,keys:Record<string,string>){
 for(const [id,key] of Object.entries(keys)){const plan=catalog?.plans.find(item=>item.id===id&&!item.deleted);if(!plan||bundleInputKey(plan.draft)!==key)fail('A source plan changed or was removed. Review the proposal again; earlier work is kept.');}
}
const unitFor=(field:SolutionField)=>({budget_usd:'USD',participants:'people',hours_per_participant:'hours/person/total',coordination_hours:'hours/total',cash:'USD',start_month:'YYYY-MM',horizon_months:'months',activity_start:'YYYY-MM-DD',activity_finish:'YYYY-MM-DD',population:'text',requirements:'text',success_baseline:'text',success_target:'text',costs_distinct:'boolean'}[field]);
function readQuantity(draft:BundleDraft,field:SolutionField,target:string|null):Assumption<number|string|boolean>{
 const input=draft.inputs;
 switch(field){
  case 'budget_usd':return input.budget?.amount??unknownAssumption();
  case 'participants':{const group=input.groups.find(item=>item.id===target);if(group)return group.count;const membership=input.memberships.find(item=>item.componentId===target);if(membership?.groupIds.length===1)return input.groups.find(item=>item.id===membership.groupIds[0])!.count;return target===null&&input.groups.length===1?input.groups[0].count:fail('Choose one actual participant group or activity for this reference.');}
  case 'hours_per_participant':return input.deliveryEstimate?.hoursPerParticipant??unknownAssumption();
  case 'coordination_hours':return input.deliveryEstimate?.coordinationHours??unknownAssumption();
  case 'cash':{const explicit=input.expenses.find(item=>item.id===target&&item.kind==='cash');if(explicit)return explicit.amount;const links=input.expenseLinks.filter(item=>item.componentIds.length===1&&item.componentIds[0]===target),rows=input.expenses.filter(item=>item.kind==='cash'&&links.some(link=>link.expenseId===item.id));if(rows.length!==1)fail('Choose the exact cash item; this activity has multiple or unknown allowances.');return rows[0].amount;}
  case 'start_month':return input.scope.startMonth;
  case 'horizon_months':return input.scope.months;
  case 'activity_start':case 'activity_finish':{const row=input.timing.find(item=>item.componentId===target);if(!row)fail('The referenced activity date is unavailable.');return field==='activity_start'?row.start:row.finish;}
  case 'population':return input.scope.population;
  case 'requirements':return input.scope.requirements;
  case 'success_baseline':return input.successMeasure?.baseline??unknownAssumption();
  case 'success_target':return input.successMeasure?.target??unknownAssumption();
  case 'costs_distinct':return input.costsDistinct;
 }
}
function quantityValue(request:SolutionRequest,q:SolutionQuantity):Assumption<number|string|boolean>{
 if(q.unit!==unitFor(q.field))fail(`${q.field} uses ${unitFor(q.field)}; ${q.unit} needs a separate dimensional interpretation.`);
 if(q.kind==='unknown')return unknownAssumption();
 if((q.kind==='literal'||q.kind==='scale')&&!solutionUserTurns(request).some(turn=>turn.id===q.turnId))fail('A new value or relative change must reference the user turn that requested it.');
 let value:number|string|boolean|null;
 if(q.kind==='reference'||q.kind==='scale'){
  if(!q.source||unitFor(q.source.field)!==q.unit)fail('A relative/reference quantity must use an actual value with the same units.');
  const prior=readQuantity(source(request,q.source).draft,q.source.field,q.source.target);
  if(q.kind==='reference')return prior.value===null?unknownAssumption():{value:prior.value,kind:'illustrative',basis:'Unconfirmed application of a checked source value to the proposed target.'};
  if(q.factor===null||prior.value!==null&&typeof prior.value!=='number')fail('A relative numeric change needs a numeric reference and explicit factor.');
  value=prior.value===null?null:(prior.value as number)*q.factor;
 }else value=q.unit==='boolean'?q.text==='true'?true:q.text==='false'?false:fail('Review an explicit true/false interpretation.'):['text','YYYY-MM','YYYY-MM-DD'].includes(q.unit)?q.text:q.number;
 if(value===null)return unknownAssumption();
 if(typeof value==='number'&&(!Number.isFinite(value)||value<0||value>(q.field==='horizon_months'?24:q.field==='hours_per_participant'?1000:q.field==='participants'?1000000:1e9)||['participants','horizon_months'].includes(q.field)&&!Number.isInteger(value)||q.field==='horizon_months'&&value<1))fail(`The normalized ${q.field} is outside its supported range.`);
 if(q.unit==='YYYY-MM'&&(typeof value!=='string'||!/^20\d\d-(0[1-9]|1[0-2])$/.test(value)))fail('Review a normalized YYYY-MM start month.');
 if(q.unit==='YYYY-MM-DD'&&(typeof value!=='string'||!/^20\d\d-(0[1-9]|1[0-2])-\d\d$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))fail('Review a real normalized calendar date.');
 return {value,kind:'illustrative',basis:`Unconfirmed model interpretation of turn ${q.turnId}: ${q.interpretation}`.slice(0,240)};
}
function applyQuantity(input:BundleInputs,q:SolutionQuantity,value:Assumption<number|string|boolean>,activities:string[]){
 const number=value as Assumption<number>,string=value as Assumption<string>;
 switch(q.field){
  case 'budget_usd':input.budget={amount:number,basis:{value:'cash',kind:'adopted',basis:'Cash ceiling; not an expense, funding or approval.'}};break;
  case 'participants':{
   const ids=q.target==='all'?activities:activities.includes(q.target??'')?[q.target!]:[];if(!ids.length)fail('Participant inputs need an actual candidate activity or all.');
   input.groupsDisjoint=unknownAssumption();
   // Counts and overlap are independent: a model target of all does not confirm sharing.
   for(const componentId of ids){
    const groupBase=`proposed-${componentId}`;let groupId=groupBase,suffix=1;
    while(input.groups.some(group=>group.id===groupId))groupId=groupBase+'-'+suffix++;
    input.groups.push({id:groupId,label:`Proposed participants for ${componentId}`,count:number});
    input.memberships=input.memberships.filter(item=>item.componentId!==componentId);
    input.memberships.push({componentId,groupIds:[groupId],complete:unknownAssumption()});
   }break;
  }
  case 'hours_per_participant':case 'coordination_hours':if(!input.deliveryEstimate)input.deliveryEstimate={hoursPerParticipant:unknownAssumption(),coordinationHours:unknownAssumption(),hourlyRate:unknownAssumption(),acceptance:unknownAssumption()};input.deliveryEstimate[q.field==='hours_per_participant'?'hoursPerParticipant':'coordinationHours']=number;break;
  case 'cash':{
   let row=input.expenses.find(item=>item.id===q.target&&item.kind==='cash');
   if(!row){const links=input.expenseLinks.filter(item=>item.componentIds.length===1&&item.componentIds[0]===q.target);const rows=input.expenses.filter(item=>item.kind==='cash'&&links.some(link=>link.expenseId===item.id));if(rows.length!==1)fail('Name the exact cash item or an activity with one allowance.');row=rows[0];}
   row.amount=number;break;
  }
  case 'start_month':input.scope.startMonth=string;break;
  case 'horizon_months':input.scope.months=number;break;
  case 'activity_start':case 'activity_finish':{const row=input.timing.find(item=>item.componentId===q.target);if(!row)fail('The candidate activity date target does not exist.');row[q.field==='activity_start'?'start':'finish']=string;break;}
  case 'population':input.scope.population=string;break;
  case 'requirements':input.scope.requirements=string;break;
  case 'success_baseline':case 'success_target':if(!input.successMeasure)fail('Review the goal’s success measure first.');input.successMeasure[q.field==='success_baseline'?'baseline':'target']=string;break;
  case 'costs_distinct':input.costsDistinct=value as Assumption<boolean>;break;
 }
}

function applyParameterQuantity(input:BundleInputs,q:SolutionQuantity,value:Assumption<number|string|boolean>,activities:string[]){
 if(q.field==='participants'){
  const targets=q.target==='all'?activities:activities.includes(q.target??'')?[q.target!]:[];
  const memberships=input.memberships.filter(row=>targets.includes(row.componentId));
  const groups=new Set(memberships.flatMap(row=>row.groupIds));
  const groupId=[...groups][0];
  // Updating an existing complete shared cohort does not invent new overlap knowledge.
  if(targets.length&&memberships.length===targets.length&&memberships.every(row=>row.complete.value===true&&row.groupIds.length===1)&&groups.size===1&&!input.memberships.some(row=>!targets.includes(row.componentId)&&row.groupIds.includes(groupId))){
   input.groups.find(row=>row.id===groupId)!.count=value as Assumption<number>;return;
  }
 }
 applyQuantity(input,q,value,activities);
 if(q.field==='participants'){
  const used=new Set(input.memberships.flatMap(row=>row.groupIds));input.groups=input.groups.filter(row=>used.has(row.id));
  if(input.groups.length!==1||input.memberships.some(row=>row.complete.value!==true))input.groupsDisjoint=unknownAssumption();
 }
}
function applyReviewedInputs(request:SolutionRequest,evaluation:SolutionEvaluation,input:BundleInputs,quantitiesToApply:SolutionQuantity[],constraints:SolutionConstraint[],activities:string[],parameterOnly=false){
  const quantities=new Set<string>();
  for(const q of quantitiesToApply){const key=JSON.stringify([q.field,q.target]);if(quantities.has(key))fail('Review one normalized value for each assumption.');quantities.add(key);const value=quantityValue(request,q);(parameterOnly?applyParameterQuantity:applyQuantity)(input,q,value,activities);evaluation.interpretations.push(`${q.field}${q.target?` (${q.target})`:''}: ${value.value??'Unknown'} ${q.unit}. ${q.interpretation}${q.source?` Source: ${q.source.kind} ${q.source.id} revision ${q.source.revision}; factor ${q.factor??1}.`:''}`);}
  for(const constraint of constraints){
   if(constraint.action==='remove'){
    evaluation.interpretations.push(`Removed ${constraint.field} constraint, from user turn ${constraint.turnId}.`);
    if(constraint.field!=='max_hours')applyQuantity(input,{field:constraint.field,target:null} as SolutionQuantity,unknownAssumption(),activities);
    continue;
   }
   evaluation.interpretations.push(`Current ${constraint.field}: ${constraint.number??constraint.text} ${constraint.unit}, from user turn ${constraint.turnId}; takes precedence over earlier assumptions.`);
   if(constraint.field==='max_hours')continue;
   const value={value:constraint.number??constraint.text,kind:'illustrative' as const,basis:`Unconfirmed model interpretation of constraint from turn ${constraint.turnId}.`};
   applyQuantity(input,{field:constraint.field,target:null} as SolutionQuantity,value as Assumption<number|string>,activities);
  }
}
function finishEvaluation(request:SolutionRequest,evaluation:SolutionEvaluation,draft:BundleDraft,constraints:SolutionConstraint[]){
 const input=draft.inputs;
  draft.signature=bundleSignature(draft.bundle);
  if(!readBundleDraft(draft))fail('This normalized candidate does not satisfy the existing plan data contract. Unsupported scope or accounting stays conversational.');
  assertSolutionParticipationProvenance(request,evaluation.candidate,draft);evaluation.provenanceVersion=solutionProvenanceVersion;
  const result=reconcileBundle(draft);evaluation.draft=draft;evaluation.result=result;evaluation.issues=[...result.issues];
  if(evaluation.result.budget?.status==='over')evaluation.blocking.push('Known cash exceeds the current cash ceiling. Refine the proposal or correct the constraint before saving.');
  const hours=evaluation.result.deliveryEstimate?.hours??null,maxHours=constraints.find(item=>item.field==='max_hours'&&item.action==='set')?.number;
  if(maxHours!==undefined&&maxHours!==null&&hours!==null&&hours>maxHours)evaluation.blocking.push(`Calculated ${hours} staff hours exceeds the current ${maxHours}-hour limit.`);
  const start=input.scope.startMonth.value,months=input.scope.months.value;
  if(start&&months){const [year,month]=start.split('-').map(Number),end=new Date(Date.UTC(year,month-1+months,0)).toISOString().slice(0,10);if(input.timing.some(row=>row.start.value&&row.start.value<start+'-01'||row.finish.value&&row.finish.value>end))evaluation.blocking.push('Activity dates fall outside the current planning horizon.');}
  if(evaluation.result.cashEstimate?.cash===null)evaluation.issues.push('Cash total is unknown; the budget ceiling does not fill missing allowances.');
  if(hours===null)evaluation.issues.push('Staff effort is unknown; changed activities need reviewed hours and participation.');
}
/** An explicit patch over an exact snapshot; no reconstruction or strategy invalidation. */
export async function evaluateSolutionParameterEdit(request:SolutionRequest,edit:SolutionParameterEdit,constraints:SolutionConstraint[]):Promise<SolutionEvaluation>{
 assertSolutionShape(edit,solutionParameterEditSchema,'parameter edit');if(!id(edit.id))fail('Use a stable candidate ID.');
 if(edit.quantities.some(q=>q.turnId!==request.message.id))fail('Each parameter edit must identify the current user turn.');
 const base=source(request,edit.source),original=base.draft;
 const prior=edit.source.kind==='working'?request.state.working.find(item=>item.id===edit.source.id&&item.revision===edit.source.revision):null;
 const goal=request.goal.statement||prior?.candidate.goal.statement||original.binding.goal;
 const candidate:SolutionCandidate={goal:prior?.candidate.goal??{statement:goal,turnId:request.message.id},id:edit.id,base:structuredClone(edit.source),name:original.bundle.name,objective:original.bundle.objective,approach:original.bundle.coordination,rationale:'Review the explicit parameter changes while retaining the source strategy and unrelated assumptions.',tradeoffs:prior?.candidate.tradeoffs??[],nextStep:'Review the interpreted changes and remaining unknowns before choosing this proposal.',successMeasure:prior?.candidate.successMeasure??original.inputs.successMeasure?.name??'Outcome effectiveness remains unverified.',activities:original.bundle.components.map(c=>({id:c.id,mode:'retain',source:{...edit.source,activityId:c.id},name:c.name,domain:c.domain,step:c.firstStep,ownerRole:c.ownerRole,evidenceIds:c.evidence,dependsOn:c.dependsOn,audienceOf:null,limitation:c.limitation})),quantities:structuredClone(edit.quantities)};
 assertSolutionShape(candidate,solutionCandidateSchema,'parameter source');
 const binding=await actionBinding(request.goal.id||'exploration',goal,request.evidence,{scope:request.scope,constraints});
 const evaluation:SolutionEvaluation={id:edit.id,revision:1+Math.max(0,...request.state.working.filter(item=>item.id===edit.id).map(item=>item.revision)),requestId:request.requestId,message:structuredClone(request.message),candidate,binding,draft:null,result:null,sourceRefs:structuredClone(base.sourceRefs),sourceKeys:{...base.sourceKeys},constraints:structuredClone(constraints),interpretations:[],changes:[],issues:[],blocking:[]};
 try{
  if(original.inputs.capacity&&edit.quantities.some(q=>!['budget_usd','requirements'].includes(q.field)))fail('This candidate changes coupled staffing accounting. Discuss the approach here; use the existing staffing calculation before saving this redesign.');
  const draft=structuredClone(original);draft.binding=binding;draft.revision++;
  if(draft.inputs.successMeasure&&draft.inputs.successMeasure.goal!==goal)fail('A saved outcome measure belongs to another goal; review it explicitly.');
  for(const q of edit.quantities)if(q.source){const dependency=source(request,q.source);Object.assign(evaluation.sourceKeys,dependency.sourceKeys);for(const ref of dependency.sourceRefs)if(!evaluation.sourceRefs.some(old=>old.id===ref.id))evaluation.sourceRefs.push(ref);}
  applyReviewedInputs(request,evaluation,draft.inputs,edit.quantities,constraints,draft.bundle.components.map(c=>c.id),true);
  evaluation.changes.push('Only the listed parameters and current constraints were changed. Source activities and unrelated assumptions, including unknowns, are retained.');
  finishEvaluation(request,evaluation,draft,constraints);
 }catch(error){evaluation.blocking.push(error instanceof Error?error.message:'The parameter edit could not be calculated.');}
 return evaluation;
}

export async function evaluateSolutionCandidate(request:SolutionRequest,candidate:SolutionCandidate,constraints:SolutionConstraint[]):Promise<SolutionEvaluation>{
 assertSolutionShape(candidate,solutionCandidateSchema,'candidate');if(!id(candidate.id))fail('Use a stable candidate ID.');
 if(!request.goal.id&&!solutionUserTurns(request).some(turn=>turn.id===candidate.goal.turnId)&&!request.state.working.some(item=>same(item.candidate.goal,candidate.goal)))fail('The proposed goal needs its actual user-turn reference.');
 const goal=request.goal.statement||candidate.goal.statement,goalId=request.goal.id||'exploration';
 const binding=await actionBinding(goalId,goal,request.evidence,{scope:request.scope,constraints});
 const evaluation:SolutionEvaluation={id:candidate.id,revision:1+Math.max(0,...request.state.working.filter(item=>item.id===candidate.id).map(item=>item.revision)),requestId:request.requestId,message:structuredClone(request.message),candidate:structuredClone(candidate),binding,draft:null,result:null,sourceRefs:[],sourceKeys:{},constraints:structuredClone(constraints),interpretations:[],changes:[],issues:[],blocking:[]};
 try{
  const base=candidate.base?source(request,candidate.base):null;
  const resolved=new Map<string,ReturnType<typeof source>>(),register=(ref:SolutionSource)=>{const key=JSON.stringify([ref.kind,ref.id,ref.revision]);if(!resolved.has(key))resolved.set(key,source(request,ref));return {key,item:resolved.get(key)!};};
  if(candidate.base)register(candidate.base);
  // Every expression dependency contributes authoritative lineage, including values
  // referenced without retaining any source activity. Working sources bring their lineage.
  for(const quantity of candidate.quantities)if(quantity.source)register(quantity.source);
  const evidence=new Set(actionEvidenceCatalog(request.evidence).map(item=>item.id));
  const origins=new Map<string,{key:string;item:ReturnType<typeof source>;originalId:string;unchanged:boolean}>();
  const usedOrigins=new Set<string>();
  const components=candidate.activities.map(activity=>{
   if(activity.source){const originKey=JSON.stringify(activity.source);if(usedOrigins.has(originKey))fail('The same source activity cannot appear twice. Propose a separate new activity if it serves a different purpose.');usedOrigins.add(originKey);}
   if(activity.mode==='new'&&activity.source||activity.mode!=='new'&&!activity.source)fail('Retained/adapted activities require actual lineage; new activities must not claim a source.');
   if(activity.source){const {key,item}=register(activity.source),original=item.draft.bundle.components.find(part=>part.id===activity.source!.activityId);if(!original)fail('A referenced source activity is unavailable.');origins.set(activity.id,{key,item,originalId:original.id,unchanged:activity.mode==='retain'});if(activity.mode==='retain')return {...structuredClone(original),id:activity.id,dependsOn:[...activity.dependsOn]};}
   if(activity.evidenceIds.some(ref=>!evidence.has(ref)))fail('A new/adapted activity cites unavailable current evidence.');
   return {id:activity.id,name:activity.name,domain:activity.domain,firstStep:activity.step,ownerRole:activity.ownerRole,evidence:[...activity.evidenceIds],dependsOn:[...activity.dependsOn],limitation:activity.limitation};
  });
  componentOrder(components);
  const draft=createBundleDraft({id:base?.draft.bundle.id??'A',origin:'conversation-v1',name:candidate.name,objective:candidate.objective,coordination:candidate.approach,components,limitation:'Conversational proposal for review. Mechanisms and effectiveness are unproven; missing costs, people, effort and dates remain unknown.'},binding);
  draft.revision=(base?.draft.revision??0)+1;
  const changed=!base||candidate.activities.length!==base.draft.bundle.components.length||candidate.activities.some(activity=>{const origin=origins.get(activity.id);return !origin?.unchanged||origin.originalId!==activity.id||origin.item.draft!==base.draft||!same(activity.dependsOn,base.draft.bundle.components.find(part=>part.id===origin.originalId)?.dependsOn);});
  if(base){draft.inputs=structuredClone(base.draft.inputs);if(base.draft.inputs.capacity&&(changed||resolved.size>1||candidate.quantities.some(q=>!['budget_usd','requirements'].includes(q.field))))fail('This candidate changes coupled staffing accounting. Discuss the approach here; use the existing staffing calculation before saving this redesign.');}
  const input=draft.inputs;
  if(changed){delete input.mixScenario;delete input.mixConstraints;delete input.whatIf;if(input.deliveryEstimate){input.deliveryEstimate.hoursPerParticipant=unknownAssumption();input.deliveryEstimate.coordinationHours=unknownAssumption();}evaluation.changes.push('Activity changes invalidate aggregate effort, outcome scenarios and affected dates/costs; retained unaffected inputs keep their provenance.');}
  input.costPolicy='cash-hours-v2';input.scope.currency='USD';
  input.timing=[];input.memberships=[];input.groups=[];input.expenses=[];input.expenseLinks=[];input.costReviews=[];
  const originIndex=new Map([...resolved.keys()].map((key,index)=>[key,index]));
  for(const activity of candidate.activities){
   const origin=origins.get(activity.id),oldTiming=origin?.item.draft.inputs.timing.find(row=>row.componentId===origin.originalId);
   const dependenciesRetained=origin?.unchanged&&same(activity.dependsOn,origin.item.draft.bundle.components.find(item=>item.id===origin.originalId)?.dependsOn);
   input.timing.push(dependenciesRetained&&oldTiming?{...structuredClone(oldTiming),componentId:activity.id}:{componentId:activity.id,start:unknownAssumption(),finish:unknownAssumption()});
   const membership=origin?.unchanged?origin.item.draft.inputs.memberships.find(row=>row.componentId===origin.originalId):null;
   if(membership){const groupIds=membership.groupIds.map(groupId=>`s${originIndex.get(origin!.key)}-${groupId}`);for(let i=0;i<groupIds.length;i++){const group=origin!.item.draft.inputs.groups.find(row=>row.id===membership.groupIds[i])!;if(!input.groups.some(row=>row.id===groupIds[i]))input.groups.push({...structuredClone(group),id:groupIds[i]});}input.memberships.push({...structuredClone(membership),componentId:activity.id,groupIds});}
   else input.memberships.push({componentId:activity.id,groupIds:[],complete:unknownAssumption()});
   input.costReviews.push({componentId:activity.id,complete:origin?.unchanged?structuredClone(origin.item.draft.inputs.costReviews.find(row=>row.componentId===origin.originalId)?.complete??unknownAssumption()):unknownAssumption()});
   if(!origin?.unchanged)evaluation.changes.push(`${activity.mode==='new'?'Added':'Adapted'} activity: ${activity.name}. Its resources require review.`);
  }
  if(base)for(const original of base.draft.bundle.components)if(![...origins.values()].some(origin=>origin.item.draft===base.draft&&origin.originalId===original.id))evaluation.changes.push(`Removed activity: ${original.name}. No savings or released resources are assumed.`);
  for(const [key,item] of resolved){
   for(const expense of item.draft.inputs.expenses){
    if(expense.kind!=='cash')continue;
    const link=item.draft.inputs.expenseLinks.find(row=>row.expenseId===expense.id);if(!link)continue;
    const matches=[...origins.entries()].filter(([,origin])=>origin.key===key&&link.componentIds.includes(origin.originalId));if(!matches.length)continue;
    const unchanged=matches.every(([,origin])=>origin.unchanged)&&matches.length===link.componentIds.length;
    const expenseId=`s${originIndex.get(key)}-${expense.id}`;
    input.expenses.push({...structuredClone(expense),id:expenseId,...(!unchanged?{amount:unknownAssumption<number>()}:{})});
    input.expenseLinks.push({expenseId,componentIds:matches.map(([id])=>id),allocations:null});
    if(!unchanged)evaluation.changes.push(`Recheck shared allowance: ${expense.label}; its activity coverage changed.`);
   }
  }
  for(const activity of candidate.activities)if(!input.expenseLinks.some(link=>link.componentIds.includes(activity.id))){
   // Every new obligation has an explicit Unknown entry; omitted cost is never free work.
   const expenseId=`new-${activity.id}`;input.expenses.push({id:expenseId,label:`${activity.name}: unreviewed incremental cash`,kind:'cash',amount:unknownAssumption(),startMonth:unknownAssumption(),months:unknownAssumption()});input.expenseLinks.push({expenseId,componentIds:[activity.id],allocations:null});
  }
  input.groupsDisjoint=resolved.size<=1&&base?structuredClone(base.draft.inputs.groupsDisjoint):unknownAssumption();
  input.costsDistinct=resolved.size<=1&&base?structuredClone(base.draft.inputs.costsDistinct):unknownAssumption();
  input.dependenciesConfirmed=changed?unknownAssumption():input.dependenciesConfirmed;
  if(base?.draft.inputs.capacity&&!changed)Object.assign(input,structuredClone(base.draft.inputs));
  if(!input.successMeasure)input.successMeasure={goal,scopeKey:JSON.stringify([goal,request.scope]),name:candidate.successMeasure,baseline:unknownAssumption(),target:unknownAssumption()};
  if(input.successMeasure.goal!==goal)fail('A saved outcome measure belongs to another goal; review it explicitly.');
  applyReviewedInputs(request,evaluation,input,candidate.quantities,constraints,components.map(item=>item.id));
  // Model same-people links are proposals, never user confirmation. Preserve only existing source identity.
  const audienceDone=new Set<string>(),audienceVisiting=new Set<string>();
  const audience=(activityId:string)=>{if(audienceDone.has(activityId))return;const activity=candidate.activities.find(item=>item.id===activityId);if(!activity||audienceVisiting.has(activityId))fail('The same-people reference is missing or circular.');audienceVisiting.add(activityId);if(activity.audienceOf){audience(activity.audienceOf);const shared=input.memberships.find(row=>row.componentId===activity.audienceOf)!,own=input.memberships.find(row=>row.componentId===activityId)!;const inherited=own.complete.value===true&&shared.complete.value===true&&same(own.groupIds,shared.groupIds)&&own.groupIds.length>0;if(!inherited){own.complete=unknownAssumption();input.groupsDisjoint=unknownAssumption();}evaluation.interpretations.push(`${activity.name}: ${inherited?'retains checked source participation':'proposes shared participation, still unconfirmed'} with ${candidate.activities.find(row=>row.id===activity.audienceOf)!.name}. A model reference or conversation turn does not confirm cohort identity.`);}audienceVisiting.delete(activityId);audienceDone.add(activityId);};
  candidate.activities.forEach(activity=>audience(activity.id));
  const usedGroups=new Set(input.memberships.flatMap(row=>row.groupIds));input.groups=input.groups.filter(group=>usedGroups.has(group.id));
  if(input.memberships.some(row=>row.complete.value!==true))input.groupsDisjoint=unknownAssumption();
  if(input.groups.length===1&&input.memberships.every(row=>row.complete.value===true))input.groupsDisjoint={value:true,kind:'adopted',basis:'Retained checked source cohort identity; no new sharing inferred.'};
  if(input.expenses.length===1)input.costsDistinct={value:true,kind:'adopted',basis:'One cash item; no cross-item sum.'};
  for(const item of resolved.values()){Object.assign(evaluation.sourceKeys,item.sourceKeys);for(const ref of item.sourceRefs)if(!evaluation.sourceRefs.some(old=>old.id===ref.id))evaluation.sourceRefs.push(ref);}
  finishEvaluation(request,evaluation,draft,constraints);
 }catch(error){evaluation.blocking.push(error instanceof Error?error.message:'The candidate could not be calculated.');}
 return evaluation;
}

export async function saveSolutionCandidate(request:SolutionRequest,current:PlanAlternatives|null,evaluation:SolutionEvaluation,goal:{id:string;statement:string},currentEvidence:unknown,acknowledgeUnknowns:boolean){
 if(!id(goal.id)||!text(goal.statement,240))fail('Pin the reviewed goal before saving this proposal.');
 if(evaluation.blocking.length||!evaluation.draft||!evaluation.result)fail('Resolve the candidate’s blocking calculation feedback before saving.');
 if(evaluation.provenanceVersion!==solutionProvenanceVersion)fail('Legacy conversation provenance requires reevaluation before saving.');
 if(!acknowledgeUnknowns&&evaluation.issues.length)fail('Acknowledge the listed unknowns before saving this proposal.');
 const latest=request.state.working.filter(item=>item.id===evaluation.id).at(-1);
 if(!latest||!same(latest,evaluation)||!same(request.state.constraints,evaluation.constraints)||request.state.rejected.some(item=>item.candidateId===evaluation.id&&item.revision===evaluation.revision))fail('This proposal is no longer the current reviewed revision. Refine it using the current constraints before saving.');
 const binding=await actionBinding(request.goal.id||'exploration',request.goal.statement||evaluation.candidate.goal.statement,currentEvidence,{scope:request.scope,constraints:evaluation.constraints});
 if(actionBindingKey(binding)!==actionBindingKey(evaluation.binding))fail('The evidence, goal or constraints changed. Review the current proposal before saving.');
 if(request.goal.id&&(!same(request.goal,goal)))fail('The active goal changed. Earlier saved work is preserved.');
 assertSourcesCurrent(current,evaluation.sourceKeys);
 assertSolutionParticipationProvenance({...request,state:{...request.state,working:request.state.working.filter(row=>row.id!==evaluation.id||row.revision<evaluation.revision)}},evaluation.candidate,evaluation.draft);
 if(!same(reconcileBundle(evaluation.draft),evaluation.result))fail('The current calculation no longer matches its reviewed inputs.');

 const saveId=await solutionSaveId(request.requestId,evaluation.id,evaluation.revision);
 const prior=current?.plans.find(item=>item.requestId===saveId);
 if(!prior&&!same(current,request.catalog))fail('The saved catalog changed. Review the proposal again before saving.');
 const draft=structuredClone(evaluation.draft);draft.binding={...draft.binding,goalId:goal.id,goal:goal.statement};if(draft.inputs.successMeasure)draft.inputs.successMeasure.goal=goal.statement;
 if(draft.inputs.whatIf&&goal.statement!==request.goal.statement)fail('Review the saved outcome scenario for the pinned goal before saving.');
 if(!readBundleDraft(draft))fail('The proposal could not be rebound to the reviewed goal.');
 return appendConversationAlternative(current,{goalId:goal.id,goal:goal.statement},{requestId:saveId,text:request.message.text.slice(0,1200),sourceIds:evaluation.sourceRefs.map(ref=>ref.id),expectedInputs:evaluation.sourceKeys},draft,[evaluation.candidate.rationale,...evaluation.candidate.tradeoffs,evaluation.candidate.nextStep,...evaluation.changes],JSON.stringify(evaluation.candidate),solutionProvenanceVersion);
}
export async function solutionSaveId(requestId:string,candidateId:string,revision:number){return 'conversation-'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([requestId,candidateId,revision]))))].map(value=>value.toString(16).padStart(2,'0')).join('');}

/** Model selects exact result references; code owns labels, values, units and basis. */
export function resolveSolutionMetric(state:Pick<SolutionState,'working'|'analyses'>,ref:SolutionMetricRef){
 if(ref.kind==='candidate'){
  const item=state.working.find(item=>item.id===ref.id&&item.revision===ref.revision);
  if(!item?.result||item.blocking.length||!['cash_usd','staff_hours','participants'].includes(ref.metric))fail('The claimed result has no checked candidate metric.');
  const metrics={cash_usd:{label:'Cash total',value:item.result.cashEstimate?.cash??null,unit:'USD'},staff_hours:{label:'Staff effort',value:item.result.deliveryEstimate?.hours??null,unit:'hours'},participants:{label:'Distinct participants',value:item.result.uniqueParticipants,unit:'people'}};
  return {...metrics[ref.metric as keyof typeof metrics],basis:'Calculated from stated assumptions; model interpretations remain unconfirmed',source:`${item.candidate.name}, revision ${item.revision}`};
 }
 const item=state.analyses.find(item=>item.id===ref.id&&item.revision===ref.revision);
 if(!item||!['opening_headcount','closing_headcount'].includes(ref.metric))fail('The claimed result has no checked projection metric.');
 return ref.metric==='opening_headcount'?{label:'Opening headcount',value:item.inputs.opening,unit:'people',basis:'Source observation',source:`${item.inputs.scope}, as of ${item.inputs.asOf}`}:{label:'Scenario closing headcount',value:item.points.at(-1)!.headcount,unit:'people',basis:'Calculated scenario, not a prediction',source:`${item.id}, revision ${item.revision}, ${item.points.at(-1)!.month.slice(0,7)}`};
}
