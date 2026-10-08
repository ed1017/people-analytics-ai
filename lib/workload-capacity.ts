/** Conditional monthly workload planning only. No services, storage or execution. */
import type {ActionBinding} from './home-action-drafts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validActionBinding,actionBindingKey} from './home-action-drafts.ts';
import type {Assumption,BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,reviewBundleProposal,bundleInputKey} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateWorkforceIncrement,planDate} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
import {validDatasetToken} from './dataset-identity.mjs';
export const workloadCapacityMethod='workload-capacity-month-start-v2' as const;
type Numeric=Assumption<number>;
export type WorkloadCapacityInput={
 identity:{goalId:string;goal:string;datasetToken:string;revision:number};
 currentBinding:{datasetToken:string;binding:ActionBinding};
 profile:{code:'OPS-CLIENT';label:string;familyCode:string|null};
 workload:{mode:'total'|'incremental';ticketsByMonth:Numeric[];minutesPerTicket:Numeric;productiveHoursPerRole:Numeric};
 target:{poolId:string;baselineRoles:Numeric;availabilityPct:Numeric;baselineCohortIds:string[]};
 source:{poolId:string;capacityHoursByMonth:Numeric[];workloadHoursByMonth:Numeric[];productiveHoursPerRole:Numeric;disjointFromTarget:boolean|null};
 managers:{poolId:string;count:Numeric;existingReports:Numeric;spanLimit:Numeric;uncommittedHoursByMonth:Numeric[];hoursPerAddedReport:Numeric;coachingHoursPerTraineeMonth:Numeric}[];
 options:{id:string;draft:BundleDraft;productivity:'zero-until-ready-then-full';cohortsDisjoint:boolean|null;
  training:{basis:'whole-program'|'per-person';cash:Numeric;hours:Numeric};
  cohorts:{id:string;path:'build'|'move';sourcePoolId:string;assignedMonth:string|null;trainingHoursByMonth:Numeric[]}[];
 }[];
};
type Status='met'|'not-met'|'unknown';
const assert=(ok:unknown,message:string):void=>{if(!ok)throw Error(message)};
const id=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
function shape(v:unknown,keys:string[],label:string){assert(!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join(),label+': unexpected or missing fields; graded ramps and extra pools are unsupported.');}
function number(a:Numeric,label:string,max=1e9,whole=false):number|null{
 shape(a,['value','kind','basis'],label);assert(['unknown','user-entered','illustrative','adopted'].includes(a.kind),label+': invalid provenance.');
 assert(a.basis===null||typeof a.basis==='string',label+': invalid assumption basis.');
 if(a.value===null){assert(a.kind==='unknown',label+': unknown value needs unknown provenance.');return null;}
 assert(a.kind!=='unknown'&&typeof a.basis==='string'&&a.basis.trim(),label+': explicit assumption basis required.');
 assert(Number.isFinite(a.value)&&a.value>=0&&a.value<=max&&(!whole||Number.isSafeInteger(a.value)),label+': invalid nonnegative quantity.');return a.value;
}
function cents(value:number):number{assert(Number.isFinite(value)&&Number.isSafeInteger(Math.round(value*100)),'Cash exceeds supported monetary precision.');return Math.round((value+Number.EPSILON)*100)/100;}
function hundredths(a:Numeric,label:string):number|null{const value=number(a,label,1e8);assert(value===null||/^\d+(\.\d{1,2})?$/.test(String(value)),label+': use at most two decimal places.');return value===null?null:Math.round(value*100);}
function vector(a:Numeric[],length:number,label:string){assert(Array.isArray(a)&&a.length===length,label+': use one explicit assumption per month.');return a.map((v,i)=>number(v,label+' '+i));}
const bounded=(v:number)=>{assert(Number.isFinite(v)&&Math.abs(v)<=1e12,'Calculation exceeds the supported numeric bound.');return v;};
const sum=(values:(number|null)[])=>values.some(v=>v===null)?null:bounded(values.reduce<number>((a,v)=>a+v!,0));
const product=(...values:(number|null)[])=>values.includes(0)?0:values.some(v=>v===null)?null:bounded(values.reduce<number>((a,v)=>a*v!,1));
const gap=(need:number|null,available:number|null)=>need===null||available===null?null:Math.max(0,need-available);
const check=(g:number|null):Status=>g===null?'unknown':g>1e-7?'not-met':'met';
const combine=(statuses:Status[]):Status=>statuses.includes('not-met')?'not-met':statuses.includes('unknown')?'unknown':'met';
function date(value:string|null,months:string[],label:string){if(value===null||value==='')return null;assert(planDate(value)!==null&&value.endsWith('-01')&&months.includes(value.slice(0,7)),label+': only month-start dates within the horizon are supported.');return value;}
function month(value:string|null,months:string[],label:string){return value===null?null:date(value+'-01',months,label);}
/** Identity and every assumption are included in the replay key; labels never select a profile. */
export function calculateWorkloadCapacity(raw:WorkloadCapacityInput){
 assert(validateJson(raw)&&JSON.stringify(raw).length<=256*1024,'Invalid or oversized workload input.');
 shape(raw,['identity','currentBinding','profile','workload','target','source','managers','options'],'workload input');
 shape(raw.identity,['goalId','goal','datasetToken','revision'],'identity');assert(id(raw.identity.goalId)&&typeof raw.identity.goal==='string'&&raw.identity.goal.trim()&&validDatasetToken(raw.identity.datasetToken)&&Number.isSafeInteger(raw.identity.revision)&&raw.identity.revision>0,'Exact goal/dataset/revision identity required.');
 shape(raw.currentBinding,['datasetToken','binding'],'current binding');assert(raw.currentBinding.datasetToken===raw.identity.datasetToken&&validActionBinding(raw.currentBinding.binding)&&raw.currentBinding.binding.goalId===raw.identity.goalId&&raw.currentBinding.binding.goal===raw.identity.goal,'Current dataset and expected goal/evidence/planning binding required.');
 shape(raw.profile,['code','label','familyCode'],'profile');assert(raw.profile.code==='OPS-CLIENT'&&typeof raw.profile.label==='string'&&raw.profile.label.trim()&&(raw.profile.familyCode===null||id(raw.profile.familyCode)),'Use the stable OPS-CLIENT profile configuration.');
 assert(Array.isArray(raw.options)&&raw.options.length>0&&raw.options.length<=3,'Compare one to three explicit options.');assert(new Set(raw.options.map(o=>o.id)).size===raw.options.length&&raw.options.every(o=>id(o.id)),'Unique option IDs required.');
 const firstDraft=raw.options[0].draft;assert(readBundleDraft(firstDraft),'Valid comparison anchor draft required.');
 const comparisonScope=['population','businessUnit','jobProfile','startMonth','months','demand','capacityRequired','requirements','currency'] as const;
 const first=firstDraft.inputs.capacity?.input;assert(first,'Staffing draft required.');
 const start=first!.planningMonth,count=Number(first!.months);assert(planDate(start+'-01')!==null&&Number.isInteger(count)&&count>=1&&count<=24,'Valid one-to-24-month horizon required.');
 const months=Array.from({length:count},(_,i)=>new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7))-1+i,1)).toISOString().slice(0,7));
 shape(raw.workload,['mode','ticketsByMonth','minutesPerTicket','productiveHoursPerRole'],'workload');assert(['total','incremental'].includes(raw.workload.mode),'Explicit total or incremental workload mode required.');
 const tickets=vector(raw.workload.ticketsByMonth,count,'tickets'),minutes=number(raw.workload.minutesPerTicket,'handling minutes'),productive=number(raw.workload.productiveHoursPerRole,'productive hours',744);assert(productive===null||productive>0,'Productive hours per role must be positive.');
 shape(raw.target,['poolId','baselineRoles','availabilityPct','baselineCohortIds'],'target');assert(id(raw.target.poolId)&&Array.isArray(raw.target.baselineCohortIds)&&raw.target.baselineCohortIds.every(id)&&new Set(raw.target.baselineCohortIds).size===raw.target.baselineCohortIds.length,'Unique target cohort IDs required.');
 const baselineRoles=number(raw.target.baselineRoles,'baseline roles',1000,true),availability=number(raw.target.availabilityPct,'baseline availability',100),baselineHours=product(baselineRoles,productive,availability===null?null:availability/100);
 shape(raw.source,['poolId','capacityHoursByMonth','workloadHoursByMonth','productiveHoursPerRole','disjointFromTarget'],'source');assert(id(raw.source.poolId)&&raw.source.poolId!==raw.target.poolId,'Source and target pools must be distinct.');assert([true,false,null].includes(raw.source.disjointFromTarget),'Explicit source/target disjointness required.');assert(raw.source.disjointFromTarget!==false,'Overlapping source and target capacity is unsupported.');
 const sourceCapacity=vector(raw.source.capacityHoursByMonth,count,'source capacity'),sourceWork=vector(raw.source.workloadHoursByMonth,count,'source work'),sourceProductive=number(raw.source.productiveHoursPerRole,'source productive hours',744);assert(sourceProductive===null||sourceProductive>0,'Source productive hours must be positive.');
 assert(Array.isArray(raw.managers)&&raw.managers.length===1,'Exactly one shared manager pool is supported; duplicate or multiple pools cannot add availability.');
 const manager=raw.managers[0];shape(manager,['poolId','count','existingReports','spanLimit','uncommittedHoursByMonth','hoursPerAddedReport','coachingHoursPerTraineeMonth'],'manager pool');assert(id(manager.poolId)&&manager.poolId!==raw.target.poolId&&manager.poolId!==raw.source.poolId,'Manager pool identity must be distinct from source and target pools.');
 const managerCount=number(manager.count,'manager count',1000,true),existingReports=number(manager.existingReports,'existing reports',10000,true),span=number(manager.spanLimit,'manager span',1000,true),managerHours=vector(manager.uncommittedHoursByMonth,count,'uncommitted manager hours'),reportHours=number(manager.hoursPerAddedReport,'hours per added report',744),coaching=number(manager.coachingHoursPerTraineeMonth,'incremental coaching hours',744);
 assert(span===null||span>0,'Span limit must be positive.');assert(baselineRoles===null||existingReports===null||existingReports>=baselineRoles,'Existing reports must include the target baseline exactly once.');assert(managerCount!==0||managerHours.every(v=>v===null||v===0),'Zero managers cannot supply positive manager hours.');
 managerHours.forEach((h,i)=>{const calendarHours=new Date(Date.UTC(Number(months[i].slice(0,4)),Number(months[i].slice(5,7)),0)).getUTCDate()*24;assert(h===null||managerCount===null||h<=managerCount*calendarHours,'Manager availability exceeds the pool’s calendar hours.');});
 const options=raw.options.map(option=>{
  shape(option,['id','draft','productivity','cohortsDisjoint','training','cohorts'],'option');assert(option.productivity==='zero-until-ready-then-full','Only 0%-then-100% readiness is supported; graded ramps require separate review.');assert([true,false,null].includes(option.cohortsDisjoint)&&option.cohortsDisjoint!==false,'Overlapping internal cohorts are unsupported.');
  assert(readBundleDraft(option.draft),'Valid existing bundle draft required.');const draft=structuredClone(option.draft),capacity=draft.inputs.capacity!;assert(capacity&&draft.inputs.costPolicy==='cash-hours-v2','Use the existing cash/hours staffing draft.');
  assert(!draft.inputs.budget||draft.inputs.budget.basis.value==='cash','Explicit cash budget basis required.');
  const input=capacity.input;assert(draft.binding.goalId===raw.identity.goalId&&draft.binding.goal===raw.identity.goal&&draft.revision===raw.identity.revision&&input.jobProfile===raw.profile.code&&input.planningMonth===start&&Number(input.months)===count,'Option goal/profile/revision/horizon changed.');
  assert(actionBindingKey(draft.binding)===actionBindingKey(raw.currentBinding.binding)&&input.businessUnit===first!.businessUnit&&comparisonScope.every(key=>JSON.stringify(canonical(draft.inputs.scope[key]))===JSON.stringify(canonical(firstDraft.inputs.scope[key]))),'Comparison binding or scope changed; review coherent exact evidence, planning and business-unit scope.');
  assert(input.arrivalMode==='explicit'||Number(input.buy)===0,'Historical arrival estimation is unsupported; supply explicit assumptions.');
  const arrivals={buy:date(input.arrivalDate,months,'hire arrival'),build:month(input.buildMonth||null,months,'build readiness'),move:month(input.moveMonth||null,months,'move readiness'),backfills:date(input.backfillDate,months,'backfill arrival')};
  for(const timing of draft.inputs.timing){date(timing.start.value,months,'component start');date(timing.finish.value,months,'component readiness');}
  shape(option.training,['basis','cash','hours'],'training');assert(['whole-program','per-person'].includes(option.training.basis),'State whole-program totals or per-person rates.');
  const build=Number(input.build),factor=option.training.basis==='per-person'?build:1,trainingPennies=product(hundredths(option.training.cash,'training cash'),factor),trainingCash=trainingPennies===null?null:trainingPennies/100,trainingHundredths=product(hundredths(option.training.hours,'training hours'),factor),trainingHours=trainingHundredths===null?null:trainingHundredths/100;
  assert(build>0||(trainingCash===null||trainingCash===0)&&(trainingHours===null||trainingHours===0),'Inactive Build path cannot carry training costs/hours.');
  for(const [field,value,a] of [['trainingCash',trainingCash,option.training.cash],['trainingHours',trainingHours,option.training.hours]] as const){assert(input[field]===''||(value!==null&&Number(input[field])===value),'Existing training total disagrees with reviewed '+field+'.');input[field]=value===null?'':String(value);capacity.origins[field]=factor===0&&a.value===null?{kind:'adopted',basis:'Explicit inactive Build count normalizes per-person training to zero.'}:{kind:a.kind,basis:a.basis};}
  const reconciled=reviewBundleProposal(draft),staffing=calculateWorkforceIncrement(input,null);
  assert(Array.isArray(option.cohorts)&&new Set(option.cohorts.map(c=>c.id)).size===option.cohorts.length,'Duplicate trainee/redeployment cohorts are unsupported.');
  const internal=capacity.flows.filter(f=>f.path==='build'||f.path==='move');assert(option.cohorts.length===internal.length&&option.cohorts.every(c=>internal.some(f=>f.path===c.path&&f.groupId===c.id)),'Map each internal staffing cohort exactly once.');
  const cohorts=option.cohorts.map(c=>{shape(c,['id','path','sourcePoolId','assignedMonth','trainingHoursByMonth'],'cohort');assert(id(c.id)&&c.sourcePoolId===raw.source.poolId&&!raw.target.baselineCohortIds.includes(c.id),'Cohort overlaps the target baseline or has another source pool.');
   const n=Number(input[c.path]),training=vector(c.trainingHoursByMonth,count,'cohort training absence'),assigned=month(c.assignedMonth,months,'manager assignment');assert(c.path==='build'||training.every(h=>h===0),'Move path cannot conceal training; use Build for trainees.');
   const flow=internal.find(f=>f.path===c.path)!,group=draft.inputs.groups.find(g=>g.id===c.id);assert(group?.count.value===n,'Reviewed cohort count must equal its staffing count.');
   const prerequisites=flow.componentIds.map(k=>reconciled.componentReady[k]);const ready=arrivals[c.path]&&prerequisites.every(v=>v!==null)?[arrivals[c.path]!,...prerequisites as string[]].sort().at(-1)!:null;
   const related=new Set<string>();const visit=(key:string)=>{if(related.has(key))return;related.add(key);draft.bundle.components.find(component=>component.id===key)!.dependsOn.forEach(visit);};flow.componentIds.forEach(visit);
   const learningWindows=draft.bundle.components.filter(component=>related.has(component.id)&&component.domain==='learning').map(component=>draft.inputs.timing.find(t=>t.componentId===component.id)!);
   assert(!ready||!assigned||assigned<=ready,'Manager assignment cannot follow target readiness.');
   training.forEach((h,i)=>{assert(h===null||h===0||learningWindows.every(window=>(window.start.value===null||months[i]>=window.start.value.slice(0,7))&&(window.finish.value===null||months[i]<window.finish.value.slice(0,7))),'Training must fit its learning-component start/finish window.');assert(h===null||sourceProductive===null||h<=n*sourceProductive,'Training absence exceeds cohort source capacity.');assert(!ready||months[i]<ready.slice(0,7)||h===0,'Training cannot continue after permanent target redeployment.');assert(!assigned||months[i]>=assigned.slice(0,7)||h===0,'Training requires the reviewed manager assignment.');});
   return {...c,n,training,assigned,ready};
  });
  const scheduled=sum(cohorts.flatMap(c=>c.training));assert(scheduled===null||trainingHours===null||Math.abs(scheduled-trainingHours)<1e-7,'Training schedule must equal whole-program hours; never multiply the total again.');
  const effective=(path:'buy'|'backfills')=>{const flow=capacity.flows.find(f=>f.path===path);if(!flow)return null;const prerequisites=flow.componentIds.map(k=>reconciled.componentReady[k]);return arrivals[path]&&prerequisites.every(v=>v!==null)?[arrivals[path]!,...prerequisites as string[]].sort().at(-1)!:null;};
  const hireReady=effective('buy'),backfillReady=effective('backfills');
  const cashLedger=structuredClone(reconciled.ledger.filter(line=>line.kind==='cash'));
  const cashReviewed=draft.inputs.costsDistinct.value===true&&draft.inputs.costReviews.every(review=>review.complete.value===true)&&(internal.length<2||draft.inputs.groupsDisjoint.value===true)&&cashLedger.every(line=>line.total===0||line.componentIds.length>0);
  const rows=months.map((m,i)=>{
   const knownDisjoint=raw.source.disjointFromTarget===true&&(cohorts.length<2||option.cohortsDisjoint===true&&draft.inputs.groupsDisjoint.value===true);
   const ticketHours=product(tickets[i],minutes===null?null:minutes/60),demandHours=raw.workload.mode==='incremental'?sum([baselineHours,ticketHours]):ticketHours;
   const requiredAdditionalRoles=productive===null||demandHours===null||baselineHours===null?null:Math.max(0,Math.ceil(Math.max(0,demandHours-baselineHours)/productive-1e-10));
   const targetReadyRoles=sum([Number(input.buy)===0?0:hireReady===null?null:hireReady.slice(0,7)<=m?Number(input.buy):0,...cohorts.map(c=>c.ready===null?null:c.ready.slice(0,7)<=m?c.n:0)]);
   const targetCapacityHours=knownDisjoint?sum([baselineHours,product(targetReadyRoles,productive)]):null,targetGapHours=gap(demandHours,targetCapacityHours);
   const sourceRemovedHours=sum(cohorts.map(c=>c.ready===null?null:m>=c.ready.slice(0,7)?product(c.n,sourceProductive):c.training[i]));
   const restoredHours=Number(input.backfills)===0?0:backfillReady===null?null:m>=backfillReady.slice(0,7)?product(Number(input.backfills),sourceProductive):0;
   const sourceCapacityHours=!knownDisjoint||sourceCapacity[i]===null||sourceRemovedHours===null||restoredHours===null?null:sourceCapacity[i]!-sourceRemovedHours+restoredHours;
   assert(sourceCapacityHours===null||sourceCapacityHours>=-1e-7,'Source removal exceeds its reviewed capacity.');
   const cohortSource=product(cohorts.reduce((n,c)=>n+c.n,0),sourceProductive);assert(cohortSource===null||sourceCapacity[i]===null||cohortSource<=sourceCapacity[i]!,'Source baseline must include the internal cohort once.');
   const assignedRoles=sum([Number(input.buy)===0?0:arrivals.buy===null?null:arrivals.buy.slice(0,7)<=m?Number(input.buy):0,...cohorts.map(c=>c.assigned===null?null:c.assigned.slice(0,7)<=m?c.n:0)]);
   const traineeCount=sum(cohorts.map(c=>c.training[i]===null?null:c.training[i]!>0?c.n:0));
   const managerRequiredHours=sum([product(assignedRoles,reportHours),product(traineeCount,coaching)]),managerGapHours=gap(managerRequiredHours,managerHours[i]);
   const totalReports=sum([existingReports,assignedRoles]),requiredManagerCount=totalReports===null||span===null?null:Math.ceil(totalReports/span),managerGapCount=gap(requiredManagerCount,managerCount);
   const statuses={target:check(targetGapHours),source:check(gap(sourceWork[i],sourceCapacityHours)),managerHours:check(managerGapHours),managerSpan:check(managerGapCount)};
   const cashLines=cashLedger.map(line=>({id:line.id,label:line.label,amount:line.monthly[i]})),monthlySum=cashReviewed?sum(cashLines.map(line=>line.amount)):null;
   const cashTotal=monthlySum===null?null:cents(monthlySum);
   return {month:m,cashTotal,cashLines,ticketHours,demandHours,baselineHours,requiredAdditionalRoles,targetReadyRoles,targetCapacityHours,targetGapHours,sourceRemovedHours,restoredHours,sourceCapacityHours,sourceGapHours:gap(sourceWork[i],sourceCapacityHours),assignedRoles,managerRequiredHours,managerAvailableHours:managerHours[i],managerGapHours,requiredManagerCount,managerGapCount,statuses,status:combine(Object.values(statuses))};
  });
  const cash=reconciled.cashTotal,budget=draft.inputs.budget?draft.inputs.budget.amount.value:(input.budget===''?null:Number(input.budget));
  const deadlineRow=rows.find(row=>row.month===input.deadlineMonth);
  const deadline:Status=!deadlineRow||deadlineRow.targetReadyRoles===null?'unknown':deadlineRow.targetReadyRoles>=Number(input.roles)?'met':'not-met';
  const checks={deadline,monthlyCapacity:combine(rows.map(r=>r.status)),cash:cash===null||budget===null?'unknown' as const:cash<=budget?'met' as const:'not-met' as const,addedEmployees:input.maxAddedEmployees===''?'unknown' as const:staffing.maxAddedEmployees<=Number(input.maxAddedEmployees)?'met' as const:'not-met' as const,training:trainingHours===null||trainingCash===null||scheduled===null?'unknown' as const:'met' as const};
  return {id:option.id,status:combine(Object.values(checks)),checks,rows,training:{basis:option.training.basis,wholeProgramHours:trainingHours,wholeProgramCash:trainingCash},cash,cashLedger,addedEmployees:staffing.maxAddedEmployees,normalizedDraft:draft,draftKey:bundleInputKey(draft),reconciliationIssues:reconciled.issues};
 });
 return {method:workloadCapacityMethod,classification:'conditional-scenario' as const,identity:structuredClone(raw.identity),profile:structuredClone(raw.profile),sourceKey:JSON.stringify(canonical({method:workloadCapacityMethod,input:raw})),months,options,limits:['Month-start, zero-until-ready then full productive capacity only.','Productive hours, availability, readiness, source release, costs, manager span and coaching are reviewed assumptions, not actual execution.','Manager hours are incremental and must be net of existing duties; span counts existing reports once. No manager or leadership hire/cost is invented.','Training absence is debited from source work before readiness; redeployment permanently removes source contribution until separately ready backfills restore capacity.']};
}
export type WorkloadCapacityReport=ReturnType<typeof calculateWorkloadCapacity>;
export function readWorkloadCapacityReport(raw:unknown,input:WorkloadCapacityInput):WorkloadCapacityReport|null{try{const expected=calculateWorkloadCapacity(input);return JSON.stringify(canonical(raw))===JSON.stringify(canonical(expected))?expected:null;}catch{return null;}}
