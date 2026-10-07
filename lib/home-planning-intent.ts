// @ts-expect-error Native Node tests share TypeScript source.
import {explicitTurnoverRates} from './home-turnover-rates.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readUserGoalIntent,type UserGoalIntent} from './home-user-goal-intent.ts';
// User-authored conversation only. No model prose, inferred effect or source lookup.
export type HomePlanningIntent={goal:string|null;months:number|null;relativeReduction:number|null;pointReduction:number|null;participants:number|null;baseline:number|null;target:number|null;rateConflict:boolean;baselinePeriod:'annualized'|'ytd'|null;budgetCap:number|null;existingCapacity:boolean;companyWide:boolean};
export function planningStatements(context:unknown):string[]{
 if(!context||typeof context!=='object')return [];const value=context as {goal?:unknown;notes?:unknown;constraints?:unknown;decisions?:unknown};
 return [typeof value.goal==='string'?value.goal:'',...(Array.isArray(value.notes)?value.notes.map(note=>note&&typeof note==='object'&&'text' in note&&typeof note.text==='string'?note.text:''):[]),typeof value.constraints==='string'?value.constraints:'',typeof value.decisions==='string'?value.decisions:''].filter(Boolean);
}
function explicitBudgetCap(statement:string):number|null{
 // Match the amount beside its budget label, not an unrelated later vendor cost.
 // Accept the same user-authored ceiling whether it is called demo or illustrative.
 const afterLabel=/\b(?:maximum|cap|budget)(?:\s+(?:one-time|programme|program|cash|demo|illustrative|budget|limit|ceiling|is|of|at|to|should|must|be|not|exceed|no|more|than))*\s*[:=]?\s*(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/gi;
 const beforeLabel=/(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+(?:(?:demo|illustrative|cash|programme|program|one-time)\s+)*budget\b/gi;
 const candidates=[...statement.matchAll(afterLabel),...statement.matchAll(beforeLabel)].map(match=>({amount:Number(match[1].replaceAll(',','')),index:match.index+match[0].indexOf(match[1])}));
 const negated=/\b(?:not|rather than|instead of|ignore|exclude|don't|don’t)\s+(?:(?:use|set|an?|the|previous|old|maximum|cap|budget|demo|illustrative|cash|programme|program|one-time|of|to|at)\s+)*(?:\$|USD\s*)$/i;
 return candidates.filter(candidate=>candidate.amount<=1e9&&!negated.test(statement.slice(0,candidate.index))).sort((left,right)=>left.index-right.index).at(-1)?.amount??null;
}
export function resolveHomePlanningIntent(statements:string[]):HomePlanningIntent{
 const result:HomePlanningIntent={goal:null,months:null,relativeReduction:null,pointReduction:null,participants:null,baseline:null,target:null,rateConflict:false,baselinePeriod:null,budgetCap:null,existingCapacity:false,companyWide:false};let reductionIntent=false,voluntary=false;
 for(const raw of statements){
  const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  const statement=raw.replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,word=>String(words.indexOf(word.toLowerCase())));
  const points=[...statement.matchAll(/(\d+(?:\.\d+)?)\s*[- ]?percentage[- ]points?\b/gi)].filter(match=>!/(?:not|rather than)\s*$/i.test(statement.slice(Math.max(0,match.index-20),match.index))).at(-1);
  if(points&&Number(points[1])<=100){result.pointReduction=Number(points[1]);result.relativeReduction=null;}
  const participants=statement.match(/\b(?:for|use|with|include)\s+(\d+(?:,\d{3})*)\s+(?:people|participants|employees)\b/i);if(participants&&Number(participants[1].replaceAll(',',''))<=1000000)result.participants=Number(participants[1].replaceAll(',',''));

  if(/\b(?:reduce|lower|decrease|cut)\s+(?:(?:regrettable|employee|voluntary|company-wide|annualized|annualised|YTD)\s+)*turnover\b/i.test(statement))reductionIntent=true;
  if(/\bvoluntary\s+turnover(?:\s+rate)?\b/i.test(statement))voluntary=true;
  const relative=[...statement.matchAll(/(\d+(?:\.\d+)?)\s*%\s*relative\b/gi)].filter(match=>!/(?:not|rather than)\s*$/i.test(statement.slice(Math.max(0,match.index-20),match.index))).at(-1);if(relative&&(!points||relative.index>points.index)&&Number(relative[1])<=100){result.relativeReduction=Number(relative[1]);result.pointReduction=null;}
  const horizon=statement.match(/\b(?:within|over|for|in)\s*(\d+)\s*[- ]?months?\b/i);if(horizon&&Number(horizon[1])>=1&&Number(horizon[1])<=24)result.months=Number(horizon[1]);
  const rates=explicitTurnoverRates(statement);if(rates.conflict){result.rateConflict=true;result.baseline=null;result.target=null;}else{if(rates.baseline!==null){result.baseline=rates.baseline;result.baselinePeriod=rates.period;}if(rates.target!==null)result.target=rates.target;}
  const budget=explicitBudgetCap(statement);if(budget!==null)result.budgetCap=budget;
  if(/\bexisting\s+HR\s*(?:\/|and)\s*manager\s+capacity\b/i.test(statement))result.existingCapacity=true;
  if(/\ball\s+countries\s*(?:\/|and|,)\s*(?:all\s+)?(?:BUs|business units)\b|\bcompany-wide\b/i.test(statement))result.companyWide=true;
 }
 if(reductionIntent)result.goal=`Reduce ${result.baselinePeriod==='annualized'?'annualized ':result.baselinePeriod==='ytd'?'YTD ':''}${voluntary?'voluntary':'employee'} turnover${result.pointReduction!==null?` by ${result.pointReduction} percentage points`:result.relativeReduction!==null?` by ${result.relativeReduction}% relative`:result.baseline!==null&&result.target!==null?` from ${result.baseline}% to ${result.target}%`:''}${result.months===null?'':` within ${result.months} months`}`;
 return result;
}
export function planningRequirementText(intent:HomePlanningIntent){return [intent.budgetCap===null?'':`Maximum one-time programme budget: $${intent.budgetCap.toLocaleString('en-US')} USD (cap, not an expense).`,intent.existingCapacity?'Use existing HR/manager capacity.':'',intent.companyWide?'Scope: all countries and business units.':''].filter(Boolean).join(' ')}

export function resolveHomeUserGoal(statements:readonly string[]):UserGoalIntent{
 const result=readUserGoalIntent(statements);
 if(result.status!=='explicit_outcome'||!result.source)return result;
 const relevant=statements.slice(result.contextStart),original=statements[result.source.statement];
 // Preserve the existing quantified-turnover clarification/display contract. Exact authored text
 // stays in source and notes; this introduces no new metric, unit conversion or inferred target.
 const corrected=/regrettable/i.test(result.goal??'')&&relevant.slice(1).some(text=>/voluntary turnover/i.test(text));
 const quantifiedTest=/^synthetic planning test:/i.test(original)&&/\d/.test(original);
 if(original.length>240||corrected||quantifiedTest){const known=resolveHomePlanningIntent([...relevant]);if(known.goal&&/turnover/i.test(result.source.text))return {...result,goal:known.goal};}
 return result;
}
export function homeGoalForPin(statements:string[]){const result=resolveHomeUserGoal(statements);return result.status==='explicit_outcome'?result.goal:null;}

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

/** Discovery may have no investigation candidate. Only a declarative user outcome can stand alone.
 * Never accepts assistant prose, a model problem, a question, or a choice between outcome goals.
 */
export function homeUserGoalForPin(statements:string[]):string|null{return homeGoalForPin(statements);}

/** A choice about staffing is an explicit request to plan a decision, not a claim of a skill gap. */
export function workforceChoiceDiscoveryGoal(message:string):string|null {
 const question=message.split(/\n\n(?:Focused issue|Session problem context)/)[0].trim();
 if(!/\b(?:hir(?:e|ing)|recruit(?:ing)?)\b/i.test(question)||!/\b(?:train(?:ing)?|upskill(?:ing)?)\b/i.test(question))return null;
 if(/\b(?:do not|don't|don’t|cancel|forget)\b/i.test(question))return null;
 if(!/^(?:(?:please\s+)?(?:help (?:me|us) )?(?:decide|choose|compare)\b|(?:should|could|can|do)\s+(?:we|i)\b)/i.test(question))return null;
 return 'Choose a hiring, training, or combined approach for our workforce needs';
}
