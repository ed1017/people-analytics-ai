// @ts-expect-error Native Node tests share TypeScript source.
import {explicitHomeGoal} from './home-explicit-goal.ts';
// User-authored conversation only. No model prose, inferred effect or source lookup.
export type HomePlanningIntent={goal:string|null;months:number|null;relativeReduction:number|null;baseline:number|null;baselinePeriod:'annualized'|'ytd'|null;budgetCap:number|null;existingCapacity:boolean;companyWide:boolean};
export function planningStatements(context:unknown):string[]{
 if(!context||typeof context!=='object')return [];const value=context as {goal?:unknown;notes?:unknown};
 return [typeof value.goal==='string'?value.goal:'',...(Array.isArray(value.notes)?value.notes.map(note=>note&&typeof note==='object'&&'text' in note&&typeof note.text==='string'?note.text:''):[])].filter(Boolean).slice(-13);
}
export function resolveHomePlanningIntent(statements:string[]):HomePlanningIntent{
 const result:HomePlanningIntent={goal:null,months:null,relativeReduction:null,baseline:null,baselinePeriod:null,budgetCap:null,existingCapacity:false,companyWide:false};let reductionIntent=false,voluntary=false;
 for(const statement of statements){
  if(/\b(?:reduce|lower|decrease|cut)\s+(?:(?:regrettable|employee|voluntary|company-wide)\s+)*turnover\b/i.test(statement))reductionIntent=true;
  if(/\bvoluntary\s+turnover(?:\s+rate)?\b/i.test(statement))voluntary=true;
  const relative=statement.match(/(?:by\s*)?(\d+(?:\.\d+)?)\s*%\s*relative\b/i);if(relative&&Number(relative[1])<=100)result.relativeReduction=Number(relative[1]);
  const horizon=statement.match(/\b(?:within|over|for|in)\s*(\d+)\s*[- ]?months?\b/i);if(horizon&&Number(horizon[1])>=1&&Number(horizon[1])<=24)result.months=Number(horizon[1]);
  const annual=statement.match(/\bannual(?:ized|ised)\s*(\d+(?:\.\d+)?)\s*%\s*(?:baseline)?/i),ytd=statement.match(/\b(?:YTD|year.to.date)\s*(\d+(?:\.\d+)?)\s*%\s*(?:baseline)?/i),baseline=statement.match(/\bbaseline(?:\s+turnover(?:\s+rate)?)?\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)\s*%/i);
  const selected=annual??ytd??baseline;if(selected&&Number(selected[1])<=100){result.baseline=Number(selected[1]);result.baselinePeriod=annual?'annualized':ytd?'ytd':null;}
  const cap=statement.match(/\b(?:maximum|cap|budget)[^.!?\n]{0,55}?(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i);if(cap&&Number(cap[1].replaceAll(',',''))<=1e9)result.budgetCap=Number(cap[1].replaceAll(',',''));
  if(/\bexisting\s+HR\s*(?:\/|and)\s*manager\s+capacity\b/i.test(statement))result.existingCapacity=true;
  if(/\ball\s+countries\s*(?:\/|and|,)\s*(?:all\s+)?(?:BUs|business units)\b|\bcompany-wide\b/i.test(statement))result.companyWide=true;
 }
 if(reductionIntent)result.goal=`Reduce ${voluntary?'voluntary':'employee'} turnover${result.relativeReduction===null?'':` by ${result.relativeReduction}% relative`}${result.months===null?'':` within ${result.months} months`}`;
 return result;
}
export function planningRequirementText(intent:HomePlanningIntent){return [intent.budgetCap===null?'':`Maximum one-time programme budget: $${intent.budgetCap.toLocaleString('en-US')} USD (cap, not an expense).`,intent.existingCapacity?'Use existing HR/manager capacity.':'',intent.companyWide?'Scope: all countries and business units.':''].filter(Boolean).join(' ')}

export function homeGoalForPin(statements:string[]){const first=explicitHomeGoal(statements[0]??''),latest=explicitHomeGoal(statements.at(-1)??'');const correctedMetric=first&&/regrettable/i.test(first)&&statements.slice(1).some(text=>/voluntary turnover/i.test(text));return correctedMetric?resolveHomePlanningIntent(statements).goal:latest??first??resolveHomePlanningIntent(statements).goal;}
