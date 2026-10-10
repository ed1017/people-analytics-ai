// @ts-expect-error Native Node tests share application source.
import {calculateHiringBudget,emptyHiringBudget,hiringBudgetFields,readHiringBudgetInput,type HiringBudgetInput,type HiringBudgetField} from './hiring-budget.ts';
import type {SolutionRequest} from './home-solution-conversation';
export type HiringInputBasis={kind:'user-supplied'|'model-proposed'|'user-entry';turnId:string|null;quote:string|null;explanation:string};
export type HiringBudgetReview={version:1;revision:number;datasetToken:string;scopeKey:string;inputs:HiringBudgetInput;origins:Partial<Record<HiringBudgetField,HiringInputBasis>>;basisTurns:{id:string;text:string}[]};
const text={type:'string',minLength:1,maxLength:400};
const basis={type:'object',properties:{kind:{type:'string',enum:['user-supplied','model-proposed']},turnId:{type:['string','null'],maxLength:80},quote:{type:['string','null'],maxLength:4000},explanation:text},required:['kind','turnId','quote','explanation'],additionalProperties:false};
const strings=['role','level','location','snapshotDate','currency','startMonth','arrivalDate','payBasis'];
const changes=hiringBudgetFields.map(field=>({type:'object',properties:{field:{type:'string',enum:[field]},value:{type:[field==='otherCostsComplete'?'boolean':strings.includes(field)?'string':'number','null']},basis},required:['field','value','basis'],additionalProperties:false}));
export const hiringBudgetTool={type:'function' as const,name:'review_hiring_budget',strict:true,description:'Calculate a hiring budget directly from typed scenario inputs, without inventing workload or a salary. Patch only named inputs; omit unchanged values. Current public data has no approved comparable role/level/location salary mean. annualBasePay is an editable scenario override, never company labor cost/FTE or a comp-demo rate. Units: hires whole people; budget total currency units for the entered horizon; annualBasePay annual base per_hire or per_fte; ftePerHire (0,1]; annualAdditionalCostPerHire recurring non-base annual cost per person; recruitingFeePerHire one-time cost per person. Currency, costs, FTE and timing have no defaults. Unknowns are null, explicit zero is allowed. Full cost coverage must be explicit. Returns code-owned cash, timing and limitations; no save or external read.',parameters:{type:'object',properties:{changes:{type:'array',maxItems:hiringBudgetFields.length,items:{anyOf:changes}}},required:['changes'],additionalProperties:false}};
const key=(request:Pick<SolutionRequest,'scope'|'filters'>)=>JSON.stringify([request.scope,request.filters]);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function checkBasis(b:HiringInputBasis,turns:HiringBudgetReview['basisTurns']){
 if(!obj(b)||Object.keys(b).sort().join()!=='explanation,kind,quote,turnId'||!['user-supplied','model-proposed','user-entry'].includes(b.kind)||typeof b.explanation!=='string'||!b.explanation.trim()||b.explanation.length>400)throw Error('Hiring input provenance is unavailable.');
 if(b.kind==='user-supplied'){
  if(typeof b.turnId!=='string'||typeof b.quote!=='string'||!b.quote.trim()||!turns.some(t=>t.id===b.turnId&&t.text.includes(b.quote!)))throw Error('A hiring input requires an exact user quote.');
 }else if(b.turnId!==null||b.quote!==null)throw Error('Scenario inputs cannot borrow source or user-turn provenance.');
}
export function readHiringBudgetReview(raw:unknown):HiringBudgetReview|null{
 if(raw===undefined||raw===null)return null;
 const s=raw as HiringBudgetReview;
 if(!obj(s)||Object.keys(s).sort().join()!=='basisTurns,datasetToken,inputs,origins,revision,scopeKey,version'||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<1||typeof s.datasetToken!=='string'||!s.datasetToken||s.datasetToken.length>200||typeof s.scopeKey!=='string'||s.scopeKey.length>2000||!obj(s.origins)||!Array.isArray(s.basisTurns)||s.basisTurns.length>64||s.basisTurns.some(t=>!obj(t)||typeof t.id!=='string'||typeof t.text!=='string'||t.text.length>10000)||new Set(s.basisTurns.map(t=>t.id)).size!==s.basisTurns.length)throw Error('The hiring estimate cannot be verified.');
 readHiringBudgetInput(s.inputs);
 for(const field of Object.keys(s.origins)){if(!hiringBudgetFields.includes(field as HiringBudgetField))throw Error('Unknown hiring input provenance.');checkBasis(s.origins[field as HiringBudgetField]!,s.basisTurns);}
 for(const field of hiringBudgetFields)if(s.inputs[field]!==null&&!s.origins[field])throw Error('Every entered hiring input needs provenance.');
 return structuredClone(s);
}
export function currentHiringBudget(request:SolutionRequest,datasetToken:string){
 const s=readHiringBudgetReview(request.state.hiringBudget);
 if(s&&(s.datasetToken!==datasetToken||s.scopeKey!==key(request)))throw Error('The hiring estimate belongs to another dataset or workforce scope. Clear it before continuing.');
 return s;
}
export function hiringBudgetView(s:HiringBudgetReview|null){return s?{revision:s.revision,origins:s.origins,...calculateHiringBudget(s.inputs,s.datasetToken)}:null;}
export function editHiringBudget(request:SolutionRequest,datasetToken:string,raw:unknown):HiringBudgetReview{
 const prior=currentHiringBudget(request,datasetToken),s:HiringBudgetReview=prior??{version:1 as const,revision:0,datasetToken,scopeKey:key(request),inputs:emptyHiringBudget(),origins:{},basisTurns:[]};
 const list=raw as {field:HiringBudgetField;value:HiringBudgetInput[HiringBudgetField];basis:HiringInputBasis}[];
 if(!Array.isArray(list)||list.length>hiringBudgetFields.length||new Set(list.map(c=>c.field)).size!==list.length)throw Error('Use distinct hiring input changes.');
 const before=structuredClone(s.inputs);
 const turns=new Map(s.basisTurns.map(t=>[t.id,t]));
 for(const t of [...request.state.turns.filter(t=>t.role==='user'),request.message]){if(turns.has(t.id)&&turns.get(t.id)!.text!==t.text)throw Error('A hiring source turn changed.');turns.set(t.id,{id:t.id,text:t.text});}s.basisTurns=[...turns.values()];
 for(const c of list){
  if(!hiringBudgetFields.includes(c.field)||c.basis?.kind==='user-entry')throw Error('Unsupported hiring input change.');
  checkBasis(c.basis,s.basisTurns);
  if(c.basis.kind==='user-supplied'&&c.basis.turnId!==request.message.id)throw Error('Hiring corrections require the current user turn.');
  if(s.origins[c.field]&&!same(s.inputs[c.field],c.value)&&c.basis.kind!=='user-supplied')throw Error('An existing hiring input changes only through an explicit user correction.');
  if(same(s.inputs[c.field],c.value)&&s.origins[c.field])continue;
  s.inputs={...s.inputs,[c.field]:c.value};s.origins={...s.origins,[c.field]:structuredClone(c.basis)};
 }
 validateCurrencyEdit(before,s.inputs,list.filter(c=>c.basis.kind==='user-supplied').map(c=>c.field));
 s.revision++;return readHiringBudgetReview(s)!;
}
function validateCurrencyEdit(before:HiringBudgetInput,after:HiringBudgetInput,explicit:HiringBudgetField[]){
 if(before.currency!==null&&before.currency!==after.currency)for(const field of ['budget','annualBasePay','annualAdditionalCostPerHire','recruitingFeePerHire'] as const)if(before[field]!==null&&after[field]!==null&&!explicit.includes(field))throw Error('Changing currency requires explicitly re-entering or clearing each money amount; existing amounts are not converted or relabelled.');
}
/** Explicit local editor; changes remain scenario assumptions, never database facts. */
export function editHiringBudgetLocally(previous:HiringBudgetReview,inputs:HiringBudgetInput){
 const s=readHiringBudgetReview(previous)!;readHiringBudgetInput(inputs);
 validateCurrencyEdit(s.inputs,inputs,hiringBudgetFields.filter(field=>!same(s.inputs[field],inputs[field])));
 for(const field of hiringBudgetFields)if(!same(s.inputs[field],inputs[field]))s.origins[field]={kind:'user-entry',turnId:null,quote:null,explanation:'Entered explicitly in the hiring estimate editor; unverified scenario assumption.'};
 s.inputs=structuredClone(inputs);s.revision++;return readHiringBudgetReview(s)!;
}
export const hiringBudgetInstructions=`HIRING BUDGETS: Use review_hiring_budget for a count-and-budget question such as hiring engineers within a cap; it does not require an invented workload review. Supply only explicit interpreted inputs or clearly labelled model-proposed assumptions. A bare dollar amount does not establish USD or an annual horizon. For 10 hires and a total budget, code can calculate the allowance per hire even while salary and timing remain unknown. Explain useful conditional choices (count, level/location mix, start timing, scope or verified internal capacity) without inventing cost savings or claiming affordability. Salary overrides are visible editable assumptions. Company labor cost/FTE is not base salary; public market figures and the separate comp-demo synthetic rates are not company salary. No approved comparable salary source is connected in this release. Do not cite the tool's unavailable salary state as evidence that no employees or compensation exist. Preserve omitted values on follow-ups; current-user corrections can withdraw an input with null. Currency, annual-vs-period basis, FTE, recurring non-base costs, recruiting fees and coverage stay unknown until supplied or explicitly proposed. Code returns budget allowance, base subtotal, complete period cost, annual run rate and timing; use only successful current-turn results for new numerical claims. A within-period budget does not establish that all hires arrive on time or become productive. Earlier hiringBudget context is recomputed by code, not source salary evidence. Local editor changes supersede earlier chat assumptions. Do not manufacture candidate/projection verifiedMetricReferences for hiring results; the hiring review card displays its calculated quantities. This estimate never saves an Action Plan, applies a hiring decision or proves availability.`;
