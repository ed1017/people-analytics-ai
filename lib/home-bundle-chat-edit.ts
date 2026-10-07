// @ts-expect-error Native Node tests share TypeScript source.
import {whatIfScope} from './home-plan-what-if.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {withDeliveryAssumptions} from "./home-plan-delivery-estimate.ts";
// Local, bounded text edits. No model call, calculation, persistence or inferred values.
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,cashHoursInputs,readBundleDraft,reviseBundleDraft,unknownAssumption,type Assumption,type BundleDraft,type BundleInputs} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {pilotAllowances} from './home-action-plan-pilot.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planDate} from './workforce-increment.ts';

export type BundleEditChange={field:string;before:Assumption<string|number>;after:Assumption<string|number>};
export type BundleEditPreview={inputKey:string;request:string;changes:BundleEditChange[];inputs:BundleInputs};
export type BundleEditSelection={option:number;count:number};
type Target={key:string;label:string;type:'text'|'money'|'percent'|'count'|'months'|'month'|'date';read:()=>Assumption<string|number>;write:(value:Assumption<string|number>)=>void};
const normalize=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,' ');
function fail(message:string):never{throw Error(message)}
function targets(input:BundleInputs,draft:BundleDraft){
 const names=new Map<string,Target[]>();
 function add(target:Target,aliases:string[]){for(const alias of new Set([target.label,...aliases].map(normalize)))names.set(alias,[...names.get(alias)??[],target]);}
 for(const [key,label,type,aliases] of [['population','Population','text',['aggregate population']],['startMonth','Shared start month','month',['start month']],['months','Shared horizon','months',['horizon','planning horizon']],['requirements','Comparison requirements','text',['requirements']]] as const){
  add({key:'scope.'+key,label,type,read:()=>input.scope[key],write:value=>{if(key==='months')input.scope.months=value as Assumption<number>;else input.scope[key]=value as Assumption<string>;
   if(input.capacity&&(key==='startMonth'||key==='months')){const field=key==='startMonth'?'planningMonth':'months';input.capacity.input[field]=value.value===null?'':String(value.value);input.capacity.origins[field]={kind:value.kind,basis:value.basis};}
  }},[...aliases]);
 }
 if(input.whatIf){const scenario=input.whatIf;for(const [key,label,type,aliases] of (scenario.kind==='turnover'?[
  ['baseline','Baseline turnover','percent',['baseline turnover rate','baseline rate']],['target','Target turnover','percent',['target turnover rate','turnover target','success target']],['population','Average workforce','count',['outcome population','denominator']],
 ]:[['baseline','Baseline additional roles','count',['baseline coverage']],['target','Target additional roles','count',['additional roles','capacity target','success target']],['unitCost','Monthly cost per role','money',['monthly role cost','role monthly cost']]]) as [keyof Pick<typeof scenario,'baseline'|'target'|'population'|'unitCost'>,string,Target['type'],string[]][]){add({key:'whatIf.'+key,label,type,read:()=>scenario[key],write:value=>{scenario[key]=value as Assumption<number>;}},aliases);}}
 if(input.deliveryEstimate){const delivery=input.deliveryEstimate;for(const [key,label,type,aliases] of [['hoursPerParticipant','Hours per participant','count',['assessment hours per participant']],['coordinationHours','Coordination hours','count',['staff coordination hours']],['hourlyRate','Staff hourly rate','money',['hourly rate','staff rate']],['acceptance','Acceptance criteria','text',['success criteria']]] as const){if(input.costPolicy&&key==='hourlyRate')continue;add({key:'deliveryEstimate.'+key,label,type,read:()=>delivery[key],write:value=>{if(key==='acceptance')delivery.acceptance=value as Assumption<string>;else delivery[key]=value as Assumption<number>;}},[...aliases]);}}
 for(const group of input.groups)add({key:'group.'+group.id,label:group.id==='pilot-group'&&draft.pilot&&input.groups.length===1?'Pilot participants':group.label+' participants',type:'count',read:()=>group.count,write:value=>{group.count=value as Assumption<number>;}},[group.label+' participants',group.id+' participants',...(input.groups.length===1?['participants','pilot participants']:[])]);
 for(const expense of input.expenses){
  if(input.costPolicy&&expense.kind==='employee_time')continue;
  const pilot=pilotAllowances[expense.id.slice(6) as keyof typeof pilotAllowances],label=pilot?.label??expense.label;
  add({key:'expense.'+expense.id+'.amount',label:label+' amount (USD)',type:'money',read:()=>expense.amount,write:value=>{expense.amount=value as Assumption<number>;}},[label,label+' amount',expense.label,expense.id+' amount',...(expense.kind==='cash'?[label+' allowance',label+' cash allowance',label+' cash amount',...(expense.months.value===1?[label+' one-time allowance',label+' one-time cash allowance']:[])]:[])]);
  add({key:'expense.'+expense.id+'.months',label:label+' occurrences',type:'months',read:()=>expense.months,write:value=>{expense.months=value as Assumption<number>;}},[expense.id+' occurrences']);
  add({key:'expense.'+expense.id+'.startMonth',label:label+' funding month',type:'month',read:()=>expense.startMonth,write:value=>{expense.startMonth=value as Assumption<string>;}},[expense.id+' funding month']);
 }
 for(const timing of input.timing){const component=draft.bundle.components.find(item=>item.id===timing.componentId)!;for(const field of ['start','finish'] as const)add({key:`timing.${component.id}.${field}`,label:`${component.name} ${field}`,type:'date',read:()=>timing[field],write:value=>{timing[field]=value as Assumption<string>;}},[`${component.id} ${field}`]);}
 return names;
}
const numberWords=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const monthNames=['january','february','march','april','may','june','july','august','september','october','november','december'];
function budgetClause(raw:string):{amount:string;basis:'cash'|'all-in'|null}|null{
 const clause=raw.trim().replace(/[.!?]$/,'').replace(/^(?:please\s+|(?:can|could|would)\s+(?:you|we)\s+)/i,'');
 const match=clause.match(/^(?:(?:(?:i|we)\s+)?(?:have|only have)\s+(?:a\s+)?|(?:(?:my|our|the|a)\s+)?|(?:set|change|update|lower|raise|increase|decrease|reduce)\s+(?:the\s+)?)(?:(cash|all-in|total|overall|plan)\s+)?budget(?:\s+(?:ceiling|limit))?\s*(?:of|is|to|=|:)\s*(.+)$/i)
  ??clause.match(/^(?:(?:i|we)\s+)?(?:can spend|can afford)\s+()(.+)$/i);
 if(!match)return null;
 let amount=match[2],basis:'cash'|'all-in'|null=match[1]?.toLowerCase()==='cash'?'cash':match[1]?.toLowerCase()==='all-in'?'all-in':null;
 const suffix=amount.match(/\s+(all[- ]in|including (?:staff|employee) time|cash(?: only)?|excluding (?:staff|employee) time)$/i);
 if(suffix){const explicit=/^(?:cash|excluding)/i.test(suffix[1])?'cash':'all-in';if(basis&&basis!==explicit)fail('Choose one budget basis: cash only or including staff time.');basis=explicit;amount=amount.slice(0,-suffix[0].length);}
 const short=amount.match(/^(\$|USD\s*)?(\d+(?:\.\d{1,2})?)k(?:\s+USD)?$/i);if(short)amount=String(Number(short[2])*1000);
 return {amount,basis};
}
/** Routing only: recognize a local edit before general chat can append it to goal context. */
export function bundleChatEditIntent(request:string){
 const courtesy=(value:string)=>value.trim().replace(/^(?:please\s+|(?:can|could|would)\s+(?:you|we)\s+|i(?:’|')?d like to\s+)/i,'');
 const planReference=/\b(?:action\s+)?plan\s*#?\s*\d+\b/i.test(request);
 const body=courtesy(courtesy(request).replace(/^(?:(?:in|for|on)\s+)?(?:action\s+)?plan\s*#?\s*\d+(?:\s*(?:and|or|,)\s*(?:(?:action\s+)?plan\s*)?#?\s*\d+)*\s*[:,]?\s*/i,''));
 const edit=/^(?:(?:do not|don[’']?t|never|avoid)\s+)?(?:set|change|update|assume|lower|raise|increase|decrease|reduce|start|move|make|run|use|budget|add|remove|fill|complete)\b/i.test(body);
 const statement=/^(?:(?:i|we)\s+)?(?:have|has|only have|need|want)\b.*\b(?:budget|participants?|months?|hours?)\b|^(?:(?:i|we)\s+)?(?:can spend|can afford)\s+(?:\$|USD\s*)?\d|^(?:my|our|the)\s+(?:cash\s+|total\s+|all-in\s+)?budget\b/i.test(body);
 const question=/^(?:what|why|how|when|where|which|does|is|are|will|would|could|can)\b/i.test(body)&&!edit;
 return {edit:!question&&(edit||statement),planReference};
}
function selectedPlanRequest(request:string,selection?:BundleEditSelection):string{
 const references=[...request.matchAll(/\b(?:action\s+)?plan\s*#?\s*(\d+)\b/gi)];
 if(!references.length)return request;
 if(references.length!==1||/\b(?:both|all|other|another|each)\s+(?:action\s+)?plans?\b|\b(?:and|or)\s*#?\d+\b/i.test(request))fail('Name one Action Plan and one set of changes. Nothing has changed.');
 if(!selection||!Number.isInteger(selection.option)||!Number.isInteger(selection.count)||selection.count<1||selection.count>3||selection.option<1||selection.option>selection.count)fail('Select the intended Action Plan tab before reviewing this change.');
 const number=Number(references[0][1]);
 if(number<1||number>selection.count)fail(`Choose an available Action Plan from 1 to ${selection.count}. Nothing has changed.`);
 if(number!==selection.option)fail(`Select Action Plan #${number}, then send this change again for review. Nothing has changed.`);
 const stripped=request.replace(/\b(?:in|for|on)\s+(?:action\s+)?plan\s*#?\s*\d+\b\s*[:,]?\s*/i,' ').replace(/^(?:action\s+)?plan\s*#?\s*\d+\s*[:,]\s*/i,'').trim();
 if(/\bplan\s*#?\s*\d+/i.test(stripped))fail('Use “in Action Plan #'+selection.option+'” with the assumption and desired value. Nothing has changed.');
 return stripped;
}
function everydayClause(raw:string,available:Map<string,Target[]>,draft:BundleDraft):{name:string;value:string;previous?:string}{
 const clause=raw.trim().replace(/[.?]$/,'').replace(/^(?:please\s+|(?:can|could|would)\s+(?:you|we)\s+|i(?:’|')?d like to\s+)/i,'');
 if(/\b(?:not|never|don[’']?t|do not|avoid|except|unless|instead|rather than)\b/i.test(clause))fail('Which change should I make? Restate the desired value without a negation or exception; no changes have been proposed.');
 if(/\b(?:plan\s*#?\s*\d+|(?:both|all|other|another|each)\s+plans?)\b/i.test(clause))fail('Which plan should I edit? Select that Plan tab, then describe its changes without referring to other plans.');
 const transition=clause.match(/^(?:set|change|update|lower|raise|increase|decrease|reduce)\s+(?:the\s+)?(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i);
 if(transition&&!/\bbudget\b/i.test(transition[1]))return {name:transition[1],previous:transition[2],value:transition[3]};
 let match=clause.match(/^(?:set|change|update|lower|raise|increase|decrease|reduce)\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
 if(!match)match=clause.match(/^assume\s+(.+?)\s+(?:is|equals|of)\s+(.+)$/i);
 if(match&&available.has(normalize(match[1]))&&!/^(?:(?:total|overall|plan)\s+)?budget(?:\s+(?:ceiling|limit))?$/i.test(match[1]))return {name:match[1],value:match[2]};
 if(/\bbudget(?=\b|\d)/i.test(clause))fail('Is this a total spending limit or a specific allowance? Name the allowance and its USD amount; a total limit is not a cost estimate. Nothing has changed.');
 if(match)return {name:match[1],value:match[2]};
 match=clause.match(/^(?:start(?:\s+(?:it|the plan))?\s+in|move\s+(?:the\s+)?start\s+to)\s+(.+)$/i);
 if(match)return {name:'Shared start month',value:match[1]};
 match=clause.match(/^(?:make\s+(?:it|the plan)|run\s+(?:it|the plan)\s+for)\s+(.+?)\s+months?$/i);
 if(match)return {name:'Shared horizon',value:match[1]};
 match=clause.match(/^(?:use|(?:(?:i|we)\s+)?(?:have|need|want|only have))\s+(.+?)\s+participants(?:\s+for\s+(.+))?$/i);
 if(match){
  if(!match[2]&&draft.inputs.groups.length!==1)fail(draft.inputs.groups.length?'Which participant group should use this count? Choose '+draft.inputs.groups.map(group=>`“${group.label}”`).join(' or ')+'. Say “use 20 participants for [group]”.':'This plan has no participant group, so that change cannot be applied.');
  return {name:match[2]?match[2]+' participants':'participants',value:match[1]};
 }
 fail('Which assumption should change? Try “start in December 2026”, “make it three months”, or “use 20 participants”. For a scenario, say “set target turnover to 12%” or “set target additional roles to 3”. Which displayed assumption should change?');
}
function parseValue(raw:string,target:Target):Assumption<string|number>{
 if(/^unknown$/i.test(raw))return unknownAssumption();
 let value:string|number=raw,kind:'user-entered'|'illustrative'='user-entered';
 if(/^illustrative\s+/i.test(raw)){kind='illustrative';raw=raw.replace(/^illustrative\s+/i,'');value=raw;}
 if(target.type==='count'||target.type==='months'||target.type==='money'||target.type==='percent'){
  let cleaned=(target.type==='percent'?raw.replace(/\s*(?:%|percent)$/i,''):raw).replace(target.type==='money'?/^(?:\$|USD\s+)/i:/^$/,'').replace(target.type==='months'?/\s+months?$/i:target.type==='count'?/\s+(?:people|participants)$/i:/\s+USD$/i,'');
  const word=numberWords.indexOf(cleaned.toLowerCase());if(word>=0)cleaned=String(word);
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(cleaned))fail(`Use an explicit ${target.type==='money'?'USD amount':'whole count'} for ${target.label}, or Unknown.`);
  value=Number(cleaned.replaceAll(',',''));if(target.type!=='money'&&target.type!=='percent'&&!Number.isInteger(value))fail(`${target.label} needs a whole count.`);
 }else if(target.type==='month'){const named=raw.match(/^([A-Za-z]+)\s+(\d{4})$/),month=named?monthNames.findIndex(name=>name===named[1].toLowerCase()||name.slice(0,3)===named[1].toLowerCase()):-1;if(named&&month>=0){raw=`${named[2]}-${String(month+1).padStart(2,'0')}`;value=raw;}if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)||!planDate(raw+'-01'))fail(`Which month and year should ${target.label} use? Say December 2026 or 2026-12, or Unknown.`);}
 else if(target.type==='date'){if(!planDate(raw))fail(`Use YYYY-MM-DD for ${target.label}, or Unknown.`);}
 return {value,kind,basis:kind==='illustrative'?'Explicit illustrative assumption accepted from a reviewed text edit; not evidence.':'Explicit user assumption accepted from a reviewed text edit; not independently verified.'};
}
/** Review only; all clauses must be unambiguous and valid before any proposal is returned. */
export function previewBundleChatEdit(draft:BundleDraft,request:string,selection?:BundleEditSelection,legacyReplay=false):BundleEditPreview{
 if(!readBundleDraft(draft))fail('This plan draft cannot be verified. Your work is kept.');
 if(!request.trim()||request.length>1200)fail('Describe up to six edits in 1,200 characters.');
 // Only a final complete preservation instruction is optional; never discard intervening requests.
 if(/^(?:please\s+)?(?:make|fill(?: in)?|complete|add|use)\s+(?:(?:all|the|missing|remaining|needed|necessary|starting|reasonable)\s+)*assumptions(?:\s+(?:so (?:you|we) (?:have|get|can see) an outcome|to (?:show|give|have) an outcome))?[.!]?$/i.test(selectedPlanRequest(request,selection))){
  const completed=withDeliveryAssumptions(legacyReplay?draft.inputs:cashHoursInputs(draft.inputs),draft.bundle.components.length);
  if(draft.inputs.deliveryEstimate)fail('Starting assumptions are already shown. Change hours per participant, coordination hours or acceptance criteria in chat.');
  return {inputKey:bundleInputKey(draft),request,inputs:completed,changes:[{field:'Delivery estimate assumptions',before:{value:null,kind:'unknown',basis:null},after:{value:legacyReplay?'2 hours per participant, 8 coordination hours per component, $60 per hour and proposed acceptance criteria':'2 hours per participant, 8 coordination hours per component and proposed acceptance criteria',kind:'illustrative',basis:'Proposed local assumptions; review before applying.'}}]};
 }
 if(!legacyReplay&&/\b(?:hourly (?:rate|cost)|staff rate)\b/i.test(request))fail('Action Plans track staff effort in hours, without a monetary rate. Change hours per participant or coordination hours instead.');
 const editRequest=selectedPlanRequest(request,selection).trim().replace(/\.\s+Keep (?:all )?other assumptions unchanged\.?$/i,'');
 // Split only recognized independent edits, including a shared "I have" subject.
 // Keep amounts, expense labels and budget-basis qualifiers intact; validation
 // still rejects the entire proposal if any clause is ambiguous or invalid.
 const clauses=editRequest.split(/;|\n|\s+and\s+(?=(?:start|make|use|set|change|update|move|run)\b|(?:(?:i|we)\s+)?(?:have|only have)\b|(?:(?:a|my|our|the)\s+)?(?:(?:cash|all-in|total|overall|plan)\s+)?budget\b|(?:\d[\d,]*|twenty)\s+participants\b)/i).map(value=>value.trim()).filter(Boolean).map(value=>/^(?:\d[\d,]*|twenty)\s+participants\b/i.test(value)?'use '+value:value);
 if(!clauses.length||clauses.length>6)fail('Use up to six changes, separated by semicolons.');
 const inputs=legacyReplay?structuredClone(draft.inputs):cashHoursInputs(draft.inputs),available=targets(inputs,draft),changes:BundleEditChange[]=[],seen=new Set<string>();
 for(const clause of clauses){
  const budget=budgetClause(clause);
  if(budget){
   if(seen.has('budget'))fail('Review one budget value per request.');seen.add('budget');
   const target:Target={key:'budget',label:'Budget limit',type:'money',read:()=>inputs.budget?.amount??unknownAssumption(),write:()=>{}};
   const amount=parseValue(budget.amount,target) as Assumption<number>;
   const before=inputs.budget;
   const basis=!legacyReplay?{value:'cash' as const,kind:budget.basis?'user-entered' as const:'illustrative' as const,basis:'Cash spending ceiling for the shared planning horizon; staff hours are tracked separately without a monetary value.'}:budget.basis?{value:budget.basis,kind:'user-entered' as const,basis:'Explicit user budget basis; not an expense.'}:before?.basis??{value:'cash' as const,kind:'illustrative' as const,basis:'Proposed cash ceiling, retaining this plan’s separate cash and employee-time convention for its shared planning horizon.'};
   if(before?.amount.value!==amount.value||JSON.stringify(before?.basis)!==JSON.stringify(basis)){
    inputs.budget={amount,basis};changes.push({field:'Budget limit (USD)',before:before?.amount??unknownAssumption(),after:amount});
    if(before?.basis.value!==basis.value)changes.push({field:'Budget basis',before:before?.basis??unknownAssumption(),after:basis});
   }
   continue;
  }
  if(/^use this period for the what-if[.!]?$/i.test(clause)&&inputs.whatIf){const before={value:inputs.whatIf.scopeKey,kind:'user-entered' as const,basis:'Previous what-if scope'},after={value:whatIfScope(inputs),kind:'user-entered' as const,basis:'Explicitly reviewed population and period; rates or roles remain assumptions.'};if(before.value!==after.value){changes.push({field:'What-if population and period',before,after});inputs.whatIf.scopeKey=after.value;}continue;}
  const parsed=everydayClause(clause,available,draft),matches=available.get(normalize(parsed.name));
  if(!matches?.length)fail(`“${parsed.name}” is not a supported exact assumption name. Which displayed assumption and value do you mean? A spending limit is not an expense; a deadline is not a readiness date. Nothing has changed.`);
  if(matches.length!==1)fail(`“${parsed.name}” matches more than one assumption. Which displayed assumption do you mean? Name its specific label.`);
  const target=matches[0];if(seen.has(target.key))fail(`Review one value for ${target.label} in each request.`);seen.add(target.key);
  const before=structuredClone(target.read()),after=parseValue(parsed.value,target);
  if(parsed.previous!==undefined&&parseValue(parsed.previous,target).value!==before.value)fail(`The current ${target.label} differs from the stated starting value. Review it before proposing a change.`);
  if(before.value===after.value&&(before.kind===after.kind||after.value===null))continue;
  changes.push({field:target.label,before,after});target.write(after);
 }
 if(!changes.length)fail('These assumptions already have those values and provenance. No draft change is needed.');
 // A changed horizon must not silently move component dates, expenses or the frozen preset.
 for(const timing of inputs.timing)if(timing.start.value&&timing.finish.value&&timing.start.value>timing.finish.value)fail('A component finish cannot precede its start. Review both dates.');
 if(changes.some(change=>['Population','Shared start month','Shared horizon','Comparison requirements'].includes(change.field)))inputs.scope.comparisonConfirmed=unknownAssumption();
 reviseBundleDraft(draft,inputs,legacyReplay); // Reuse the strict draft validator without calculating.
 return {inputKey:bundleInputKey(draft),request,changes,inputs};
}
/** Reconstruct the proposal from its original text; never trust a mutated preview payload. */
export function acceptBundleChatEdit(draft:BundleDraft,preview:BundleEditPreview,selection?:BundleEditSelection):BundleDraft{
 if(bundleInputKey(draft)!==preview.inputKey)fail('The selected plan, goal or assumptions changed. Review a fresh edit proposal.');
 const legacyReplay=!preview.inputs.costPolicy;
 const checked=previewBundleChatEdit(draft,preview.request,selection,legacyReplay);
 if(JSON.stringify(checked)!==JSON.stringify(preview))fail('The edit proposal changed. Review it again before accepting.');
 return reviseBundleDraft(draft,checked.inputs,legacyReplay);
}

export type BundleEditExample={field:string;current:Assumption<string|number>;command:string;unit:string};
/** Display-only syntax examples, validated by the same parser as Send. Never adopted automatically. */
export function bundleChatEditExamples(draft:BundleDraft):BundleEditExample[]{
 const available=targets(structuredClone(draft.inputs),draft),examples:BundleEditExample[]=[],used=new Set<string>();
 for(const matches of available.values())for(const target of matches){
  if(used.has(target.key))continue;used.add(target.key);
  if(!target.key.startsWith('group.')&&!target.key.endsWith('.amount')&&!target.key.startsWith('timing.')&&target.key!=='scope.months')continue;
  const category=target.key.split('.')[0];
  if(examples.some(item=>item.unit.startsWith(category==='group'?'participants':category==='expense'?'USD':category==='timing'?'date':'months')))continue;
  const current=target.read();let value:string,unit:string;
  if(target.type==='count'){value='Illustrative '+(current.value===20?21:20);unit='participants';}
  else if(target.type==='money'){value='Illustrative $'+(current.value===1500?1600:1500);unit='USD per occurrence';}
  else if(target.type==='months'){value='Illustrative '+(current.value===3?4:3);unit='months';}
  else {if(!current.value)continue;value=(current.kind==='illustrative'?'':'Illustrative ')+String(current.value);unit='date · YYYY-MM-DD';}
  const command=`Set ${target.label} to ${value}`;
  try{const preview=previewBundleChatEdit(draft,command);if(preview.changes.length===1)examples.push({field:target.label,current:structuredClone(current),command,unit});}catch{/* Ambiguous names or invalid clauses must never appear as usable examples. */}
 }
 return examples;
}
