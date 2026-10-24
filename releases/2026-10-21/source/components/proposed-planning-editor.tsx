'use client';
import {useEffect,useRef,useState} from 'react';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import type {PlanningInputChange} from '@/lib/home-solution-conversation';
import {proposedPlanningInputs,proposedPlanningEstimate,type PlanningRange} from '@/lib/home-proposed-planning';
import {PlanningAssumptionSlider} from './planning-assumption-slider';
import {InteractivePlanner} from './interactive-planner';
const number=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
const range=(r:PlanningRange|null)=>r?(r.min===r.max?number(r.min):`${number(r.min)}–${number(r.max)}`):'Unknown';
/** Preview uses the same evaluator as an explicit revision. It never saves the original. */
export function ProposedPlanningEditor({draft,comparisonDraft,disabled,onReview,onPreview,onDirtyChange,values:controlledValues,onValuesChange,title='Adjust this action plan'}:{comparisonDraft?:BundleDraft;title?:string;values?:string[];onValuesChange?:(values:string[])=>void;inline?:boolean;draft:BundleDraft;disabled:boolean;onDirtyChange:(dirty:boolean)=>void;onReview:(changes:PlanningInputChange[])=>Promise<void>;onPreview:(changes:PlanningInputChange[])=>Promise<BundleDraft>}){
 const rows=proposedPlanningInputs(draft),[localValues,setValues]=useState(()=>rows.map(row=>row.assumption.value===null?'':String(row.assumption.value))),values=controlledValues??localValues;
 const updateValues=(next:string[])=>{if(onValuesChange)onValuesChange(next);else setValues(next);onDirtyChange(rows.some((row,index)=>(next[index].trim()===''?null:Number(next[index]))!==row.assumption.value));};
 const changes=rows.flatMap((row,index)=>{const value=values[index].trim()===''?null:Number(values[index]);return value===row.assumption.value?[]:[{field:row.field,target:row.target,value}];});
 const valid=rows.every((row,index)=>values[index].trim()===''||(Number.isFinite(Number(values[index]))&&Number(values[index])>=0&&(row.field!=='horizon_months'||Number.isInteger(Number(values[index]))&&Number(values[index])>=1&&Number(values[index])<=24)&&(row.field!=='participants'||Number.isInteger(Number(values[index])))));
 const key=JSON.stringify(values),previewRef=useRef(onPreview);useEffect(()=>{previewRef.current=onPreview;},[onPreview]);
 const [preview,setPreview]=useState<{key:string;draft:BundleDraft}|null>(null),[failure,setFailure]=useState<{key:string;message:string}|null>(null);const error=failure?.key===key?failure.message:'';
 useEffect(()=>{let live=true;if(!changes.length||!valid||disabled)return;
  const timer=setTimeout(()=>{void previewRef.current(changes).then(value=>{if(live)setPreview({key,draft:value});}).catch(reason=>{if(live)setFailure({key,message:reason instanceof Error?reason.message:'Unable to calculate this adjustment.'});});},180);
  return ()=>{live=false;clearTimeout(timer);};
 // The serialized values identify this revision's entire edit, including unknowns.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,valid,disabled]);
 const baseline=proposedPlanningEstimate(comparisonDraft??draft,true)??proposedPlanningEstimate(draft,true)!,current=proposedPlanningEstimate(changes.length&&preview?preview.draft:draft,true)!,pending=changes.length>0&&preview?.key!==key;
 const chart=[{label:comparisonDraft?'Previous revision':'Original plan',value:baseline.hours},{label:'Adjusted plan',value:current.hours}],maximum=Math.max(1,...chart.map(row=>row.value?.max??0));
 return <InteractivePlanner compact scope="Action-plan scenario · whole-plan effort" outcome={title}
  metrics={[{label:'Duration',value:current.months===null?'Unknown':`${number(current.months)} months`},{label:'Participants',value:range(current.participants)},{label:'Planned effort',value:`${range(current.hours)} hours`},{label:'Incremental allowance',value:current.cash===null?'Unknown':`$${number(current.cash)} USD`}]}
  levers={<div className="space-y-3">{rows.map((row,index)=><PlanningAssumptionSlider key={row.field+row.target} label={row.field==='cash'?'Incremental allowance':row.label} value={values[index]} disabled={disabled} onChange={value=>updateValues(values.map((old,i)=>i===index?value:old))} spec={{min:row.field==='horizon_months'?1:0,max:row.field==='horizon_months'?24:row.field==='hours_per_participant'?1000:1000000,extent:row.field==='horizon_months'?24:row.field==='cash'?1000:100,precision:row.field==='horizon_months'||row.field==='participants'?0:6,keyboardStep:1,unit:row.unit==='hours/person/total'?'hours/person':row.unit==='hours/total'?'hours':row.unit,preservePrecision:row.field!=='horizon_months'&&row.field!=='participants'}}/>)}</div>}
  visual={<section aria-label="Plan effort comparison" className="space-y-4"><h4 className="font-semibold">Estimated effort · hours</h4>{chart.map(row=><div key={row.label}><div className="flex justify-between gap-2 text-sm"><span>{row.label}</span><strong>{range(row.value)}</strong></div>{row.value&&<div aria-hidden="true" className="mt-2 h-4 rounded bg-muted"><div className="h-4 rounded bg-primary" style={{width:`${row.value.max/maximum*100}%`}}/></div>}</div>)}<p className="text-xs text-muted-foreground">Whole-plan effort, not a forecast of proficiency. Ranges retain unresolved participant overlap. Labor cost is unknown.</p>{(pending||!valid||error)&&<p role="status">{error||(!valid?'Finish a valid input to recalculate.':'Recalculating…')} Previous calculation remains visible.</p>}</section>}
  actions={<><button type="button" className="min-h-11 rounded border px-3 text-sm font-medium disabled:opacity-50" disabled={disabled||!valid||pending||!!error||!changes.length} onClick={()=>void onReview(changes)}>Apply as revised proposal</button><button type="button" className="min-h-11 rounded border px-3 text-sm font-medium" disabled={disabled||!changes.length} onClick={()=>updateValues(rows.map(row=>row.assumption.value===null?'':String(row.assumption.value)))}>Reset to original</button></>}
  assumptions="Adjustments are unverified planning assumptions. Applying creates a revision; saving remains separate. The allowance excludes unknown labor cost."/>;
}
