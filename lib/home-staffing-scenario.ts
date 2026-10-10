import type {SolutionRequest} from './home-solution-conversation';
import type {SolutionRuntime,SolutionReply} from './home-solution-conversation-service';
// @ts-expect-error Native Node tests share application source.
import {editRequiredStaffing,requiredStaffingAnswer} from './home-required-staffing.ts';
// @ts-expect-error Native Node tests share application source.
import {emptyRequiredStaffing,readRequiredStaffingInput,requiredStaffingFields,type RequiredStaffingInput,type StaffingInputField} from './required-staffing.ts';
// @ts-expect-error Native Node tests share application source.
import {readSolutionState} from './home-solution-conversation.ts';
import {LEGACY_DATASET_TOKEN} from './dataset-identity.mjs';

export const staffingScenarioLabel='Calculated from user-provided illustrative assumptions; company data was not consulted; actual availability remains unverified.';
type Scenario={inputs:RequiredStaffingInput;quotes:Partial<Record<StaffingInputField,string>>};
const number='(?:zero|(?:0|[1-9]\\d*|[1-9]\\d{0,2}(?:,\\d{3})+)(?:\\.\\d{1,2})?)';
const money='(USD|EUR|GBP)\\s+('+number+')';
const roles='((?:engineering|developer|analyst) roles|engineers|developers|analysts)';
const quantity=(s:string)=>s.toLowerCase()==='zero'?0:Number(s.replaceAll(',',''));
const pattern=(s:string)=>new RegExp('^(?:'+s+')$','i');
function noSavedProgress(raw:unknown,datasetToken:string){
 if(raw==null)return true;
 if(typeof raw!=='object'||Array.isArray(raw))return false;
 const value=raw as Record<string,unknown>;
 // Fresh Home sends this empty feature envelope even without an active goal.
 return Object.keys(value).sort().join() === 'datasetToken,goalId,ledger,origin,unavailableReason,version'&&value.version===1&&value.goalId===''&&value.datasetToken===datasetToken&&value.origin==='authored'&&value.ledger===null&&value.unavailableReason===null;
}

