import type {SolutionRequest} from './home-solution-conversation';
import type {SolutionRuntime,SolutionReply} from './home-solution-conversation-service';
// @ts-expect-error Native Node tests share application source.
import {requiredStaffingTool,editRequiredStaffing,requiredStaffingAnswer} from './home-required-staffing.ts';
// @ts-expect-error Native Node tests share application source.
import {emptyRequiredStaffing,readRequiredStaffingInput,requiredStaffingFields,type RequiredStaffingInput,type StaffingInputField} from './required-staffing.ts';
// @ts-expect-error Native Node tests share application source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native Node tests share application source.
import {readSolutionState} from './home-solution-conversation.ts';
import {LEGACY_DATASET_TOKEN} from './dataset-identity.mjs';

export const staffingScenarioLabel='Calculated from user-provided illustrative assumptions; company data was not consulted; actual availability remains unverified.';
export const staffingScenarioInstructions='USER-SCENARIO-ONLY STAFFING. The current message is an explicitly illustrative scenario, not company evidence. Extract only its stated quantities and units using compare_required_staffing once. Cite the current user turn and exact source quotes with kind user-supplied. Whole-period hire cash and per-trainee cash/hours must retain their units. Unspecified release, readiness, backfill, complete costs and new-hire training remain null. Do not propose values, read sources, produce prose, save, apply or call another tool. The server validates extraction and owns all calculation and final prose.';
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

/** Separate execution boundary: no generic tool dispatcher, company context, evidence charts or continuation. */
export async function converseStaffingScenario(request:SolutionRequest,scenario:Scenario,runtime:SolutionRuntime,signal:AbortSignal):Promise<SolutionReply>{
 signal.throwIfAborted();
 const input=[{role:'user',content:JSON.stringify({contract:'user-scenario-only-staffing-v1',currentMessage:{id:request.message.id,text:request.message.text}})}];
 const output=await runtime.complete(input,false,signal,{progressEntryEnabled:false,requiredStaffingCalculation:true,staffingScenarioOnly:true});
 signal.throwIfAborted();
 if(!output.completed||output.calls.length!==1||output.calls[0].name!==requiredStaffingTool.name||output.text.trim()||JSON.stringify(output.items).length>70000||output.items.some(item=>!item||typeof item!=='object'||!['function_call','reasoning'].includes((item as {type:string}).type)))throw Error('The illustrative staffing extraction was not completed safely.');
 const call=output.calls[0];
 const items=output.items.filter(item=>(item as {type:string}).type==='function_call') as {call_id:string;name:string;arguments:string}[];
 if(items.length!==1||items[0].call_id!==call.id||items[0].name!==call.name||items[0].arguments!==call.arguments)throw Error('The illustrative staffing call does not match its output.');
 if(call.arguments.length>32000)throw Error('The illustrative staffing extraction exceeds its bounds.');
 const args=JSON.parse(call.arguments);assertSolutionShape(args,requiredStaffingTool.parameters,'tool arguments');
 const edits=args.changes as {field:StaffingInputField;value:RequiredStaffingInput[StaffingInputField];basis:{kind:string;turnId:string|null;quote:string|null;explanation:string}}[];
 const fields=new Set<StaffingInputField>();
 for(const edit of edits){
  const expected=scenario.inputs[edit.field],value=edit.value;
  const matches=edit.field==='role'&&typeof value==='string'&&typeof expected==='string'?value.toLowerCase()===expected.toLowerCase():value===expected;
  if(fields.has(edit.field)||!matches||edit.basis.kind!=='user-supplied'||edit.basis.turnId!==request.message.id||typeof edit.basis.quote!=='string'||!edit.basis.quote.trim()||!request.message.text.includes(edit.basis.quote)||scenario.quotes[edit.field]&&!edit.basis.quote.includes(scenario.quotes[edit.field]!))throw Error('The illustrative staffing extraction does not match the stated premises.');
  fields.add(edit.field);
 }
 if(requiredStaffingFields.some(field=>scenario.inputs[field]!==null&&!fields.has(field)))throw Error('The illustrative staffing extraction omitted a required premise.');
 // Rebuild provenance from captured user clauses; never retain model prose or proposed values.
 const changes=requiredStaffingFields.filter(field=>scenario.inputs[field]!==null).map(field=>({field,value:scenario.inputs[field],basis:{kind:'user-supplied',turnId:request.message.id,quote:scenario.quotes[field]!,explanation:'User-provided illustrative assumption; not company evidence.'}}));
 const review=editRequiredStaffing(request,runtime.natural!.datasetToken,changes);
 const answer=staffingScenarioLabel+'\n'+requiredStaffingAnswer(review).split('\n').slice(1).join('\n');
 const state=readSolutionState({...request.state,requiredStaffing:review,turns:[{id:request.message.id,role:'user',text:request.message.text},{id:'reply-'+request.requestId.slice(0,70),role:'assistant',text:answer}]});
 signal.throwIfAborted();
 return {requestId:request.requestId,answer,charts:[],candidateIds:[],analysisIds:[],state,usage:{modelRounds:1,toolCalls:1}};
}
