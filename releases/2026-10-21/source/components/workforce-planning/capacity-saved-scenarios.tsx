'use client';
import {capacityBalanceLabel} from '@/lib/capacity-display';
import {useState} from 'react';
import {CarriedPlanningGoal} from './carried-planning-goal';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {capacityContext,capacityBinding,monthlyCapacityField,readCapacityBucket,saveCapacityScenario,openCapacityScenario,compareSavedCapacity,type CapacityBucket,type CapacityContext} from '@/lib/swp-capacity-store';
import {formatCapacityCost} from '@/lib/swp-capacity-cost';
import {capacityRecordIsCurrent} from '@/lib/swp-capacity-record';
import {usePlanningSession} from './planning-session-context';
import type {CapacityDraft} from '@/lib/swp-capacity-draft';

const control='min-h-11 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground';
const gap=capacityBalanceLabel;
const assumptionFields = [
 ['people','People at the start','people'],
 ['fte','Contracted time at start','FTE'],
 ['volume','Work items each month','items/month'],
 ['effort','Hours per item','hours/item'],
 ['hours','Productive hours per FTE','hours/FTE/month'],
 ['hires','Hires each month','people/month'],
 ['exits','Departures each month','people/month'],
 ['hireFte','Contracted time per hire','FTE/person'],
 ['exitFte','Contracted time per departure','FTE/person'],
 ['allocation','Time assigned to this work','%'],
 ['productivity','Productivity improvement','%'],
 ['costRate','Cost per contracted FTE','USD/FTE/month'],
] as const;
/** Presentation of validated recurring drafts only; compatibility remains owned by the saved-record comparison. */
export function CapacityAssumptionChanges({left,right}:{left:{name:string;draft:CapacityDraft};right:{name:string;draft:CapacityDraft}}){
 const value=(draft:CapacityDraft,key:typeof assumptionFields[number][0])=>{
  const raw=(key==='hireFte'||key==='exitFte')&&draft.fullTimeMovements?'1':draft[key];
  return raw?.trim()?Number(raw):null;
 };
 const changes:{label:string;left:string;right:string}[]=assumptionFields.flatMap(([key,label,unit])=>{
  const a=value(left.draft,key),b=value(right.draft,key);
  if(a===b)return [];
  const display=(n:number|null)=>n===null?'Unknown':`${n.toLocaleString(undefined,{maximumFractionDigits:key==='costRate'?2:6})} ${unit}`;
  return [{label,left:display(a),right:display(b)}];
 });
 if(left.draft.fullTimeMovements!==right.draft.fullTimeMovements){
  const basis=(draft:CapacityDraft)=>draft.fullTimeMovements?'Each joiner and departure assumed to be 1 FTE':'FTE per hire and departure entered separately';
  changes.push({label:'Joiner and departure FTE basis',left:basis(left.draft),right:basis(right.draft)});
 }
 return <details className="mt-3 border-t">
  <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">What changed between these scenarios</summary>
  <p className="text-sm text-muted-foreground">Saved input differences, not effects attributed to any one change. Monthly assumptions repeat throughout the plan. Unknown cost is not zero.</p>
  {changes.length?<div className="mt-3 space-y-3">{changes.map(change=><div key={change.label} className="min-w-0 rounded-lg border p-3">
   <h4 className="text-sm font-semibold">{change.label}</h4>
   <dl className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">{[[left.name,change.left],[right.name,change.right]].map(([name,amount],index)=><div key={index} className="min-w-0 break-words"><dt className="text-xs text-muted-foreground">{name}</dt><dd className="text-sm tabular-nums">{amount}</dd></div>)}</dl>
  </div>)}</div>:<p className="mt-2 text-sm">No differences in the recurring capacity or cost inputs.</p>}
 </details>;
}
export function CapacitySavedScenarios(){
 const storage=useDecisionStorage(),{goalKey,capacitySession:session,setCapacitySession:setSession,carriedGoalActions}=usePlanningSession();
 const name=session.saveName??'';
 const setName=(saveName:string)=>setSession({...session,saveName});
 const [leftId,setLeftId]=useState(''),[rightId,setRightId]=useState(''),[notice,setNotice]=useState(''),[actionError,setActionError]=useState('');
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
   const saved=saveCapacityScenario({store,context,scope:session.scope,capture:session.capture,session:{draft:session.draft,result:session.result,error:session.error,...(session.cost?{cost:session.cost}:{})},name,id:crypto.randomUUID(),at:new Date().toISOString(),revision:storage.data.revision,assertActive});
   setLeftId(saved.record.id);setRightId('');setNotice(`Saved “${saved.record.name}” in this browser.`);setSession({...session,saveName:'',openedScenario:{id:saved.record.id,name:saved.record.name,inputKey:saved.record.inputKey}});
  }catch(error){setActionError(error instanceof Error?error.message:'Save failed. Your draft is kept.');}
 }
 function open(){
  setNotice('');setActionError('');
  try{
   if(!context||!storage.saved)throw Error('Resolve Browser storage details before reopening saved work.');
   const opened=openCapacityScenario(store,context,leftId,storage.data.revision,assertActive);
    setSession({draft:opened.entry.draft,result:opened.entry.record.result,cost:opened.entry.record.schemaVersion===2?opened.entry.record.cost:null,error:'',scope:opened.scope,capture:opened.capture,openedScenario:{id:opened.entry.record.id,name:opened.entry.record.name,inputKey:opened.entry.record.inputKey}});
   setNotice(`Opened “${opened.entry.record.name}”; recalculated from its saved inputs.`);
  }catch(error){setActionError(error instanceof Error?error.message:'Open failed. Your draft is kept.');}
 }
 const left=bucket.entries.find(e=>e.record.id===leftId),right=bucket.entries.find(e=>e.record.id===rightId);
 let comparison:ReturnType<typeof compareSavedCapacity>|null=null,comparisonError='';
 if(context&&left&&right)try{comparison=compareSavedCapacity(left,right,context,bucket.scopes);}catch(error){comparisonError=error instanceof Error?error.message:'These records could not be compared.';}
 const costComparison=comparison&&'costComparison' in comparison?comparison.costComparison:undefined;
 const openingDifferences=comparison?.assumptionDifferences.filter(change=>change.path.startsWith('opening.')).length??0;
 const monthDifferences=(comparison?.assumptionDifferences.length??0)-openingDifferences;
 const scope=left&&bucket.scopes.find(s=>s.id===left.record.binding.scopeId);
 const isCurrent=Boolean(left&&scope&&context&&session.scope?.id===scope.id&&capacityRecordIsCurrent(left.record,capacityBinding(context,scope),session.draft));
 const disabled=!context||!storage.saved||!!loadError||!session.capture?.binding||session.result?.status!=='calculated';
 const saveError=actionError||loadError||(!storage.saved?(storage.notice||'Browser storage is unavailable. Resolve Browser storage details, then retry explicitly. Your draft is kept.'):'');
 const comparisonStatus=comparisonError|| (comparison&&!comparison.compatible?comparison.reason:comparison?.compatible&&left&&right?`Comparing ${left.record.name} with ${right.record.name}. Monthly FTE gaps are shown below; positive is shortfall, negative is surplus.`:'');
 const options=bucket.entries.map(e=><option key={e.record.id} value={e.record.id}>{e.record.name}</option>);
 return <section aria-label="Saved capacity scenarios" className="space-y-3 border-t pt-4">
  <h3 className="font-semibold">Save &amp; compare</h3>
  <p className="text-xs text-muted-foreground">Drafts are not saved automatically: they survive navigation but clear on reload or dataset change.</p>
  {!goalId?<><p className="text-sm text-muted-foreground">Session only. Choose a goal to save scenarios; no goal is created automatically.</p>{carriedGoalActions&&<CarriedPlanningGoal key={carriedGoalActions.businessGoal} actions={carriedGoalActions}/>}</>:<>
   <div className="flex flex-wrap items-end gap-2">
    <label className="min-w-0 flex-1 text-sm">Scenario name<input aria-label="Capacity scenario name" maxLength={160} value={name} onChange={e=>{setName(e.target.value);setActionError('');}} className={`${control} mt-1 w-full`} placeholder="e.g. Base workload"/></label>
    <button type="button" disabled={disabled} onClick={save} className={`${control} disabled:opacity-50`}>Save scenario</button>
   </div>
   <p className="text-xs text-muted-foreground">Calculate complete capacity inputs, then save a new named scenario in this browser under the selected goal. Cost rate is optional.</p>
   <p role="alert" aria-atomic="true" className={saveError?'text-sm text-destructive':'sr-only'}>{saveError}</p>
   <p role="status" aria-atomic="true" className={notice?'text-sm':'sr-only'}>{notice}</p>
   <p role="status" aria-atomic="true" className={comparisonStatus?'text-sm':'sr-only'}>{comparisonStatus}</p>
   {bucket.entries.length>0&&<>
    <div className="flex flex-wrap items-end gap-2">
     <label className="min-w-0 flex-1 text-sm">Saved scenario<select aria-label="Saved capacity scenario" value={leftId} onChange={e=>{setLeftId(e.target.value);setRightId('');setNotice('');setActionError('');}} className={`${control} mt-1 w-full`}><option value="">Choose a scenario</option>{options}</select></label>
     <button type="button" disabled={!left||!storage.saved} onClick={open} className={`${control} disabled:opacity-50`}>Open saved scenario</button>
    </div>
    <p className="text-xs text-muted-foreground">Opening replaces the current draft. Open an existing scenario before varying the same workload. {left&&(isCurrent?'Selected saved scenario matches current inputs.':'Selected scenario is a saved snapshot, not the current draft.')}</p>
    {left&&<label className="block text-sm">Compare with<select aria-label="Compare capacity scenario" value={rightId} onChange={e=>setRightId(e.target.value)} className={`${control} mt-1 w-full`}><option value="">Choose another saved scenario</option>{bucket.entries.filter(e=>e.record.id!==leftId).map(e=><option key={e.record.id} value={e.record.id}>{e.record.name}</option>)}</select></label>}
    {comparison?.compatible&&left&&right&&<div role="region" aria-label="Saved capacity comparison" tabIndex={0} className="overflow-x-auto">
     <p className="mb-2 break-words text-sm">{scope?.label} · Opening {left.record.inputs.opening.asOf} · {left.record.inputs.months.length} planning months. Comparing saved snapshots; current draft edits are excluded.</p>
     <CapacityAssumptionChanges left={{name:left.record.name,draft:left.draft}} right={{name:right.record.name,draft:right.draft}}/>
     <table className="w-full text-left text-sm"><caption className="mb-2 text-left">Capacity balance by month</caption><thead><tr><th scope="col" className="p-2">Month</th><th scope="col" className="p-2">{left.record.name}</th><th scope="col" className="p-2">{right.record.name}</th></tr></thead><tbody>{left.record.result.points.map((p,i)=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th><td className="p-2">{gap(p.gapFte)}</td><td className="p-2">{gap(right.record.result.points[i].gapFte)}</td></tr>)}</tbody></table>
     {costComparison&&<details className="mt-3 border-t"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Contracted supply cost comparison</summary>
      <p className="mb-2 text-xs text-muted-foreground">User-assumed USD per contracted FTE per month: {left.record.name} {formatCapacityCost(costComparison.leftRateCents)}; {right.record.name} {formatCapacityCost(costComparison.rightRateCents)}. Blank and older scenarios have unknown cost.</p>
      <table className="w-full text-left text-sm"><caption className="mb-2 text-left">Monthly supply run-rate (USD/month) · right minus left, not savings</caption><thead><tr>{['Month',left.record.name,right.record.name,'Difference (USD/month)'].map((label,i)=><th key={i} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{costComparison.points.map(p=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th><td className="p-2">{formatCapacityCost(p.leftCents)}</td><td className="p-2">{formatCapacityCost(p.rightCents)}</td><td className="p-2">{p.deltaCents!==null&&p.deltaCents>0?'+':''}{formatCapacityCost(p.deltaCents)}</td></tr>)}</tbody></table>
     </details>}
     <p className="mt-2 text-xs text-muted-foreground">Opening assumption differences: {openingDifferences}. Month-level assumption differences: {monthDifferences}. A recurring change counts once per month. These are saved scenarios, not a forecast.</p>
    </div>}
   </>}
  </>}
 </section>;
}
