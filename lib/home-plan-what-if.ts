import type {Assumption,BundleInputs} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {capacityGoalAssumptions} from './home-capacity-assumptions.ts';
export type PlanWhatIf={capacityBasis?:'full-period-hire'|'needs-staffing-schedule';ratePeriod?:'annualized'|'ytd';version:1;kind:'turnover'|'capacity';scopeKey:string;baseline:Assumption<number>;target:Assumption<number>;population:Assumption<number>;unitCost:Assumption<number>};
export const whatIfScope=(input:BundleInputs)=>JSON.stringify([input.scope.population.value,input.scope.startMonth.value,input.scope.months.value]);
export function whatIfKind(goal:string):PlanWhatIf['kind']|null{
 const retention=/\b(turnover|retention|retain|exits)\b/i.test(goal),capacity=/\b(add|additional|increase|expand|grow)\b/i.test(goal)&&/\b(roles?|capacity|headcount|positions?)\b/i.test(goal);
 if(retention===capacity||/\b(replace|replacement|backfill|not|without)\b/i.test(goal))return null;
 return retention?'turnover':'capacity';
}
export function normalizeWhatIfQuantities(text:string){const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];return text.replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,word=>String(words.indexOf(word.toLowerCase())));}
export function initialWhatIf(goal:string,input:BundleInputs):PlanWhatIf|undefined{
 goal=normalizeWhatIfQuantities(goal);
 const kind=whatIfKind(goal);if(!kind||input.capacity||input.successMeasure)return undefined;
 const demo=(value:number):Assumption<number>=>({value,kind:'illustrative',basis:'Visible illustrative what-if starting assumption, not an observed baseline, forecast, quote or validated effect.'});
 const unknown:Assumption<number>={value:null,kind:'unknown',basis:null};
 let baseline=demo(kind==='turnover'?15:0);const baselineRate=goal.match(/\bbaseline(?: turnover(?: rate)?)?\s*(?:is|of|:)\s*(\d+(?:\.\d+)?)\s*%/i);if(kind==='turnover'&&baselineRate&&Number(baselineRate[1])<=100)baseline={value:Number(baselineRate[1]),kind:'user-entered',basis:'Explicit baseline assumption in the pinned goal; not independently verified.'};let target=demo(kind==='turnover'?12:3);
 const capacity=kind==='capacity'?capacityGoalAssumptions(goal):null;
 const roles=goal.match(/\badd\s+(\d+)\s+(?:additional\s+)?(?:roles?|positions?)\b/i)??goal.match(/\b(\d+)\s+additional\s+(?:roles?|positions?)\b/i);
 if(capacity?.explicitRole)target=capacity.target;
 else if(kind==='capacity'&&roles){const count=Number(roles[1]);target=count<=1000?{value:count,kind:'user-entered',basis:'Explicit additional-role target in the pinned goal; availability is not established.'}:unknown;}
 if(kind==='turnover'&&/\d+(?:\.\d+)?\s*%/.test(goal)){const reduction=goal.match(/(?:by\s+)?(\d+(?:\.\d+)?)\s*%\s+relative/i);target=reduction&&Number(reduction[1])<=100?{value:Math.round(baseline.value!*(1-Number(reduction[1])/100)*1000000)/1000000,kind:'illustrative',basis:'User-stated relative reduction applied to the visible illustrative baseline; not a predicted effect.'}:unknown;}
 const targetRate=goal.match(/\btarget(?: turnover(?: rate)?)?\s*(?:is|of|:)\s*(\d+(?:\.\d+)?)\s*%/i);if(kind==='turnover'&&targetRate&&Number(targetRate[1])<=100)target=/\brelative\b/i.test(goal)&&target.value!==Number(targetRate[1])?unknown:{value:Number(targetRate[1]),kind:'user-entered',basis:'Explicit target rate assumption in the pinned goal; not a predicted effect.'};
 const statedUnit=goal.match(/(?:\$|USD\s+)(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+per role per month/i),unit=statedUnit?Number(statedUnit[1].replaceAll(',','')):null;
 const unitCost=kind!=='capacity'?unknown:capacity?.explicitCost?capacity.unitCost:unit!==null&&unit<=1000000?{value:unit,kind:'user-entered' as const,basis:'Explicit monthly cost per role in the pinned goal; not a verified quote.'}:demo(8000);
 return {...(capacity?{capacityBasis:capacity.capacityBasis}:{}),version:1,kind,scopeKey:whatIfScope(input),baseline,target,population:kind==='turnover'?demo(100):unknown,unitCost};
}
export function validWhatIf(raw:unknown,goal:string):raw is PlanWhatIf{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;const item=raw as PlanWhatIf;
 if(Object.keys(item).sort().join()!==['version','kind','scopeKey','baseline','target','population','unitCost',...(item.ratePeriod!==undefined?['ratePeriod']:[]),...(item.capacityBasis!==undefined?['capacityBasis']:[])].sort().join()||item.version!==1||item.kind!==whatIfKind(goal)||typeof item.scopeKey!=='string'||item.scopeKey.length>1000)return false;
 if(item.capacityBasis!==undefined&&(item.kind!=='capacity'||!['full-period-hire','needs-staffing-schedule'].includes(item.capacityBasis)))return false;
 if(item.ratePeriod!==undefined&&!['annualized','ytd'].includes(item.ratePeriod))return false;
 for(const key of ['baseline','target','population','unitCost'] as const){const value=item[key];if(!value||typeof value!=='object'||Object.keys(value).sort().join()!==['value','kind','basis'].sort().join()||!['unknown','illustrative','user-entered','adopted'].includes(value.kind))return false;if(value.value===null){if(value.kind!=='unknown'||value.basis!==null)return false;continue;}if(value.kind==='unknown'||typeof value.basis!=='string'||!value.basis.trim()||value.basis.length>240||typeof value.value!=='number'||!Number.isFinite(value.value)||value.value<0||value.value>(key==='unitCost'?1000000:key==='population'?1000000:item.kind==='turnover'?100:1000)||(key==='population'||item.kind==='capacity'&&key!=='unitCost')&&!Number.isInteger(value.value))return false;}
 return item.target.kind!=='adopted';
}
const rounded=(n:number)=>Math.round((n+Number.EPSILON)*1e6)/1e6;
export type PlanWhatIfResult={status:'scope_changed'|'missing';reason:string}|{status:'ready';kind:'turnover'|'capacity';start:string;months:number;baseline:number;target:number;population:number|null;unitCost:number|null;baselineCount:number|null;targetCount:number|null;change:number;listedCash:number|null;roleCash:number;cash:number|null};
export function calculatePlanWhatIf(input:BundleInputs):PlanWhatIfResult|null{
 const scenario=input.whatIf;if(!scenario)return null;
 const months=input.scope.months.value,start=input.scope.startMonth.value;
 if(input.capacity)return {status:'missing',reason:'Use the reviewed staffing calculation for this capacity mix; the illustrative scenario is not combined with it.'};
 if(scenario.scopeKey!==whatIfScope(input))return {status:'scope_changed' as const,reason:'Population or period changed. Say “use this period for the what-if” to review the same rates or role assumptions for this scope.'};
 if(input.costPolicy==='cash-hours-v2'&&scenario.capacityBasis==='needs-staffing-schedule')return {status:'missing',reason:'Review the staffing mix, paid work schedule and arrival dates. Fractional FTE, part-time, phased arrivals and internal Build/Move roles cannot use full-period new-hire payroll.'};
 const {baseline,target,population,unitCost}=scenario;
 if(!months||!start||baseline.value===null||target.value===null||scenario.kind==='turnover'&&population.value!==null&&population.value<=0||scenario.kind==='capacity'&&unitCost.value===null)return {status:'missing' as const,reason:input.costPolicy!=='cash-hours-v2'?'Supply the missing scenario baseline, target, population or monthly role cost in chat. Unknown is not zero.':'Supply the missing scenario baseline, target, population or monthly USD role cost in chat. Use whole positions; fractional FTE and unsupported cost currencies or periods need review. Unknown is not zero.'};
 if(scenario.kind==='turnover'&&(scenario.ratePeriod==='ytd'||scenario.ratePeriod==='annualized'&&months!==12))return {status:'missing',reason:'The accepted baseline has a different rate period. Confirm a baseline for this horizon in chat; no automatic annualization is applied.'};
 const monthIndex=(value:string)=>Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
 if(input.expenses.some(item=>item.kind==='cash'&&item.startMonth.value&&item.months.value&&(monthIndex(item.startMonth.value)<monthIndex(start)||monthIndex(item.startMonth.value)+item.months.value>monthIndex(start)+months)))return {status:'missing',reason:'A funding schedule falls outside this horizon. Change its funding month or occurrences in chat before calculating.'};
 const expenseValues=input.expenses.filter(item=>item.kind==='cash').map(item=>item.amount.value===null||item.months.value===null||item.startMonth.value===null?null:item.amount.value*item.months.value);
 // Only a labeled hypothetical allowance sum. Never replaces the reviewed full budget.
 const listedCash=input.costPolicy==='cash-hours-v2'&&(input.costsDistinct.value===false||!expenseValues.length&&!input.costReviews.every(row=>row.complete.value===true))?null:expenseValues.some(value=>value===null)?null:Math.round(expenseValues.reduce<number>((sum,value)=>sum+(value??0),0)*100)/100;
 const roleCash=scenario.kind==='capacity'?rounded(target.value*unitCost.value!*months):0;
 return {status:'ready' as const,kind:scenario.kind,start,months,baseline:baseline.value,target:target.value,population:population.value,unitCost:unitCost.value,baselineCount:scenario.kind==='turnover'?(population.value===null?null:rounded(population.value*baseline.value/100)):baseline.value,targetCount:scenario.kind==='turnover'?(population.value===null?null:rounded(population.value*target.value/100)):target.value,change:rounded(target.value-baseline.value),listedCash,roleCash,cash:listedCash===null?null:rounded(listedCash+roleCash)};
}
export function whatIfOutcomeText(input:BundleInputs){
 const result=calculatePlanWhatIf(input);if(!result)return 'No conditional outcome arithmetic is defined for this goal. Describe the intended metric and scope in chat.';
 if(result.status!=='ready')return result.reason;
 return result.kind==='turnover'?`If turnover is ${result.baseline}% versus ${result.target}% over ${result.months} months from ${result.start}, ${result.population===null?'the rate comparison does not require an assumed workforce count; expected exits remain unknown until the average-workforce denominator is reviewed':`with the same average workforce of ${result.population}, expected exits are ${result.baselineCount} versus ${result.targetCount}`} (${Math.abs(result.change)} percentage points ${result.change<=0?'lower':'higher'}). Fractional counts are expectations, not identified people. This is assumed arithmetic, not a predicted or causal effect.`:`If ${result.target} additional roles are available from ${result.start} for all ${result.months} months, coverage is ${result.target} versus ${result.baseline} roles. Availability is assumed, not established. This does not confirm the role/BU scope for the staffing planner.`;
}
