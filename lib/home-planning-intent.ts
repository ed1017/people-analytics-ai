// @ts-expect-error Native Node tests share TypeScript source.
import {explicitTurnoverRates} from './home-turnover-rates.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {explicitHomeGoal} from './home-explicit-goal.ts';
// User-authored conversation only. No model prose, inferred effect or source lookup.
export type HomePlanningIntent={goal:string|null;months:number|null;relativeReduction:number|null;baseline:number|null;target:number|null;rateConflict:boolean;baselinePeriod:'annualized'|'ytd'|null;budgetCap:number|null;existingCapacity:boolean;companyWide:boolean};
export function planningStatements(context:unknown):string[]{
 if(!context||typeof context!=='object')return [];const value=context as {goal?:unknown;notes?:unknown};
 return [typeof value.goal==='string'?value.goal:'',...(Array.isArray(value.notes)?value.notes.map(note=>note&&typeof note==='object'&&'text' in note&&typeof note.text==='string'?note.text:''):[])].filter(Boolean).slice(-13);
}
export function resolveHomePlanningIntent(statements:string[]):HomePlanningIntent{
 const result:HomePlanningIntent={goal:null,months:null,relativeReduction:null,baseline:null,target:null,rateConflict:false,baselinePeriod:null,budgetCap:null,existingCapacity:false,companyWide:false};let reductionIntent=false,voluntary=false;
 for(const statement of statements){
  if(/\b(?:reduce|lower|decrease|cut)\s+(?:(?:regrettable|employee|voluntary|company-wide|annualized|annualised|YTD)\s+)*turnover\b/i.test(statement))reductionIntent=true;
  if(/\bvoluntary\s+turnover(?:\s+rate)?\b/i.test(statement))voluntary=true;
  const relative=statement.match(/(?:by\s*)?(\d+(?:\.\d+)?)\s*%\s*relative\b/i);if(relative&&Number(relative[1])<=100)result.relativeReduction=Number(relative[1]);
  const horizon=statement.match(/\b(?:within|over|for|in)\s*(\d+)\s*[- ]?months?\b/i);if(horizon&&Number(horizon[1])>=1&&Number(horizon[1])<=24)result.months=Number(horizon[1]);
  const rates=explicitTurnoverRates(statement);if(rates.conflict){result.rateConflict=true;result.baseline=null;result.target=null;}else{if(rates.baseline!==null){result.baseline=rates.baseline;result.baselinePeriod=rates.period;}if(rates.target!==null)result.target=rates.target;}
  const cap=statement.match(/\b(?:maximum|cap|budget)[^.!?\n]{0,55}?(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i);if(cap&&Number(cap[1].replaceAll(',',''))<=1e9)result.budgetCap=Number(cap[1].replaceAll(',',''));
  if(/\bexisting\s+HR\s*(?:\/|and)\s*manager\s+capacity\b/i.test(statement))result.existingCapacity=true;
  if(/\ball\s+countries\s*(?:\/|and|,)\s*(?:all\s+)?(?:BUs|business units)\b|\bcompany-wide\b/i.test(statement))result.companyWide=true;
 }
 if(reductionIntent)result.goal=`Reduce ${result.baselinePeriod==='annualized'?'annualized ':result.baselinePeriod==='ytd'?'YTD ':''}${voluntary?'voluntary':'employee'} turnover${result.relativeReduction!==null?` by ${result.relativeReduction}% relative`:result.baseline!==null&&result.target!==null?` from ${result.baseline}% to ${result.target}%`:''}${result.months===null?'':` within ${result.months} months`}`;
 return result;
}
export function planningRequirementText(intent:HomePlanningIntent){return [intent.budgetCap===null?'':`Maximum one-time programme budget: $${intent.budgetCap.toLocaleString('en-US')} USD (cap, not an expense).`,intent.existingCapacity?'Use existing HR/manager capacity.':'',intent.companyWide?'Scope: all countries and business units.':''].filter(Boolean).join(' ')}

export function homeGoalForPin(statements:string[]){const first=explicitHomeGoal(statements[0]??''),latest=explicitHomeGoal(statements.at(-1)??'');const correctedMetric=first&&/regrettable/i.test(first)&&statements.slice(1).some(text=>/voluntary turnover/i.test(text));return correctedMetric?resolveHomePlanningIntent(statements).goal:latest??first??resolveHomePlanningIntent(statements).goal;}

/** Keep a long Home statement in existing bounded notes, without dropping its final constraints.
 * Six notes is the existing requirement-note budget; an oversized final part still carries the normal truncation flag.
 */
export function homePlanningNoteParts(statement:string):string[]{
 const parts:string[]=[];let remaining=statement.trim();
 while(remaining.length>800&&parts.length<5){
  const prefix=remaining.slice(0,800),sentence=prefix.lastIndexOf('. '),word=prefix.lastIndexOf(' ');
  const boundary=sentence>=0?sentence+1:word>0?word:800;
  parts.push(remaining.slice(0,boundary));remaining=remaining.slice(boundary).trimStart();
 }
 if(remaining)parts.push(remaining);return parts;
}
