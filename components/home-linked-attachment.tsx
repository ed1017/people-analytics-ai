"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {bundleInputKey,type BundleDraft,type BundleResult} from '@/lib/home-bundle-reconciliation';
import {previewLinkedAttachment,commitLinkedAttachment,type ProjectPlanningBinding,type LinkedAttachmentPreview,type LinkedAttachmentRequest} from '@/lib/home-linked-attachment';
import type {ApplicationChoices} from '@/lib/action-plan-application-preview';
import {readWorkforceSolution} from '@/lib/workforce-solution';
import {DECISIONS_STORAGE_KEY} from '@/lib/local-decisions';
import {labelFor,display} from '@/components/home-action-plan-application';
import type {DevelopmentSession} from '@/components/development-workspace';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring',control='min-h-11 w-full rounded border bg-background px-2 text-sm';
type Props={preparedAt:string;draft:BundleDraft;result:BundleResult;replaceId:string|null;reviewed:boolean;acknowledgeUnknowns:boolean;disabled:boolean;isCurrent:()=>boolean;projectBinding:ProjectPlanningBinding;onClose:()=>void;onComplete:(changes:number)=>void};
export function HomeLinkedAttachment(props:Props){
 const storage=useDecisionStorage(),fields=storage.data.workspaces[props.draft.binding.goalId]?.fields??{},development=fields.development as DevelopmentSession|undefined,solution=readWorkforceSolution(fields.workforceSolution);
 const [stamp]=useState(()=>({attachmentId:crypto.randomUUID(),at:new Date().toISOString()}));
 const eligible=props.draft.bundle.components.filter(component=>['learning','manager_workload'].includes(component.domain));
 const [componentId,setComponentId]=useState(()=>eligible.filter(item=>item.domain==='learning').length===1?eligible.find(item=>item.domain==='learning')!.id:eligible.length===1?eligible[0].id:'');
 const [optionIndex,setOptionIndex]=useState(()=>{const matches=development?.options?.map((item,index)=>({item,index})).filter(({item})=>item.quote.id===development.selected)??[];return matches.length===1?String(matches[0].index):'';});
 const [quoteReviewed,setQuoteReviewed]=useState(false),[hourlyReviewed,setHourlyReviewed]=useState(false),[capacityReviewed,setCapacityReviewed]=useState(true),[choices,setChoices]=useState<ApplicationChoices>({});
 const [preview,setPreview]=useState<{key:string;value:LinkedAttachmentPreview}|null>(null),[busy,setBusy]=useState(false),[committing,setCommitting]=useState(false),[notice,setNotice]=useState('');
 const request:LinkedAttachmentRequest={...stamp,preparedAt:props.preparedAt,draft:props.draft,result:props.result,replaceId:props.replaceId,reviewed:props.reviewed,acknowledgeUnknowns:props.acknowledgeUnknowns,development:componentId&&optionIndex!==''?{componentId,optionIndex:Number(optionIndex),quoteReviewed,hourlyReviewed}:null,capacityReviewed};
 const key=JSON.stringify([bundleInputKey(props.draft),storage.data.revision,request.development,capacityReviewed,props.reviewed,props.acknowledgeUnknowns,choices]),live=useRef({props,key,request,choices}),mounted=useRef(true),pending=useRef(false);
 useLayoutEffect(()=>{live.current={props,key,request,choices};});
 useEffect(()=>{mounted.current=true;const changed=(event:StorageEvent)=>{if(event.key===null||event.key===DECISIONS_STORAGE_KEY)decisionStore.invalidateExternalChange();};window.addEventListener('storage',changed);return()=>{mounted.current=false;window.removeEventListener('storage',changed);};},[]);
 useEffect(()=>{
  let cancelled=false;const current=live.current;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- A user-opened attachment review recomputes local fields after explicit review/choice changes.
  setBusy(true);setNotice('');
  if(!current.props.disabled&&current.props.isCurrent())void previewLinkedAttachment(decisionStore,current.request,current.choices,current.props.projectBinding).then(value=>{if(!cancelled&&mounted.current&&live.current.key===key&&live.current.props.isCurrent())setPreview({key,value});}).catch(error=>{if(!cancelled&&mounted.current)setNotice((error as Error).message);}).finally(()=>{if(!cancelled&&mounted.current)setBusy(false);});else {setBusy(false);setNotice('Current plan or evidence needs review before attachment.');}
  return()=>{cancelled=true;};
 },[key,props.disabled]);
 const current=preview?.key===key?preview.value:null;
 async function commit(){
  if(pending.current||!current||props.disabled||!props.isCurrent())return;pending.current=true;setCommitting(true);setNotice('');
  try{await commitLinkedAttachment(decisionStore,current,choices,props.projectBinding,()=>mounted.current&&live.current.key===key&&!live.current.props.disabled&&live.current.props.isCurrent(),crypto.randomUUID());props.onComplete(current.application.selectedChanges.length);}
  catch(error){if(mounted.current)setNotice((error as Error).message);}finally{pending.current=false;if(mounted.current)setCommitting(false);}
 }
 const rows=current?.application.rows.filter(row=>row.proposed!==null&&!['read-only','blocked'].includes(row.status)&&(JSON.stringify(row.current)!==JSON.stringify(row.proposed)||current.manualConflicts.includes(row.destination)))??[];
 const omitted=current?.application.rows.filter(row=>!rows.includes(row))??[];
 return <section aria-label="Review attachment and planning fields" className="space-y-3 rounded border border-primary/50 p-3 text-sm">
  <h4 className="font-semibold">Resolve planning-field conflict</h4>
  <p className="text-xs">Choose which values to keep. Your manual changes are preserved by default.</p>
  {development?.options?.length? <><div className="grid gap-2 sm:grid-cols-2"><label>Plan component<select className={control} aria-label="Linked plan component" disabled={committing} value={componentId} onChange={event=>{setComponentId(event.target.value);setQuoteReviewed(false);setHourlyReviewed(false);setChoices({});}}><option value="">Choose</option>{eligible.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Existing Development option<select className={control} aria-label="Linked Development option" disabled={committing} value={optionIndex} onChange={event=>{setOptionIndex(event.target.value);setQuoteReviewed(false);setHourlyReviewed(false);setChoices({});}}><option value="">Choose</option>{development.options.map((option,index)=><option key={index} value={index}>Option {index+1}: {option.quote.provider}</option>)}</select></label></div>{componentId&&optionIndex!==''&&<><label className="flex gap-2 text-xs"><input type="checkbox" checked={quoteReviewed} disabled={committing} onChange={event=>setQuoteReviewed(event.target.checked)}/>I reviewed this existing quote for the selected component, population, horizon, currency and fee basis.</label></>}</>:<p className="text-xs">No compatible Development quote option is selected. No provider, quote or training cost will be created.</p>}
  {solution&&props.draft.inputs.capacity?<label className="flex gap-2 text-xs"><input type="checkbox" checked={capacityReviewed} disabled={committing} onChange={event=>setCapacityReviewed(event.target.checked)}/>I reviewed the existing workforce plan and these additional-capacity assumptions for the same goal and scope.</label>:<p className="text-xs">No compatible additional-capacity destination is available for this plan.</p>}
  {busy&&<p role="status">Checking compatible fields…</p>}
  {current&&<><div aria-label="Linked field changes" className="space-y-3">{rows.map(row=><div key={row.destination} className="grid gap-2 border-t pt-2 sm:grid-cols-[1fr_9rem]"><div><strong>{labelFor(row.destination)}</strong><p>{display(row.current)} → {display(row.proposed)}</p><p className="text-xs">{row.unit} · {[...new Set(row.provenance.map(item=>item.kind))].join(', ')}</p>{current.manualConflicts.includes(row.destination)?<p className="text-xs">Changed since this plan last wrote it. Preserve or explicitly replace.</p>:row.conflict&&row.status==='preserved'?<p className="text-xs">Existing value differs. Preserved unless you choose Replace.</p>:null}</div><label className="text-xs">Choice<select className={control} aria-label={`${labelFor(row.destination)} linked field choice`} disabled={committing} value={current.choices[row.destination]??'preserve'} onChange={event=>setChoices(previous=>({...previous,[row.destination]:event.target.value as ApplicationChoices[string]}))}><option value="preserve">Preserve</option><option value="fill-empty">Fill empty</option><option value="replace">Replace</option></select></label></div>)}</div>
   {omitted.length>0&&<details><summary className="min-h-11 cursor-pointer py-2 text-xs">Unchanged or unavailable fields ({omitted.length})</summary>{omitted.map(row=><p key={row.destination} className="my-1 text-xs">{labelFor(row.destination)}: {row.reason??row.status}.</p>)}</details>}
   <p>{current.application.selectedChanges.length} planning fields will change with this attachment. Previous attached versions stay in history.</p>{current.application.blockers.map(message=><p key={message} role="alert" className="text-xs">{message}</p>)}
  </>}
  {notice&&<p role="alert">{notice}</p>}
  <div className="flex flex-wrap gap-2"><button className={button+' bg-primary text-primary-foreground'} disabled={busy||committing||props.disabled||!current||!!current?.application.blockers.length} onClick={()=>void commit()}>{props.replaceId?'Save reviewed plan and linked fields':'Confirm attachment'}</button><button className={button} disabled={committing} onClick={props.onClose}>Cancel attachment review</button></div>
  <p className="text-xs">One local save. Destination calculations remain explicit. Source data and catalogue scenarios are read-only; unsupported fields stay unchanged.</p>
 </section>;
}
