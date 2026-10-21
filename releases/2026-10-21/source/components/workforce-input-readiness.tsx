import {workforceInputReadiness} from '@/lib/workforce-input-readiness';
import type {WorkforcePlanField,WorkforcePlanInput} from '@/lib/workforce-increment';
export function WorkforceInputReadiness({input,version,dirty,goalChanged,selectedVersion,selectedCurrent,disabled,labels,onFocus,idPrefix}:{
 input:WorkforcePlanInput;version:number;dirty:boolean;goalChanged:boolean;selectedVersion?:number;selectedCurrent:boolean;disabled:boolean;
 labels:Record<WorkforcePlanField,string>;onFocus:(field:WorkforcePlanField)=>void;idPrefix:string;
}){
 const readiness=workforceInputReadiness(input);
 const focus=(field:WorkforcePlanField)=><button type="button" disabled={disabled} className="min-h-10 rounded border px-3 py-2 text-left text-sm disabled:opacity-50" onClick={()=>onFocus(field)}>Review {labels[field]}</button>;
 return <section aria-label="Workforce input readiness" className="min-w-0 space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Input readiness</h3>
  <p>{dirty?'Unsaved draft':'Saved inputs'} · plan version {version}. This checks entered assumptions, not operational feasibility. Nothing is filled, saved or calculated by this summary.</p>
  {dirty&&<p>Save reviewed inputs explicitly, then recalculate. Saved evidence and approvals stay unchanged.</p>}
  {goalChanged&&<p>The goal wording changed. Review and save inputs to bind them to the current goal before calculating.</p>}
  <p>{selectedVersion===undefined?'No saved calculation is selected.':`Selected calculation: version ${selectedVersion}${selectedCurrent&&!dirty?' · current saved evidence.':' · historical or different from these inputs; it does not validate this draft.'}`} Source evidence and arithmetic are checked when you explicitly calculate.</p>
  <h4 className="font-medium">Corrections before calculation ({readiness.corrections.length})</h4>
  {readiness.corrections.length?<ul className="space-y-3">{readiness.corrections.map((issue,index)=><li key={index}><p id={`${idPrefix}-correction-${index}`}>{issue.kind==='missing'?'Missing input':'Invalid input'}: {issue.message}</p><div className="mt-1 flex flex-wrap gap-2">{issue.fields.map(field=><span key={field}>{focus(field)}</span>)}</div></li>)}</ul>:<p>No input corrections found. This is not a completed calculation or a passed constraint check.</p>}
  <h4 className="font-medium">Unknown assumptions ({readiness.unknowns.length})</h4>
  <p>Blank optional amounts and dates stay unknown, not zero. They may leave costs, coverage or constraints unknown without blocking the entered-input check.</p>
  {readiness.unknowns.length?<ul className="space-y-3">{readiness.unknowns.map(item=><li key={item.field}><p>{item.message}</p>{focus(item.field)}</li>)}</ul>:<p>No blank assumptions affecting these paths were identified.</p>}
  {readiness.evidenceChecks.map(item=><p key={item.field}>{item.message} {focus(item.field)}</p>)}
  <p>{readiness.capacity}</p>
 </section>;
}
