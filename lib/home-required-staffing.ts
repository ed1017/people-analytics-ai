import type {SolutionRequest} from './home-solution-conversation';
import type {HiringInputBasis} from './home-hiring-budget';
// @ts-expect-error Native Node tests share application source.
import {calculateRequiredStaffing,emptyRequiredStaffing,readRequiredStaffingInput,requiredStaffingFields,staffingFlagFields,staffingCashFields,type RequiredStaffingInput,type StaffingInputField} from './required-staffing.ts';
export type RequiredStaffingReview={version:1;revision:number;datasetToken:string;scopeKey:string;inputs:RequiredStaffingInput;origins:Partial<Record<StaffingInputField,HiringInputBasis>>;basisTurns:{id:string;text:string}[]};
const basis={type:'object',properties:{kind:{type:'string',enum:['user-supplied','model-proposed']},turnId:{type:['string','null'],maxLength:80},quote:{type:['string','null'],maxLength:4000},explanation:{type:'string',minLength:1,maxLength:400}},required:['kind','turnId','quote','explanation'],additionalProperties:false};
export const requiredStaffingTool={type:'function' as const,name:'compare_required_staffing',strict:true,description:'Compare ways to fill an explicitly required count of people without workload or a company-population lookup. Use for direct hire/train/redeploy comparisons. Inputs are scenario assumptions with provenance; no source read, save or operational action. requiredRoles/trainablePeople/redeployablePeople are whole counts up to 20; months is 1–24; hireCostPerPerson is cash for the ENTIRE stated horizon, not annual salary; trainingCostPerPerson/trainingHoursPerPerson are PER TRAINEE; redeploymentCostPerPerson and backfillCostPerInternalPerson are incremental cash PER INTERNAL PERSON for the period. hireTrainingHoursPerPerson is unknown unless explicitly specified; do not infer zero from an all-hire option. ReadyAfterMonths are whole offsets from period start, zero means ready at start. Unknown fields are null; zero and cost completeness must be explicit. Omit unchanged fields; existing premises change only with a current-user quote. Empty changes recalculates the current comparison for a numerical follow-up. No candidate/projection metric IDs are generated.',parameters:{type:'object',properties:{changes:{type:'array',maxItems:requiredStaffingFields.length,items:{anyOf:requiredStaffingFields.map(field=>({type:'object',properties:{field:{type:'string',enum:[field]},value:{type:[['role','currency'].includes(field)?'string':staffingFlagFields.includes(field as typeof staffingFlagFields[number])?'boolean':'number','null']},basis},required:['field','value','basis'],additionalProperties:false}))}}},required:['changes'],additionalProperties:false}};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const key=(r:Pick<SolutionRequest,'scope'|'filters'|'goal'>)=>JSON.stringify([r.goal,r.scope,r.filters]);
function checkBasis(b:HiringInputBasis,turns:RequiredStaffingReview['basisTurns']){
 if(!b||Object.keys(b).sort().join()!=='explanation,kind,quote,turnId'||!['user-supplied','model-proposed'].includes(b.kind)||typeof b.explanation!=='string'||!b.explanation.trim()||b.explanation.length>400)throw Error('Staffing input provenance is invalid.');
 if(b.kind==='user-supplied'){if(typeof b.turnId!=='string'||typeof b.quote!=='string'||!b.quote.trim()||!turns.some(t=>t.id===b.turnId&&t.text.includes(b.quote!)))throw Error('Staffing inputs require an exact user quote.');}
 else if(b.turnId!==null||b.quote!==null)throw Error('Proposed staffing assumptions cannot borrow user provenance.');
}
export function readRequiredStaffingReview(raw:unknown):RequiredStaffingReview|null{
 if(raw===undefined||raw===null)return null;
 const s=raw as RequiredStaffingReview;
 if(!s||typeof s!=='object'||Object.keys(s).sort().join()!=='basisTurns,datasetToken,inputs,origins,revision,scopeKey,version'||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<1||typeof s.datasetToken!=='string'||!s.datasetToken||s.datasetToken.length>200||typeof s.scopeKey!=='string'||s.scopeKey.length>3000||!s.origins||typeof s.origins!=='object'||Array.isArray(s.origins)||!Array.isArray(s.basisTurns)||s.basisTurns.length>64||s.basisTurns.some(t=>!t||typeof t.id!=='string'||typeof t.text!=='string'||t.text.length>10000)||new Set(s.basisTurns.map(t=>t.id)).size!==s.basisTurns.length)throw Error('The fixed-role comparison cannot be verified.');
 readRequiredStaffingInput(s.inputs);
 for(const field of Object.keys(s.origins)){if(!requiredStaffingFields.includes(field as StaffingInputField))throw Error('Unknown staffing field.');checkBasis(s.origins[field as StaffingInputField]!,s.basisTurns);}
 for(const field of requiredStaffingFields)if(s.inputs[field]!==null&&!s.origins[field])throw Error('Every staffing input needs provenance.');
 return structuredClone(s);
}
export function currentRequiredStaffing(request:SolutionRequest,datasetToken:string){
 const s=readRequiredStaffingReview(request.state.requiredStaffing);
 if(s&&(s.datasetToken!==datasetToken||s.scopeKey!==key(request)))throw Error('The staffing comparison belongs to another goal, dataset or workforce scope. Clear it before continuing.');
 return s;
}
export const requiredStaffingView=(s:RequiredStaffingReview|null)=>s?{revision:s.revision,origins:s.origins,...calculateRequiredStaffing(s.inputs)}:null;
/** Routing only: the model still supplies typed, provenance-checked inputs. */
export function requiresRequiredStaffing(request:SolutionRequest){
 const text=request.message.text;
 const strategies=[/\bhir(?:e|es|ing)\b/i,/\btrain(?:ing|ee|ees|able)?\b/i,/\bredeploy(?:ment|able|ing)?\b/i].filter(pattern=>pattern.test(text)).length;
 const count='(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
 const requirement=new RegExp('\\b(?:fill|staff|cover|need|require|required)\\s+(?:exactly\\s+)?'+count+'(?:\\s+[\\w-]+){0,3}\\s+(?:roles?|positions?|people|employees?|engineers?|developers?|analysts?)\\b','i');
 if(strategies>=2&&requirement.test(text))return true;
 return !!request.state.requiredStaffing&&(/\b(?:numerical|numbers|totals?|recalculate|recompute|compare|comparison|options?|mixes)\b/i.test(text)||/\b(?:change|make|set|use|clear|remove|update|keep)\b/i.test(text)&&/\b(?:training|trainee|hire|hiring|redeploy\w*|backfill|budget|month\w*|horizon|currency|role\w*|pool\w*|hours?|cost\w*|USD|EUR|GBP)\b/i.test(text));
}
// Performance gate, not a general intent classifier. Every clause must fit a
// bounded staffing request/premise grammar; unfamiliar wording keeps the full loop.
const staffingNumber='(?:\\d+(?:[.,]\\d+)*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
const staffingMoney='(?:USD|EUR|GBP)\\s+'+staffingNumber;
const staffingStrategies='(?:hir(?:e|ing)|train(?:ing)|redeploy(?:ment|ing)?)';
const staffingStrategyList=staffingStrategies+'(?:(?:\\s*[/,]\\s*(?:and\\s+)?|\\s+(?:and|or)\\s+)'+staffingStrategies+'){1,2}';
const staffingRequestPatterns=[
 `(?:illustrative scenario:\\s*)?(?:please\\s+)?(?:compare ways to\\s+)?(?:fill|staff|cover|need|require)\\s+${staffingNumber}\\s+(?:[a-z-]+\\s+){0,3}(?:roles?|positions?|people|employees?|engineers?|developers?|analysts?)(?:\\s+over\\s+${staffingNumber}\\s+months?)?(?:,?\\s+with a budget of\\s+${staffingMoney})?(?:\\s+by\\s+${staffingStrategyList})?`,
 '(?:give me|show me|recalculate|recompute|compare) (?:the )?(?:numerical totals|numbers|totals|options|comparison)(?: for the (?:three )?options)?(?: again)?',
 `(?:make|set|change) training (?:to )?${staffingMoney} per trainee`,
].map(pattern=>new RegExp('^(?:'+pattern+')$','i'));
const staffingPremisePatterns=[
 `each hire costs ${staffingMoney} for the (?:whole )?${staffingNumber}-month period`,
 `each trainee costs ${staffingMoney}(?: and needs ${staffingNumber} planned training hours)?`,
 `redeployment adds ${staffingNumber} cash per person`,
 `we have a pool of ${staffingNumber} redeployable people and a separate pool of ${staffingNumber} trainable people`,
 '(?:release|readiness|backfill costs|other cost coverage)(?:(?:, | and )(?:release|readiness|backfill costs|other cost coverage))* (?:is|are|remain) unknown',
 'new-hire training requirements are not specified',
 'keep the (?:required headcount, horizon and all other premises|other premises|same assumptions) unchanged',
].map(pattern=>new RegExp('^(?:'+pattern+')$','i'));
export function canCompleteRequiredStaffingAlone(request:SolutionRequest){
 if(!requiresRequiredStaffing(request))return false;
 const clauses=request.message.text.trim().split(/[.!?;\n]+(?!\d)/).map(clause=>clause.trim()).filter(Boolean);
 const requests=clauses.filter(clause=>staffingRequestPatterns.some(pattern=>pattern.test(clause)));
 // A generic continuation is ambiguous when another planning review is retained.
 if((request.state.hiringBudget||request.state.businessPlanning)&&!requests.some(clause=>staffingRequestPatterns[0].test(clause)))return false;
 return requests.length===1&&clauses.every(clause=>[...staffingRequestPatterns,...staffingPremisePatterns].some(pattern=>pattern.test(clause)));
}
/** Numerical prose shares the cards' calculator, so unknown requirements cannot become zero. */
export function requiredStaffingAnswer(review:RequiredStaffingReview){
 const r=requiredStaffingView(review)!;
 if(!r.options.length)return 'The staffing comparison needs more inputs: '+r.missing.join(' ')+' Nothing was saved.';
 const show=(n:number|null)=>n===null?'Unknown':String(n),unit=r.input.currency??'(currency unknown)';
 const lines=r.options.map(o=>{
  const training=[o.train?`${show(o.plannedTrainingHours)} planned training hours`:null,o.newHireTrainingUnspecified?'new-hire training not specified':o.hire?`${show(o.totalTrainingHours)} total training hours in this scenario`:null].filter(Boolean).join('; ')||'No trainee or new-hire training is modeled.';
  return `Train ${o.train}, redeploy ${o.redeploy}, hire ${o.hire}: ${show(o.listedCash)} ${unit} known incremental cash${o.completeCash===null?' (subtotal)':''}${o.budgetStatus==='over'?' — over budget':''}; ${training}. Readiness: ${o.readyAfterMonths===null?'Unknown':o.readyAfterMonths+' months'}. Coverage: ${o.coverage}.`;
 });
 const unknowns=[...new Set(r.options.flatMap(o=>o.unknowns))];
 return ['Calculated from the stated scenario; actual people and skills are unverified.',...lines,r.recommendation?`Recommendation: ${r.recommendation.text} Next step: ${r.recommendation.nextStep}`:'Next step: confirm the missing inputs before choosing an option.',...r.missing,...unknowns,'Nothing was saved or applied.'].join('\n');
}
export function editRequiredStaffing(request:SolutionRequest,datasetToken:string,raw:unknown):RequiredStaffingReview{
 const s=currentRequiredStaffing(request,datasetToken)??{version:1 as const,revision:0,datasetToken,scopeKey:key(request),inputs:emptyRequiredStaffing(),origins:{},basisTurns:[]};
 const list=raw as {field:StaffingInputField;value:RequiredStaffingInput[StaffingInputField];basis:HiringInputBasis}[];
 if(!Array.isArray(list)||list.length>requiredStaffingFields.length||list.some(c=>!c||!requiredStaffingFields.includes(c.field))||new Set(list.map(c=>c.field)).size!==list.length)throw Error('Use distinct supported staffing changes.');
 const before=structuredClone(s.inputs),turns=new Map(s.basisTurns.map(t=>[t.id,t]));
 for(const t of [...request.state.turns.filter(t=>t.role==='user'),request.message]){if(turns.has(t.id)&&turns.get(t.id)!.text!==t.text)throw Error('A staffing source turn changed.');turns.set(t.id,{id:t.id,text:t.text});}s.basisTurns=[...turns.values()];
 for(const c of list){checkBasis(c.basis,s.basisTurns);if(c.basis.kind==='user-supplied'&&c.basis.turnId!==request.message.id)throw Error('Staffing corrections require the current user turn.');if(s.origins[c.field]&&!same(s.inputs[c.field],c.value)&&c.basis.kind!=='user-supplied')throw Error('Existing staffing premises require an explicit user correction.');if(same(s.inputs[c.field],c.value)&&s.origins[c.field])continue;s.inputs={...s.inputs,[c.field]:c.value};s.origins={...s.origins,[c.field]:structuredClone(c.basis)};}
 const requireRestated=(fields:readonly StaffingInputField[])=>{for(const field of fields)if(before[field]!==null&&s.inputs[field]!==null&&!list.some(c=>c.field===field&&c.basis.kind==='user-supplied'))throw Error('Changing the role, currency or cost horizon requires explicitly restating or clearing its affected rates and pools.');};
 if(before.currency!==null&&before.currency!==s.inputs.currency)requireRestated(staffingCashFields);
 if(before.months!==null&&before.months!==s.inputs.months)requireRestated(['hireCostPerPerson','redeploymentCostPerPerson','backfillCostPerInternalPerson','budget']);
 if(before.role!==null&&before.role!==s.inputs.role)requireRestated(requiredStaffingFields.filter(f=>!['role','requiredRoles','months','currency','budget'].includes(f)));
 s.revision++;return readRequiredStaffingReview(s)!;
}
export const requiredStaffingInstructions=`FIXED REQUIRED STAFFING: When the user supplies a required count and wants hiring/training/redeployment combinations, use compare_required_staffing directly. A stated count does not require ticket volume, contracts, productivity rates, baseline population or a workload review. Keep the existing workload tools for workload-derived requirements; review_hiring_budget remains the annual-pay/timing calculator for hire-only budgeting. Use the explicit period hire cost and PER-TRAINEE cash/hours. Never copy per-person training rates into total-path fields of compare_service_staffing. Preserve all supplied pools and rates on follow-ups; call compare_required_staffing with empty changes to obtain current numerical totals, and quote the current user for corrections. The tool calculates bounded combinations and returns up to three representative options; show the numeric comparisons, one conditional recommendation and one next step. Keep unknown release, overlap, readiness, backfill and complete costs visible without blocking useful listed-cash arithmetic. If a hire-only scenario includes no planned training, say new-hire training requirements are not specified unless the user supplied them; do not assert zero training needed. No salary feed, company-population lookup, saved Action Plan or operational verification is required or implied. New figures must come from this turn's successful tool output. Its option IDs are not candidate or projection IDs: leave candidateIds, analysisIds and verifiedMetrics empty for a standalone staffing comparison; its compact card displays the checked values. Do not fabricate a verifiedMetricReference for these results.`;
