'use client';
import {useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {capacityContext,capacityBinding,monthlyCapacityField,readCapacityBucket,saveCapacityScenario,openCapacityScenario,compareSavedCapacity,type CapacityBucket,type CapacityContext} from '@/lib/swp-capacity-store';
import {capacityRecordIsCurrent} from '@/lib/swp-capacity-record';
import {usePlanningSession} from './planning-session-context';

const control='min-h-11 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground';
const gap=(n:number|null)=>n===null?'Unknown':`${n>0?'+':''}${n.toLocaleString(undefined,{maximumFractionDigits:2})}`;
export function CapacitySavedScenarios(){
 const storage=useDecisionStorage(),{goalKey,capacitySession:session,setCapacitySession:setSession}=usePlanningSession();
 const [name,setName]=useState(''),[leftId,setLeftId]=useState(''),[rightId,setRightId]=useState(''),[notice,setNotice]=useState(''),[actionError,setActionError]=useState('');
 const goalId=goalKey.slice(goalKey.indexOf(':')+1),store=decisionStore,token=datasetSession.snapshot();
 let context:CapacityContext|null=null,bucket:CapacityBucket={version:1,scopes:[],entries:[]},loadError='';
 if(goalId)try{context=capacityContext(store,token,goalId);bucket=readCapacityBucket(storage.data.workspaces[goalId]?.fields[monthlyCapacityField],context);}catch(error){loadError=error instanceof Error?error.message:'Saved scenarios could not be verified.';}
 const assertActive=()=>{
  if(decisionStore!==store||datasetSession.snapshot()!==token||store.getSnapshot().data.goals.activeId!==goalId)throw Error('Active goal or dataset changed. Your draft is kept; calculate again in the current context.');
 };
 function save(){
  setNotice('');setActionError('');
  try{
   if(!context||!session.scope)throw Error('Calculate for a selected saved goal first.');
   const saved=saveCapacityScenario({store,context,scope:session.scope,capture:session.capture,session:{draft:session.draft,result:session.result,error:session.error},name,id:crypto.randomUUID(),at:new Date().toISOString(),revision:storage.data.revision,assertActive});
   setLeftId(saved.record.id);setRightId('');setNotice(`Saved “${saved.record.name}” in this browser.`);setName('');
  }catch(error){setActionError(error instanceof Error?error.message:'Save failed. Your draft is kept.');}
 }
 function open(){
  setNotice('');setActionError('');
  try{
   if(!context||!storage.saved)throw Error('Resolve Browser storage details before reopening saved work.');
   const opened=openCapacityScenario(store,context,leftId,storage.data.revision,assertActive);
   setSession({draft:opened.entry.draft,result:opened.entry.record.result,error:'',scope:opened.scope,capture:opened.capture});
   setNotice(`Opened “${opened.entry.record.name}”; recalculated from its saved inputs.`);
  }catch(error){setActionError(error instanceof Error?error.message:'Open failed. Your draft is kept.');}
 }
 const left=bucket.entries.find(e=>e.record.id===leftId),right=bucket.entries.find(e=>e.record.id===rightId);
 let comparison:ReturnType<typeof compareSavedCapacity>|null=null,comparisonError='';
 if(context&&left&&right)try{comparison=compareSavedCapacity(left,right,context,bucket.scopes);}catch(error){comparisonError=error instanceof Error?error.message:'These records could not be compared.';}
 const openingDifferences=comparison?.assumptionDifferences.filter(change=>change.path.startsWith('opening.')).length??0;
 const monthDifferences=(comparison?.assumptionDifferences.length??0)-openingDifferences;
 const scope=left&&bucket.scopes.find(s=>s.id===left.record.binding.scopeId);
 const isCurrent=Boolean(left&&scope&&context&&session.scope?.id===scope.id&&capacityRecordIsCurrent(left.record,capacityBinding(context,scope),session.draft));
 const disabled=!context||!storage.saved||!!loadError||!session.capture?.binding||session.result?.status!=='calculated';
 const options=bucket.entries.map(e=><option key={e.record.id} value={e.record.id}>{e.record.name}</option>);
 return <section aria-label="Saved capacity scenarios" className="space-y-3 border-t pt-4">
  {!goalId?<p className="text-sm text-muted-foreground">Session only. Select an existing goal to save scenarios; no goal is created automatically.</p>:<>
   <div className="flex flex-wrap items-end gap-2">
    <label className="min-w-0 flex-1 text-sm">Scenario name<input aria-label="Capacity scenario name" maxLength={160} value={name} onChange={e=>{setName(e.target.value);setActionError('');}} className={`${control} mt-1 w-full`} placeholder="e.g. Base workload"/></label>
    <button type="button" disabled={disabled} onClick={save} className={`${control} disabled:opacity-50`}>Save scenario</button>
   </div>
   <p className="text-xs text-muted-foreground">Saved only in this browser under the selected goal. Calculate complete inputs before saving. Changes create a new named scenario.</p>
   {(!storage.saved||loadError||actionError)&&<p role="alert" className="text-sm text-destructive">{actionError||loadError||storage.notice||'Browser storage is unavailable. Resolve Browser storage details, then retry explicitly. Your draft is kept.'}</p>}
   {notice&&<p role="status" className="text-sm">{notice}</p>}
   {bucket.entries.length>0&&<>
    <div className="flex flex-wrap items-end gap-2">
     <label className="min-w-0 flex-1 text-sm">Saved scenario<select aria-label="Saved capacity scenario" value={leftId} onChange={e=>{setLeftId(e.target.value);setRightId('');setNotice('');setActionError('');}} className={`${control} mt-1 w-full`}><option value="">Choose a scenario</option>{options}</select></label>
     <button type="button" disabled={!left||!storage.saved} onClick={open} className={`${control} disabled:opacity-50`}>Open saved scenario</button>
    </div>
    <p className="text-xs text-muted-foreground">Opening replaces the current draft. Open an existing scenario before varying the same workload. {left&&(isCurrent?'Selected saved scenario matches current inputs.':'Selected scenario is a saved snapshot, not the current draft.')}</p>
    {left&&<label className="block text-sm">Compare with<select aria-label="Compare capacity scenario" value={rightId} onChange={e=>setRightId(e.target.value)} className={`${control} mt-1 w-full`}><option value="">Choose another saved scenario</option>{bucket.entries.filter(e=>e.record.id!==leftId).map(e=><option key={e.record.id} value={e.record.id}>{e.record.name}</option>)}</select></label>}
    {(comparisonError||comparison&&!comparison.compatible)&&<p role="status" className="text-sm">{comparisonError||comparison?.reason}</p>}
    {comparison?.compatible&&left&&right&&<div role="region" aria-label="Saved capacity comparison" tabIndex={0} className="overflow-x-auto">
     <table className="w-full text-left text-sm"><caption className="mb-2 text-left">Signed gap in FTE · positive is shortfall, negative is surplus</caption><thead><tr><th scope="col" className="p-2">Month</th><th scope="col" className="p-2">{left.record.name}</th><th scope="col" className="p-2">{right.record.name}</th></tr></thead><tbody>{left.record.result.points.map((p,i)=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th><td className="p-2">{gap(p.gapFte)}</td><td className="p-2">{gap(right.record.result.points[i].gapFte)}</td></tr>)}</tbody></table>
     <p className="mt-2 text-xs text-muted-foreground">Opening assumption differences: {openingDifferences}. Month-level assumption differences: {monthDifferences}. A recurring change counts once per month. These are saved scenarios, not a forecast.</p>
    </div>}
   </>}
  </>}
 </section>;
}
