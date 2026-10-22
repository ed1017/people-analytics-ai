// @ts-expect-error Native tests share source.
import {confirmsBudgetAmount,confirmsBasePayAmount} from './hiring-budget-authority.ts';
// @ts-expect-error Native Node tests share application source.
import {calculateHiringBudget,emptyHiringBudget,hiringBudgetFields,readHiringBudgetInput,type HiringBudgetInput,type HiringBudgetField} from './hiring-budget.ts';
import type {SolutionRequest} from './home-solution-conversation';
export type HiringInputBasis={kind:'user-supplied'|'model-proposed'|'user-entry';turnId:string|null;quote:string|null;explanation:string};
export type HiringBudgetReview={version:1;revision:number;datasetToken:string;scopeKey:string;inputs:HiringBudgetInput;origins:Partial<Record<HiringBudgetField,HiringInputBasis>>;basisTurns:{id:string;text:string}[]};
const text={type:'string',minLength:1,maxLength:400};
const basis={type:'object',properties:{kind:{type:'string',enum:['user-supplied','model-proposed']},turnId:{type:['string','null'],maxLength:80},quote:{type:['string','null'],maxLength:4000},explanation:text},required:['kind','turnId','quote','explanation'],additionalProperties:false};
const strings=['role','level','location','snapshotDate','currency','startMonth','arrivalDate','payBasis'];
const changes=hiringBudgetFields.map(field=>({type:'object',properties:{field:{type:'string',enum:[field]},value:{type:[field==='otherCostsComplete'?'boolean':strings.includes(field)?'string':'number','null']},basis},required:['field','value','basis'],additionalProperties:false}));
export const hiringBudgetTool={type:'function' as const,name:'review_hiring_budget',strict:true,description:'Calculate a hiring budget directly from typed scenario inputs, without inventing workload or source salary. Count plus budget can provide a partial allowance per hire without salary, currency or timing defaults. A budget ceiling and annualBasePay require explicit user-supplied inputs; never auto-adopt an estimated policy band. Other model-proposed scenario inputs are allowed with explicit currency, time and pay basis; a base-pay spending ceiling additionally needs the relevant timing and non-base cost inputs. Patch only named inputs; omit unchanged values. Current public data has no approved comparable role/level/location salary mean. annualBasePay is an editable scenario override, never company labor cost/FTE or a comp-demo rate. Units: hires whole people; budget total currency units for the entered horizon; annualBasePay annual base per_hire or per_fte; ftePerHire (0,1]; annualAdditionalCostPerHire recurring non-base annual cost per person; recruitingFeePerHire one-time cost per person. Currency, costs, FTE and timing have no defaults. Unknowns are null, explicit zero is allowed. Full cost coverage must be explicit. Returns code-owned cash, timing and limitations; no save or external read.',parameters:{type:'object',properties:{changes:{type:'array',maxItems:hiringBudgetFields.length,items:{anyOf:changes}}},required:['changes'],additionalProperties:false}};
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
/** Present the strongest available result without turning a budget into a salary or a staffing promise. */
export function hiringPlanningSummary(result:ReturnType<typeof calculateHiringBudget>){
 const {input}=result;
 const cost=result.periodCost!==null?{kind:'complete' as const,amount:result.periodCost}
  :result.listedCost!==null?{kind:'listed' as const,amount:result.listedCost}
  :result.knownSubtotal!==null?{kind:'subtotal' as const,amount:result.knownSubtotal}
  :result.budgetPerHire!==null?{kind:'allowance' as const,amount:result.budgetPerHire}
  :{kind:'unknown' as const,amount:null};
 return {cost:{...cost,currency:input.currency},months:input.months,startMonth:input.startMonth,arrivalDate:input.arrivalDate,hires:input.hires,ftePerHire:input.ftePerHire};
}
export function hiringBudgetView(s:HiringBudgetReview|null){
 if(!s)return null;
 const result=calculateHiringBudget(s.inputs,s.datasetToken);
 return {revision:s.revision,origins:s.origins,...result,planningSummary:hiringPlanningSummary(result)};
}
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
  if((c.field==='budget'||c.field==='annualBasePay')&&c.value!==null&&c.basis.kind!=='user-supplied')throw Error('A budget ceiling or base-pay assumption requires explicit user input; a policy estimate alone is not confirmation.');
  if(c.field==='budget'&&c.value!==null&&!confirmsBudgetAmount(request.message.text,c.value as number))throw Error('State the budget ceiling and amount explicitly, or enter it in the budget editor. Confirming pay does not approve funding.');
  if(c.field==='annualBasePay'&&c.value!==null&&!confirmsBasePayAmount(request.message.text,c.value as number))throw Error('State the annual base-pay amount explicitly, or enter it in the estimate editor; an ambiguous yes does not select a rate.');
  if(c.basis.kind==='user-supplied'&&c.basis.turnId!==request.message.id)throw Error('Hiring corrections require the current user turn.');
  if(s.origins[c.field]&&(s.inputs[c.field]!==null||s.origins[c.field]?.kind!=='model-proposed')&&!same(s.inputs[c.field],c.value)&&c.basis.kind!=='user-supplied')throw Error('An existing hiring input changes only through an explicit user correction.');
  if(same(s.inputs[c.field],c.value)&&s.origins[c.field]&&c.basis.kind!=='user-supplied')continue;
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
/** Reset local scenario edits without converting model assumptions into user-confirmed inputs. */
export function restoreHiringBudgetBaseline(current:HiringBudgetReview,baseline:HiringBudgetReview){
 const now=readHiringBudgetReview(current)!,prior=readHiringBudgetReview(baseline)!;
 if(now.datasetToken!==prior.datasetToken||now.scopeKey!==prior.scopeKey||prior.revision>now.revision)throw Error('The scenario baseline belongs to a different context.');
 return readHiringBudgetReview({...prior,revision:now.revision+1})!;
}
export const hiringBudgetInstructions=`HIRING CALCULATOR: Use review_hiring_budget for count-and-budget decisions without inventing workload. Preserve required count and cap; do not treat a need for people as verified external-hire availability. Propose a labelled scenario horizon, currency, FTE and timing when appropriate; read_clock supports relative dates, never silent date defaults. A bare $ is not USD. Rates require explicit annual/period and per-hire/per-FTE basis. Company labor cost/FTE and comp-demo rates are not salary evidence. No observed comparable salary source is connected. estimate_policy_base_pay can read constructed global job-code/level policy bands for clearly labeled base-pay scenario estimates. Use it before requesting a budget, then ask the user to select or adjust the pay assumption. It does not supply location pricing, loaded costs or approved funding. The planningSummary identifies the strongest available partial result. When only count and budget are supplied, use budgetPerHire as an allowance for that budget period, explicitly leaving currency or period unknown unless supplied or proposed. A missing budget, salary, target date or cost breakdown does not prevent an exploratory staffing recommendation. Budget is optional: compare qualitative hire/move/develop options without inventing availability, or estimate costs from supported references or explicit scenario assumptions. Never invent a budget ceiling; estimate confirmation is not funding approval. With no ceiling, affordability is not assessed; explicit zero remains zero. Do not make a budget question a prerequisite to exploration. Do not collect every missing field before giving that guidance. If a defensible timed cost scenario is useful, propose transparent non-base/recruiting allowances if justified and use the calculator's annualBasePayCeiling before unlisted costs; do not set salary equal to budget/count. Preserve explicit user withdrawals. An earlier model-proposed null is missing, not a user prohibition on assumptions.
For a positive-count exploratory hiring recommendation, with or without a budget, that cannot yet produce a costed USD route (listedCost is null, currency is not USD, or FTE per hire is null), return conditionalHiringPlan with the exact hiring calculationRefs plus findings, decisionRationale and caveats. The native conditional card owns the concrete review steps, editable cost/time/resources and review/pin controls; do not duplicate these in a recommendedPlan or generic candidate. Use discussionOnly for factual/no-plan requests. This conditional proposal does not confirm complete costs or availability.
For a costed hiring recommendation, use the tool's exact planningGuidance.binding.reference in the calculated-plan answer object, with concrete conditional steps and at most two decisive questions. Do not create a duplicate all-unknown generic Action Plan for this same hiring estimate. Return one recommended scenario by default; comparisons must retain the same requirement and cap. A later start can reduce period cash but delays staffing and does not reduce annual recurring cost. Unknown readiness or full costs prevents affordability/on-time claims. The existing card owns the calculated quantities and editable assumptions. No candidate/projection metric references, saving or approval are implied.`;