/** Contract admission, not general intent recognition. Any unfamiliar clause/context keeps fresh grounding. */
export function readStaffingScenario(request:SolutionRequest,context:{natural:boolean;datasetToken:string}):Scenario|null{
 const state=request.state;
 if(!context.natural||context.datasetToken!==LEGACY_DATASET_TOKEN||request.goal.id||request.goal.statement||request.goalContext!==null||request.selectedId!==null||request.catalog!==null||!noSavedProgress(request.goalProgress,context.datasetToken)||request.progressEntry!=null||request.planningCalculatorAvailable===true)return null;
 const defaultScopes=['All countries; All business units; All levels','Selected workforce snapshot: Global workforce; All business units; All levels'];
 if(!defaultScopes.includes(request.scope)||Object.values(request.filters).some(value=>value!=='all'))return null;
 if((request.evidence as {datasetContext?:unknown}).datasetContext!=null)return null;
 const arrays=['turns','constraints','working','analyses','verifiedMetrics','rejected','questions','datasetEvidenceContexts'] as const;
 const nullable=['requiredStaffing','hiringBudget','businessPlanning','focusCandidateId'] as const;
 const allowed=new Set<string>(['version',...arrays,...nullable]);
 if(Object.keys(state).some(key=>!allowed.has(key))||arrays.some(key=>state[key]?.length)||nullable.some(key=>state[key]!=null))return null;
 const clauses=request.message.text.trim().split(/[.!?;\n]+(?!\d)/).map(c=>c.trim()).filter(Boolean);
 const inputs=emptyRequiredStaffing(),quotes:Scenario['quotes']={},seen=new Set<string>();let illustrative=false,requirement=false;
 const put=(field:StaffingInputField,value:RequiredStaffingInput[StaffingInputField],quote:string)=>{
  if(Object.hasOwn(quotes,field))throw Error('Duplicate premise');
  Object.assign(inputs,{[field]:value});quotes[field]=quote;
 };
 const currency=(value:string)=>{const code=value.toUpperCase();if(inputs.currency!==null&&inputs.currency!==code)throw Error('Mixed currency');return code;};
 const once=(key:string)=>{if(seen.has(key))throw Error('Duplicate clause');seen.add(key);};
 try{
  for(const clause of clauses){
   let match:RegExpMatchArray|null;
   if((match=clause.match(pattern('(?:(illustrative scenario:)\\s*)?(?:compare(?: three)? ways to )?fill ('+number+') '+roles+' over ('+number+') months(?:, with a budget of '+money+')?')))){
    once('requirement');requirement=true;illustrative=!!match[1]||illustrative;
    put('requiredRoles',quantity(match[2]),clause);put('role',match[3][0].toUpperCase()+match[3].slice(1).toLowerCase(),clause);put('months',quantity(match[4]),clause);
    if(match[5]){put('currency',currency(match[5]),clause);put('budget',quantity(match[6]),clause);}
   }else if((match=clause.match(pattern('(these are illustrative assumptions: )?'+money+' budget')))){
    illustrative=!!match[1]||illustrative;put('currency',currency(match[2]),clause);put('budget',quantity(match[3]),clause);
   }else if((match=clause.match(pattern(money+' cash per hire for the entire period')))){
    if(inputs.currency!==match[1].toUpperCase())throw Error('Missing or conflicting currency');put('hireCostPerPerson',quantity(match[2]),clause);
   }else if((match=clause.match(pattern('each hire costs '+money+' for the whole ('+number+')-month period')))){
    if(inputs.currency!==match[1].toUpperCase())throw Error('Missing or conflicting currency');if(quantity(match[3])!==inputs.months)throw Error('Conflicting horizon');put('hireCostPerPerson',quantity(match[2]),clause);
   }else if((match=clause.match(pattern(money+' and ('+number+') planned training hours per trainee')))){
    if(inputs.currency!==match[1].toUpperCase())throw Error('Missing or conflicting currency');put('trainingCostPerPerson',quantity(match[2]),clause);put('trainingHoursPerPerson',quantity(match[3]),clause);
   }else if((match=clause.match(pattern('each trainee costs '+money+' and needs ('+number+') planned training hours')))){
    if(inputs.currency!==match[1].toUpperCase())throw Error('Missing or conflicting currency');put('trainingCostPerPerson',quantity(match[2]),clause);put('trainingHoursPerPerson',quantity(match[3]),clause);
   }else if((match=clause.match(pattern('('+number+') incremental redeployment cash per person')))|| (match=clause.match(pattern('redeployment adds ('+number+') cash per person')))){
    put('redeploymentCostPerPerson',quantity(match[1]),clause);
   }else if((match=clause.match(pattern('there are ('+number+') redeployable and ('+number+') trainable people in separate pools')))|| (match=clause.match(pattern('we have a pool of ('+number+') redeployable people and a separate pool of ('+number+') trainable people')))){
    put('redeployablePeople',quantity(match[1]),clause);put('trainablePeople',quantity(match[2]),clause);put('poolsDistinct',true,clause);
   }else if(pattern('release, readiness, backfill(?: costs)? and other cost coverage are unknown').test(clause))once('operational-unknowns');
   else if(pattern('new-hire training (?:is unspecified|requirements are not specified)').test(clause))once('new-hire-unknown');
   else if(pattern('give one conditional recommendation and next step').test(clause))once('recommendation');
   else if(pattern('do not save anything').test(clause))once('no-save');
   else return null;
  }
  const required=['role','currency','requiredRoles','months','budget','hireCostPerPerson','trainingCostPerPerson','trainingHoursPerPerson','redeploymentCostPerPerson','redeployablePeople','trainablePeople','poolsDistinct'] as const;
  if(!illustrative||!requirement||!seen.has('operational-unknowns')||!seen.has('new-hire-unknown')||required.some(field=>inputs[field]===null)||!(inputs.requiredRoles!>0))return null;
  return {inputs:readRequiredStaffingInput(inputs),quotes};
 }catch{return null;}
}

/** Pure calculation from admitted current-user captures; no model or tool dispatcher. */
export async function converseStaffingScenario(request:SolutionRequest,scenario:Scenario,runtime:SolutionRuntime,signal:AbortSignal):Promise<SolutionReply>{
 signal.throwIfAborted();
 // Rebuild provenance from captured user clauses; never retain model prose or proposed values.
 const changes=requiredStaffingFields.filter(field=>scenario.inputs[field]!==null).map(field=>({field,value:scenario.inputs[field],basis:{kind:'user-supplied',turnId:request.message.id,quote:scenario.quotes[field]!,explanation:'User-provided illustrative assumption; not company evidence.'}}));
 const review=editRequiredStaffing(request,runtime.natural!.datasetToken,changes);
 const answer=staffingScenarioLabel+'\n'+requiredStaffingAnswer(review).split('\n').slice(1).join('\n');
 const state=readSolutionState({...request.state,requiredStaffing:review,turns:[{id:request.message.id,role:'user',text:request.message.text},{id:'reply-'+request.requestId.slice(0,70),role:'assistant',text:answer}]});
 signal.throwIfAborted();
 return {requestId:request.requestId,answer,charts:[],candidateIds:[],analysisIds:[],state,usage:{modelRounds:0,toolCalls:0}};
}
