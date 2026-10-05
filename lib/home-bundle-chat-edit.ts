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
const numberWords=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const monthNames=['january','february','march','april','may','june','july','august','september','october','november','december'];
function everydayClause(raw:string,available:Map<string,Target[]>,draft:BundleDraft):{name:string;value:string}{
 const clause=raw.trim().replace(/[.?]$/,'').replace(/^(?:please\s+|(?:can|could|would)\s+(?:you|we)\s+|i(?:’|')?d like to\s+)/i,'');
 if(/\b(?:not|never|don[’']?t|do not|avoid|except|unless|instead|rather than)\b/i.test(clause))fail('Which change should I make? Restate the desired value without a negation or exception; no changes have been proposed.');
 if(/\b(?:plan\s*#?\s*\d+|(?:both|all|other|another|each)\s+plans?)\b/i.test(clause))fail('Which plan should I edit? Choose Discuss changes on that plan, then describe its changes without referring to other plans.');
 let match=clause.match(/^(?:set|change|update)\s+(.+?)\s+to\s+(.+)$/i);
 if(match&&available.has(normalize(match[1]))&&!/^(?:(?:total|overall|plan)\s+)?budget(?:\s+(?:ceiling|limit))?$/i.test(match[1]))return {name:match[1],value:match[2]};
 if(/\bbudget(?=\b|\d)/i.test(clause))fail('Does this budget mean a total plan ceiling or an amount for a specific expense? Use Edit assumptions and plan for a total ceiling. For an expense, name the allowance and its amount in USD, using its displayed cost basis. No budget has been changed.');
 if(match)return {name:match[1],value:match[2]};
 match=clause.match(/^(?:start(?:\s+(?:it|the plan))?\s+in|move\s+(?:the\s+)?start\s+to)\s+(.+)$/i);
 if(match)return {name:'Shared start month',value:match[1]};
 match=clause.match(/^(?:make\s+(?:it|the plan)|run\s+(?:it|the plan)\s+for)\s+(.+?)\s+months?$/i);
 if(match)return {name:'Shared horizon',value:match[1]};
 match=clause.match(/^use\s+(.+?)\s+participants(?:\s+for\s+(.+))?$/i);
 if(match){
  if(!match[2]&&draft.inputs.groups.length!==1)fail(draft.inputs.groups.length?'Which participant group should use this count? Choose '+draft.inputs.groups.map(group=>`“${group.label}”`).join(' or ')+'. Say “use 20 participants for [group]”.':'Which participant group should this count describe? Add a group in Edit assumptions and plan first.');
  return {name:match[2]?match[2]+' participants':'participants',value:match[1]};
 }
 fail('Which assumption should change? Try “start in December 2026”, “make it three months”, or “use 20 participants”. For another existing assumption, say “change [name] to [value]”, or use Edit assumptions and plan.');
}
function parseValue(raw:string,target:Target):Assumption<string|number>{
 if(/^unknown$/i.test(raw))return unknownAssumption();
 let value:string|number=raw,kind:'user-entered'|'illustrative'='user-entered';
 if(/^illustrative\s+/i.test(raw)){kind='illustrative';raw=raw.replace(/^illustrative\s+/i,'');value=raw;}
 if(target.type==='count'||target.type==='months'||target.type==='money'){
  let cleaned=raw.replace(target.type==='money'?/^(?:\$|USD\s+)/i:/^$/,'').replace(target.type==='months'?/\s+months?$/i:target.type==='count'?/\s+(?:people|participants)$/i:/\s+USD$/i,'');
  const word=numberWords.indexOf(cleaned.toLowerCase());if(word>=0)cleaned=String(word);
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(cleaned))fail(`Use an explicit ${target.type==='money'?'USD amount':'whole count'} for ${target.label}, or Unknown.`);
  value=Number(cleaned.replaceAll(',',''));if(target.type!=='money'&&!Number.isInteger(value))fail(`${target.label} needs a whole count.`);
 }else if(target.type==='month'){const named=raw.match(/^([A-Za-z]+)\s+(\d{4})$/),month=named?monthNames.findIndex(name=>name===named[1].toLowerCase()||name.slice(0,3)===named[1].toLowerCase()):-1;if(named&&month>=0){raw=`${named[2]}-${String(month+1).padStart(2,'0')}`;value=raw;}if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)||!planDate(raw+'-01'))fail(`Which month and year should ${target.label} use? Say December 2026 or 2026-12, or Unknown.`);}
 else if(target.type==='date'){if(!planDate(raw))fail(`Use YYYY-MM-DD for ${target.label}, or Unknown.`);}
 return {value,kind,basis:kind==='illustrative'?'Explicit illustrative assumption accepted from a reviewed text edit; not evidence.':'Explicit user assumption accepted from a reviewed text edit; not independently verified.'};
}
/** Review only; all clauses must be unambiguous and valid before any proposal is returned. */
export function previewBundleChatEdit(draft:BundleDraft,request:string):BundleEditPreview{
 if(!readBundleDraft(draft))fail('This plan draft cannot be verified. Your work is kept.');
 if(!request.trim()||request.length>1200)fail('Describe up to six edits in 1,200 characters.');
 const clauses=request.trim().split(/;|\n|\s+and\s+(?=(?:start|make|use|set|change|update|move|run)\b)/i).map(value=>value.trim()).filter(Boolean);
 if(!clauses.length||clauses.length>6)fail('Use up to six changes, separated by semicolons.');
 const inputs=structuredClone(draft.inputs),available=targets(inputs,draft),changes:BundleEditChange[]=[],seen=new Set<string>();
 for(const clause of clauses){
  const parsed=everydayClause(clause,available,draft),matches=available.get(normalize(parsed.name));
  if(!matches?.length)fail(`“${parsed.name}” is not a supported exact assumption name. A budget ceiling is not an expense, and a deadline is not a readiness date. Use the form for staffing, budget limits or plan wording.`);
  if(matches.length!==1)fail(`“${parsed.name}” matches more than one assumption. Use its unique field name from the form.`);
  const target=matches[0];if(seen.has(target.key))fail(`Review one value for ${target.label} in each request.`);seen.add(target.key);
  const before=structuredClone(target.read()),after=parseValue(parsed.value,target);
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
