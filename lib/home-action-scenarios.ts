// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys,type HomeAction} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,actionSignature,validActionBinding,actionCalculatorRoute,type ActionBinding,type ActionReview} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforcePlanFields,emptyWorkforcePlanInput,workforcePlanInputIssues,calculateWorkforceIncrement,workforceIncrementMethodVersion,type WorkforcePlanInput,type WorkforceIncrement} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {retentionInputFields,emptyRetentionInput,calculateRetentionWhatIf,retentionMethod,type RetentionInput,type RetentionResult} from './retention-what-if.ts';
export const homeActionScenarioField='homeActionScenariosV1';
export type ScenarioRoute='capacity'|'retention_what_if';
export type AssumptionOrigin={kind:'unknown'|'user-entered'|'illustrative'|'adopted';basis:string|null};
export type ScenarioInputs=Record<string,string>;
export type ScenarioOrigins=Record<string,AssumptionOrigin>;
export type ScenarioCalculation={revision:number;method:string;inputs:ScenarioInputs;origins:ScenarioOrigins;result:WorkforceIncrement|RetentionResult};
export type ActionScenario={version:1;status:'proposal';binding:ActionBinding;actionSignature:string;route:ScenarioRoute;revision:number;inputs:ScenarioInputs;origins:ScenarioOrigins;calculation:ScenarioCalculation|null};
export type ActionScenarioStore={version:1;entries:ActionScenario[]};
const canonical=(value:unknown)=>JSON.stringify(value,(_,item)=>plain(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const bounded=(text:unknown,max:number):text is string=>typeof text==='string'&&text.length<=max;
const fields=(route:ScenarioRoute):readonly string[]=>route==='capacity'?workforcePlanFields:retentionInputFields;
const method=(route:ScenarioRoute)=>route==='capacity'?workforceIncrementMethodVersion:retentionMethod;
const copy=<T>(value:T):T=>structuredClone(value);
function validInputs(input:unknown,origins:unknown,route:ScenarioRoute):boolean{
 const values=plain(input),sources=plain(origins),keys=[...fields(route)];
 if(!values||!sources||!exactKeys(values,keys)||!exactKeys(sources,keys))return false;
 return keys.every(key=>{
  const value=values[key],origin=plain(sources[key]);
  return bounded(value,key==='population'?240:100)&&!!origin&&exactKeys(origin,['kind','basis'])&&['unknown','user-entered','illustrative','adopted'].includes(String(origin.kind))&&
   (value.trim()?origin.kind!=='unknown':origin.kind==='unknown')&&
   (origin.kind==='unknown'?origin.basis===null:bounded(origin.basis,240)&&!!origin.basis.trim());
 });
}
function calculate(route:ScenarioRoute,inputs:ScenarioInputs){
 if(route==='retention_what_if')return calculateRetentionWhatIf(inputs as RetentionInput);
 if(inputs.arrivalMode==='historical-median')throw Error('Choose an explicit arrival assumption for this proposal. Saved historical timing remains reference only.');
 return calculateWorkforceIncrement(inputs as WorkforcePlanInput,null);
}
function parseScenario(raw:unknown):ActionScenario|null{
 try{
  if(!validateJson(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>48*1024)return null;
  const item=plain(raw);
  if(!item||!exactKeys(item,['version','status','binding','actionSignature','route','revision','inputs','origins','calculation'])||item.version!==1||item.status!=='proposal'||!validActionBinding(item.binding)||!bounded(item.actionSignature,4000)||!item.actionSignature||!['capacity','retention_what_if'].includes(String(item.route))||!Number.isSafeInteger(item.revision)||Number(item.revision)<1||Number(item.revision)>100000)return null;
  const route=item.route as ScenarioRoute;if(!validInputs(item.inputs,item.origins,route))return null;
  if(route==='capacity'&&(item.inputs as ScenarioInputs).intent!=='additional')return null;
  if(item.calculation!==null){
   const result=plain(item.calculation);
   if(!result||!exactKeys(result,['revision','method','inputs','origins','result'])||!Number.isSafeInteger(result.revision)||Number(result.revision)<1||Number(result.revision)>Number(item.revision)||result.method!==method(route)||!validInputs(result.inputs,result.origins,route)||!same(calculate(route,result.inputs as ScenarioInputs),result.result))return null;
   if(result.revision===item.revision&&(!same(result.inputs,item.inputs)||!same(result.origins,item.origins)))return null;
  }
  return copy(item) as ActionScenario;
 }catch{return null}
}
export function createActionScenario(action:HomeAction,binding:ActionBinding,review:ActionReview):ActionScenario{
 const route=actionCalculatorRoute(action,binding,review);
 if(!validActionBinding(binding)||(route!=='capacity'&&route!=='retention_what_if'))throw Error('Confirm the compatible scope for this exact action first.');
 const inputs:ScenarioInputs=route==='capacity'?emptyWorkforcePlanInput():emptyRetentionInput();
 const origins:ScenarioOrigins=Object.fromEntries(fields(route).map(field=>[field,{kind:'unknown',basis:null}]));
 if(route==='capacity'){inputs.intent='additional';origins.intent={kind:'user-entered',basis:'Explicit additional-capacity scope confirmation.'};}
 return {version:1,status:'proposal',binding:copy(binding),actionSignature:actionSignature(action),route,revision:1,inputs,origins,calculation:null};
}
export function readActionScenario(raw:unknown,action:HomeAction,binding:ActionBinding):ActionScenario|null{
 const item=parseScenario(raw);return item&&item.actionSignature===actionSignature(action)&&item.route===action.route&&actionBindingKey(item.binding)===actionBindingKey(binding)?item:null;
}
export function editActionAssumption(scenario:ActionScenario,field:string,value:string,kind:'user-entered'|'illustrative'='user-entered'):ActionScenario{
 if(!parseScenario(scenario)||!fields(scenario.route).includes(field)||field==='intent'||!bounded(value,field==='population'?240:100)||!['user-entered','illustrative'].includes(kind))throw Error('Unsupported proposal assumption.');
 const origin:AssumptionOrigin=value.trim()?{kind,basis:kind==='illustrative'?'Editable illustrative planning assumption; not evidence or an approved input.':'Entered for this proposed action; not independently verified.'}:{kind:'unknown',basis:null};
 if(scenario.inputs[field]===value&&same(scenario.origins[field],origin))return copy(scenario);
 if(scenario.revision>=100000)throw Error('Proposal edit limit reached. Existing work is kept.');
 return {...copy(scenario),revision:scenario.revision+1,inputs:{...scenario.inputs,[field]:value},origins:{...copy(scenario.origins),[field]:origin}};
}
export function calculateActionScenario(scenario:ActionScenario):ActionScenario{
 if(!parseScenario(scenario))throw Error('This proposal record cannot be verified. Its saved copy is kept.');
 const result=calculate(scenario.route,scenario.inputs);
 return {...copy(scenario),calculation:{revision:scenario.revision,method:method(scenario.route),inputs:copy(scenario.inputs),origins:copy(scenario.origins),result}};
}
export function actionCalculationIsCurrent(scenario:ActionScenario):boolean{return !!scenario.calculation&&scenario.calculation.revision===scenario.revision&&same(scenario.calculation.inputs,scenario.inputs)&&same(scenario.calculation.origins,scenario.origins)}
export type SavedScenarioSource={route:ScenarioRoute;goalId:string;goal:string;sourceId:string;inputs:ScenarioInputs};
export type AdoptionConfirmation={binding:ActionBinding;actionSignature:string;sourceKey:string;confirmed:true};
export const savedScenarioSourceKey=(source:SavedScenarioSource)=>canonical(source);
export function adoptActionAssumptions(scenario:ActionScenario,source:SavedScenarioSource,confirmation:AdoptionConfirmation):ActionScenario{
 if(!parseScenario(scenario)||source.route!==scenario.route||source.goalId!==scenario.binding.goalId||source.goal!==scenario.binding.goal||!bounded(source.sourceId,100)||!source.sourceId||confirmation.confirmed!==true||confirmation.actionSignature!==scenario.actionSignature||!same(confirmation.binding,scenario.binding)||confirmation.sourceKey!==savedScenarioSourceKey(source))throw Error('Review this saved input source for the exact action and goal before adopting it.');
 const keys=scenario.route==='capacity'?['businessUnit','jobProfile','planningMonth','months']:['population','startMonth','months'];
 if(keys.some(key=>scenario.inputs[key].trim()&&scenario.inputs[key]!==source.inputs[key]))throw Error('Saved scope differs from this action draft. Its current assumptions are kept.');
 const origins:ScenarioOrigins=Object.fromEntries(fields(scenario.route).map(field=>[field,source.inputs[field]?.trim()?{kind:'adopted',basis:`Explicitly adopted for this action from ${source.sourceId}. Original assumptions remain unverified.`}:{kind:'unknown',basis:null}]));
 if(!validInputs(source.inputs,origins,scenario.route)||scenario.route==='capacity'&&source.inputs.intent!=='additional'||scenario.revision>=100000)throw Error('Saved inputs are incompatible with this proposal.');
 return {...copy(scenario),revision:scenario.revision+1,inputs:copy(source.inputs),origins};
}
export function readActionScenarioStore(raw:unknown):ActionScenarioStore|null{
 if(raw===undefined)return {version:1,entries:[]};
 if(!validateJson(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>192*1024)return null;
 const value=plain(raw);if(!value||!exactKeys(value,['version','entries'])||value.version!==1||!Array.isArray(value.entries)||value.entries.length>12)return null;
 const entries=value.entries.map(parseScenario);if(entries.some(item=>!item))return null;
 const keys=entries.map(item=>canonical([item!.binding,item!.actionSignature]));if(new Set(keys).size!==keys.length||new Set(entries.map(item=>item!.binding.goalId)).size>1)return null;
 return {version:1,entries:entries as ActionScenario[]};
}
export function saveActionScenarioPatch(previous:unknown,scenario:ActionScenario){
 const store=readActionScenarioStore(previous),valid=parseScenario(scenario);if(!store||!valid)throw Error('Saved action assumptions cannot be verified. Existing records are kept.');
 const index=store.entries.findIndex(item=>same(item.binding,valid.binding)&&item.actionSignature===valid.actionSignature);
 if(store.entries.some(item=>item.binding.goalId!==valid.binding.goalId))throw Error('The proposal store belongs to another goal.');
 if(index>=0){const latest=store.entries[index];if(valid.revision<latest.revision||valid.revision===latest.revision&&(!same(valid.inputs,latest.inputs)||!same(valid.origins,latest.origins)||!!latest.calculation&&(!valid.calculation||valid.calculation.revision<latest.calculation.revision)))throw Error('Saved assumptions changed. Reopen this proposal before replacing them.');}
 if(index<0)store.entries.push(valid);else store.entries[index]=valid;
 if(!readActionScenarioStore(store))throw Error('Action proposal storage limit reached. Existing records are kept.');
 return {field:homeActionScenarioField,value:store};
}
/** One prioritized input question. Missing optional values remain Unknown in partial calculations. */
export function nextActionInput(scenario:ActionScenario):{field:string;question:string}|null{
 const input=scenario.inputs;
 if(scenario.route==='retention_what_if'){
  for(const [field,question] of [['population','Which aggregate population should this pilot cover?'],['startMonth','Which month should this proposal start?'],['months','How many months should the proposal cover?']])if(!input[field].trim())return {field,question};
  return null;
 }
 const issue=workforcePlanInputIssues(input)[0];if(issue)return {field:issue.fields[0]??'businessUnit',question:issue.message};
 if(input.arrivalMode==='historical-median')return {field:'arrivalMode',question:'Which explicit arrival assumption should this proposal use?'};
 return null;
}
