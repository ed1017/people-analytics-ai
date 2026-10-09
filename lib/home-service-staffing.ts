/** Typed provisional inputs over the existing deterministic staffing kernel. No demo defaults. */
import type {DemandBasis,DemandReview} from './swp-demand';
// @ts-expect-error Native Node tests share TypeScript source.
import {serviceDemandSchema} from './swp-demand.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {emptyWorkforcePlanInput,planDate,type WorkforcePlanInput} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {preflightWorkforceMixes,canonical} from './workforce-mix-search-core.ts';

const numeric=['buildMax','moveMax','backfills','annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange','trainingCash','trainingHours','maxAddedEmployees'] as const;
const dates=['arrivalDate','buildMonth','moveMonth','backfillDate','deadlineMonth'] as const;
const flags=['internalPoolsDistinct','internalRelease','costsCompleteAndDistinct'] as const;
export const staffingFields=[...numeric,...dates,...flags] as const;
export type StaffingField=typeof staffingFields[number];
export type StaffingAtom={value:number|string|boolean|null;basis:DemandBasis};
export type StaffingInputs={scope:string;startMonth:string;values:Record<StaffingField,StaffingAtom>;basisTurns:DemandReview['basisTurns']};
const obj=(properties:Record<string,typeof serviceDemandSchema>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const basis=serviceDemandSchema.properties!.scopeBasis;
const changes=staffingFields.map(field=>obj({field:{type:'string',enum:[field]},value:{anyOf:[{type:'null'},numeric.includes(field as typeof numeric[number])?{type:'number',minimum:0,maximum:100000000}:flags.includes(field as typeof flags[number])?{type:'boolean'}:{type:'string',minLength:7,maxLength:10}]},basis}));
export const compareServiceStaffingTool={type:'function' as const,name:'compare_service_staffing',strict:true,
 description:'Compare provisional Build/Move/Hire mixes for the current checked demand review. Copy its reviewRef. Changes are explicit typed assumptions, not approvals; omitted values retain their exact values and provenance. New inputs start Unknown. A quoted current-user withdrawal may set a value to null while retaining its user-supplied basis. No demo, cost quote, dates, internal pool, release or zero backfill is supplied by code. Training cash/hours and annual internal uplift are TOTAL path amounts held fixed across mixes, not per-person rates. Internal pools must explicitly be distinct from each other and the already counted capacity, and releasable. Units: rates USD/year, fees USD/hire, cash USD total, hours total, counts whole roles, dates YYYY-MM-DD, months YYYY-MM. Missing budget permits a comparison with unknown affordability. Read-only; never accepts or saves.',
 parameters:obj({reviewRef:{type:'string',minLength:1,maxLength:180},changes:{type:'array',minItems:0,maxItems:staffingFields.length,items:{anyOf:changes}}})};
const unknown=():StaffingAtom=>({value:null,basis:{kind:'unknown',turnId:null,quote:null,explanation:'Not supplied or proposed.'}});
const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
function checkAtom(field:StaffingField,atom:StaffingAtom,turns:DemandReview['basisTurns']){
 assertSolutionShape({field,...atom},changes[staffingFields.indexOf(field)],'staffing assumption');
 const b=atom.basis;
 if(atom.value===null?!['unknown','user-supplied'].includes(b.kind):b.kind==='unknown')throw Error('Unknown staffing values need an unknown basis or an explicit quoted user withdrawal.');
 if(b.kind==='user-supplied'){
  const turn=turns.find(t=>t.id===b.turnId);if(!turn||!b.quote||!turn.text.includes(b.quote))throw Error('Staffing input needs an exact supplied user quote.');
 }else if(b.turnId!==null||b.quote!==null)throw Error('Proposed staffing assumptions cannot borrow user provenance.');
 if(typeof atom.value==='number'&&(!Number.isFinite(atom.value)||Math.abs(atom.value*100-Math.round(atom.value*100))>1e-6))throw Error('Use nonnegative amounts with at most two decimals.');
 if(['buildMax','moveMax','backfills','maxAddedEmployees'].includes(field)&&atom.value!==null&&(!Number.isSafeInteger(atom.value)||Number(atom.value)>20))throw Error('This provisional comparison supports at most 20 whole roles per pool.');
 if(dates.includes(field as typeof dates[number])&&atom.value!==null){const text=String(atom.value);if(!planDate(text.length===7?text+'-01':text)||(field.endsWith('Month')?text.length!==7:text.length!==10))throw Error('Use the exact date or month unit for this staffing field.');}
}
export function readStaffingInputs(raw:unknown):StaffingInputs{
 const s=raw as StaffingInputs;
 if(!s||Object.keys(s).sort().join()!=='basisTurns,scope,startMonth,values'||typeof s.scope!=='string'||!s.scope.trim()||s.scope.length>240||!planDate(s.startMonth+'-01')||!Array.isArray(s.basisTurns)||s.basisTurns.length>64||!s.values||Object.keys(s.values).sort().join()!==[...staffingFields].sort().join())throw Error('Staffing input identity is invalid.');
 if(s.basisTurns.some(t=>!t||typeof t.id!=='string'||typeof t.text!=='string'||t.text.length>10000)||new Set(s.basisTurns.map(t=>t.id)).size!==s.basisTurns.length)throw Error('Staffing provenance turns are invalid.');
 for(const field of staffingFields)checkAtom(field,s.values[field],s.basisTurns);
 return structuredClone(s);
}
export function editStaffingInputs(review:DemandReview,previous:StaffingInputs|null,raw:unknown,current:{id:string;text:string},turns:DemandReview['basisTurns']):StaffingInputs{
 const list=raw as Array<{field:StaffingField}&StaffingAtom>;
 if(!review.spec.scope||!review.spec.startMonth)throw Error('Clarify the role slice and start before comparing staffing.');
 const s=previous?readStaffingInputs(previous):{scope:review.spec.scope,startMonth:review.spec.startMonth,values:Object.fromEntries(staffingFields.map(k=>[k,unknown()])) as StaffingInputs['values'],basisTurns:[]};
 if(s.scope!==review.spec.scope||s.startMonth!==review.spec.startMonth)throw Error('Earlier staffing inputs belong to another scope or start. Explicitly clear that comparison before proposing new inputs.');
 const all=new Map(s.basisTurns.map(t=>[t.id,t]));for(const t of turns){if(all.has(t.id)&&all.get(t.id)!.text!==t.text)throw Error('A retained staffing source turn changed.');all.set(t.id,t);}s.basisTurns=[...all.values()];
 if(!Array.isArray(list)||list.length>staffingFields.length||new Set(list.map(c=>c.field)).size!==list.length)throw Error('Use distinct typed staffing changes.');
 for(const c of list){
  if(!staffingFields.includes(c.field))throw Error('Unsupported staffing assumption.');
  const atom={value:c.value,basis:c.basis};checkAtom(c.field,atom,s.basisTurns);
  if(c.basis.kind==='user-supplied'&&c.basis.turnId!==current.id)throw Error('Corrections require the current user turn.');
  if((s.values[c.field].value!==null||s.values[c.field].basis.kind==='user-supplied')&&!equal(s.values[c.field],atom)&&c.basis.kind!=='user-supplied')throw Error('An existing staffing premise can change only through a current-user correction.');
  s.values[c.field]=structuredClone(atom);
 }
 return readStaffingInputs(s);
}
export type ServiceStaffingOption={id:string;mix:{build:number;move:number;buy:number};input:WorkforcePlanInput;cash:number|null;listedCash:number|null;staffHours:number|null;addedEmployees:number;coverageDate:string|null;additionalHours:number|null;shortfallHours:number|null;status:'met'|'not-met'|'unknown'|'invalid';reason:string|null;monthly:{month:string;roles:number|null;cash:number|null}[]};
export type ServiceStaffingResult={status:'calculated'|'needs-inputs'|'no-gap';missing:string[];options:ServiceStaffingOption[];enumerated:number;sourceScope:string|null;operationalFeasibilityVerified:false;accepted:false;limitations:string[]};
export function calculateServiceStaffing(review:DemandReview,raw:StaffingInputs):ServiceStaffingResult{
 const s=readStaffingInputs(raw),d=review.spec,r=review.result,missing:string[]=[];
 const result:ServiceStaffingResult={status:'needs-inputs',missing,options:[],enumerated:0,sourceScope:d.scope,operationalFeasibilityVerified:false,accepted:false,limitations:[
  'Provisional assumptions only; scope and employee availability are not source verified. Comparison alone accepts no scenario and saves no plan.',
  'Only this additional whole-role slice is modeled. Contract wins, peaks, shifts, service levels and causal training effects are not established.',
  'Training cash/hours and annual internal uplift are total path amounts held fixed across mixes. Unlisted costs are not estimated.',
  'Workload coverage assumes uniform monthly productive hours; hire arrival is prorated in its first month. End-date role coverage alone does not cover an earlier shortfall.',
  'Internal pools, when enabled, are assumed separate from baseline capacity and each other. Source-team release and skill readiness remain unverified.',
 ]};
 if(s.scope!==d.scope||s.startMonth!==d.startMonth){missing.push('Staffing inputs belong to an earlier role slice or start. Clear the comparison explicitly before changing its scope.');return result;}
 if(r.status!=='calculated'){missing.push(...r.missing);return result;}
 if(d.scope!.length>100){missing.push('Use a role-slice label of at most 100 characters for this calculator; the full objective is retained.');return result;}
 if(r.additionalRoles===0)return {...result,status:'no-gap'};
 if(r.additionalRoles===null||r.additionalRoles>20||d.ftePerRole.value!==1){missing.push('This comparison supports a positive gap of at most 20 whole full-time roles; the demand calculation is retained.');return result;}
 const value=(key:StaffingField)=>s.values[key].value;
 const internal=value('internalPoolsDistinct')===true&&value('internalRelease')===true&&value('backfills')!==null;
 if(!internal)missing.push('Build/Move excluded until separate internal pools, release and backfill premises are supplied; exclusion does not prove no internal capacity.');
 const roles=r.additionalRoles,build=internal?Math.min(Number(value('buildMax')??0),roles):0,move=internal?Math.min(Number(value('moveMax')??0),roles):0;
 const input={...emptyWorkforcePlanInput(),businessUnit:d.scope!,jobProfile:d.scope!,intent:'additional',roles:String(roles),build:'0',move:'0',buy:String(roles),planningMonth:d.startMonth!,months:String(d.months),arrivalMode:'explicit',budget:d.budgetUsd.value===null?'':String(d.budgetUsd.value)};
 for(const key of [...numeric,...dates])if(!['buildMax','moveMax'].includes(key))input[key as keyof WorkforcePlanInput]=value(key)===null?'':String(value(key));
 try{
  const {enumerated,withinBudget}=preflightWorkforceMixes(roles,{build:{min:0,max:build},move:{min:0,max:move},buy:{min:0,max:roles},maxEvaluations:256,maxResults:64,resultFilter:'all',assumptionPolicy:'preserve-reviewed-path-totals-and-timing'});
  if(!withinBudget)throw Error('The explicit staffing bounds exceed the calculation budget.');
  result.enumerated=enumerated;
  // Reuse the common bounds preflight and calculator, once per mix. Backfill is
  // inactive in all-hire mixes; the supplied premise is preserved for internal paths.
  for(let b=0;b<=build;b++)for(let m=0;m<=Math.min(move,roles-b);m++){
   const buy=roles-b-m,mix={build:b,move:m,buy};
   const candidateInput={...input,build:String(b),move:String(m),buy:String(buy),backfills:b+m?input.backfills:''};
   result.options.push(staffingOption(`build-${b}-move-${m}-buy-${buy}`,mix,candidateInput,review,value('costsCompleteAndDistinct')===true));
  }
  const referenceOption=result.options.find(o=>o.mix.build===0&&o.mix.move===0);
  const ranked=[...result.options].sort((a,b)=>(a.shortfallHours??Infinity)-(b.shortfallHours??Infinity)||(a.cash??Infinity)-(b.cash??Infinity)||a.addedEmployees-b.addedEmployees||a.id.localeCompare(b.id));
  result.options=[...(referenceOption?[referenceOption]:[]),...ranked.filter(o=>o!==referenceOption)].slice(0,6);
  result.limitations.push('At most six options are shown: the all-hire reference, then smaller known workload shortfall and complete cash within the explicit bounds. Unknown metrics do not establish a best option.');
  result.status='calculated';return result;
 }catch(error){missing.push(error instanceof Error?error.message:'Staffing inputs could not be calculated.');return result;}
}
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateWorkforceIncrement} from './workforce-increment.ts';
function staffingOption(id:string,mix:ServiceStaffingOption['mix'],input:WorkforcePlanInput,review:DemandReview,complete:boolean):ServiceStaffingOption{
 const base:ServiceStaffingOption={id,mix,input,cash:null,listedCash:null,staffHours:null,addedEmployees:mix.buy,coverageDate:null,additionalHours:null,shortfallHours:null,status:'invalid',reason:null,monthly:[]};
 try{
  const p=calculateWorkforceIncrement(input,null),hours=Number(input.build)>0?(input.trainingHours===''?null:Number(input.trainingHours)):0;
  const cash=complete?p.totalCash:null;
  const monthly=p.rows.map(row=>({month:row.month,roles:row.conditionalRoleCoverage,cash:complete?row.incrementalCash:null}));
  const coverageDate=[mix.buy?p.arrivalDate:null,mix.build?input.buildMonth+'-01':null,mix.move?input.moveMonth+'-01':null].filter(Boolean).sort().at(-1)??null;
  let additionalHours:number|null=null;
  if(monthly.every(row=>row.roles!==null)){
   const perMonth=review.result.productiveHoursInHorizon!/review.spec.months!;
   additionalHours=monthly.reduce((total,row)=>{
    let roles=row.roles!;if(mix.buy&&p.arrivalDate?.slice(0,7)===row.month){const start=planDate(row.month+'-01')!,next=new Date(start);next.setUTCMonth(next.getUTCMonth()+1);roles-=mix.buy*(planDate(p.arrivalDate)!-start)/(next.getTime()-start);}
    return total+roles*perMonth;
   },0);
  }
  const budget=review.spec.budgetUsd.value,checks=p.checks.filter(c=>c.name!=='Incremental cash budget');
  const status=checks.some(c=>c.status==='not met')||cash!==null&&budget!==null&&cash>budget?'not-met':checks.some(c=>c.status==='unknown')||cash===null||budget===null?'unknown':'met';
  return {...base,cash,listedCash:p.totalCash,staffHours:hours,addedEmployees:p.maxAddedEmployees,coverageDate:monthly.some(row=>row.roles===null)?null:coverageDate,additionalHours,shortfallHours:additionalHours===null?null:Math.max(0,review.result.gapHours!-additionalHours),status,monthly};
 }catch(error){return {...base,reason:error instanceof Error?error.message:'Invalid staffing inputs.'};}
}
