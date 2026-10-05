// Local, bounded text edits. No model call, calculation, persistence or inferred values.
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,reviseBundleDraft,unknownAssumption,type Assumption,type BundleDraft,type BundleInputs} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {pilotAllowances} from './home-action-plan-pilot.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planDate} from './workforce-increment.ts';

export type BundleEditChange={field:string;before:Assumption<string|number>;after:Assumption<string|number>};
export type BundleEditPreview={inputKey:string;request:string;changes:BundleEditChange[];inputs:BundleInputs};
type Target={key:string;label:string;type:'text'|'money'|'count'|'months'|'month'|'date';read:()=>Assumption<string|number>;write:(value:Assumption<string|number>)=>void};
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
 for(const group of input.groups)add({key:'group.'+group.id,label:group.id==='pilot-group'&&draft.pilot&&input.groups.length===1?'Pilot participants':group.label+' participants',type:'count',read:()=>group.count,write:value=>{group.count=value as Assumption<number>;}},[group.label+' participants',group.id+' participants',...(input.groups.length===1?['participants','pilot participants']:[])]);
 for(const expense of input.expenses){
  const pilot=pilotAllowances[expense.id.slice(6) as keyof typeof pilotAllowances],label=pilot?.label??expense.label;
  add({key:'expense.'+expense.id+'.amount',label:label+' amount (USD)',type:'money',read:()=>expense.amount,write:value=>{expense.amount=value as Assumption<number>;}},[label,label+' amount',expense.label,expense.id+' amount']);
  add({key:'expense.'+expense.id+'.months',label:label+' occurrences',type:'months',read:()=>expense.months,write:value=>{expense.months=value as Assumption<number>;}},[expense.id+' occurrences']);
  add({key:'expense.'+expense.id+'.startMonth',label:label+' funding month',type:'month',read:()=>expense.startMonth,write:value=>{expense.startMonth=value as Assumption<string>;}},[expense.id+' funding month']);
 }
 for(const timing of input.timing){const component=draft.bundle.components.find(item=>item.id===timing.componentId)!;for(const field of ['start','finish'] as const)add({key:`timing.${component.id}.${field}`,label:`${component.name} ${field}`,type:'date',read:()=>timing[field],write:value=>{timing[field]=value as Assumption<string>;}},[`${component.id} ${field}`]);}
 return names;
}
function parseValue(raw:string,target:Target):Assumption<string|number>{
 if(/^unknown$/i.test(raw))return unknownAssumption();
 let value:string|number=raw,kind:'user-entered'|'illustrative'='user-entered';
 if(/^illustrative\s+/i.test(raw)){kind='illustrative';raw=raw.replace(/^illustrative\s+/i,'');value=raw;}
 if(target.type==='count'||target.type==='months'||target.type==='money'){
  const cleaned=raw.replace(target.type==='money'?/^(?:\$|USD\s+)/i:/^$/,'').replace(target.type==='months'?/\s+months?$/i:target.type==='count'?/\s+(?:people|participants)$/i:/\s+USD$/i,'');
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(cleaned))fail(`Use an explicit ${target.type==='money'?'USD amount':'whole count'} for ${target.label}, or Unknown.`);
  value=Number(cleaned.replaceAll(',',''));if(target.type!=='money'&&!Number.isInteger(value))fail(`${target.label} needs a whole count.`);
 }else if(target.type==='month'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)||!planDate(raw+'-01'))fail(`Use YYYY-MM for ${target.label}, or Unknown.`);}
 else if(target.type==='date'){if(!planDate(raw))fail(`Use YYYY-MM-DD for ${target.label}, or Unknown.`);}
 return {value,kind,basis:kind==='illustrative'?'Explicit illustrative assumption accepted from a reviewed text edit; not evidence.':'Explicit user assumption accepted from a reviewed text edit; not independently verified.'};
}
/** Review only; all clauses must be unambiguous and valid before any proposal is returned. */
export function previewBundleChatEdit(draft:BundleDraft,request:string):BundleEditPreview{
 if(!readBundleDraft(draft))fail('This plan draft cannot be verified. Your work is kept.');
 if(!request.trim()||request.length>1200)fail('Describe up to six edits in 1,200 characters.');
 const clauses=request.trim().split(/;|\n/).map(value=>value.trim()).filter(Boolean);
 if(!clauses.length||clauses.length>6)fail('Use up to six changes, separated by semicolons.');
 const inputs=structuredClone(draft.inputs),available=targets(inputs,draft),changes:BundleEditChange[]=[],seen=new Set<string>();
 for(const clause of clauses){
  const match=clause.match(/^(?:please\s+)?(?:set|change|update)\s+(.+?)\s+to\s+(.+?)\.?$/i);
  if(!match)fail('Use “Set [assumption] to [value]”. Separate changes with semicolons. For other changes, use Edit assumptions and plan or return to general chat.');
  const matches=available.get(normalize(match[1]));
  if(!matches?.length)fail(`“${match[1]}” is not a supported exact assumption name. A budget ceiling is not an expense, and a deadline is not a readiness date. Use the form for staffing, budget limits or plan wording.`);
  if(matches.length!==1)fail(`“${match[1]}” matches more than one assumption. Use its unique field name from the form.`);
  const target=matches[0];if(seen.has(target.key))fail(`Review one value for ${target.label} in each request.`);seen.add(target.key);
  const before=structuredClone(target.read()),after=parseValue(match[2],target);
  if(before.value===after.value&&(before.kind===after.kind||after.value===null))continue;
  changes.push({field:target.label,before,after});target.write(after);
 }
 if(!changes.length)fail('These assumptions already have those values and provenance. No draft change is needed.');
 // A changed horizon must not silently move component dates, expenses or the frozen preset.
 for(const timing of inputs.timing)if(timing.start.value&&timing.finish.value&&timing.start.value>timing.finish.value)fail('A component finish cannot precede its start. Review both dates.');
 if(changes.some(change=>['Population','Shared start month','Shared horizon','Comparison requirements'].includes(change.field)))inputs.scope.comparisonConfirmed=unknownAssumption();
 reviseBundleDraft(draft,inputs); // Reuse the strict draft validator without calculating.
 return {inputKey:bundleInputKey(draft),request,changes,inputs};
}
/** Reconstruct the proposal from its original text; never trust a mutated preview payload. */
export function acceptBundleChatEdit(draft:BundleDraft,preview:BundleEditPreview):BundleDraft{
 if(bundleInputKey(draft)!==preview.inputKey)fail('The selected plan, goal or assumptions changed. Review a fresh edit proposal.');
 const checked=previewBundleChatEdit(draft,preview.request);
 if(JSON.stringify(checked)!==JSON.stringify(preview))fail('The edit proposal changed. Review it again before accepting.');
 return reviseBundleDraft(draft,checked.inputs);
}
