'use client';
import {useState} from 'react';
import type {BusinessPlanning} from '@/lib/home-business-planning';
import {PlanningAssumptionSlider} from './planning-assumption-slider';
export function StaffingMixControls({state,disabled,onChange}:{state:BusinessPlanning;disabled:boolean;onChange:(mix:{build:number;move:number;buy:number}|null)=>void}){
 const [error,setError]=useState(''),staffing=state.staffing,gap=state.review.result.additionalRoles;
 if(!staffing||staffing.result.status!=='calculated'||gap===null||gap<1||!staffing.result.options.length)return null;
 const v=staffing.inputs.values,eligible=v.internalPoolsDistinct.value===true&&v.internalRelease.value===true&&v.backfills.value!==null;
 const mix=staffing.selectedMix??staffing.result.options[0].mix;
 const maxBuild=eligible?Math.min(Number(v.buildMax.value??0),gap-mix.move):0,maxMove=eligible?Math.min(Number(v.moveMax.value??0),gap-mix.build):0;
 function change(path:'build'|'move',text:string){try{
  if(!/^\d+$/.test(text))throw Error('Enter a whole-role allocation; pool limits and the total gap still apply.');
  const next={...mix,[path]:Number(text)};next.buy=gap!-next.build-next.move;
  onChange(next);setError('');
 }catch(e){setError(e instanceof Error?e.message:'This mix could not be calculated.');}}
 return <section aria-label="Adjust staffing mix" className="space-y-2 rounded border p-2">
  <h4 className="font-semibold">Adjust this mix</h4>
  <p className="text-xs">{staffing.selectedMix?'Your adjusted mix':'First displayed option'} · {gap} additional roles · 1 FTE each.</p>
  {(['build','move'] as const).map(path=><PlanningAssumptionSlider key={path} label={path==='build'?'Develop roles':'Redeploy roles'} value={String(mix[path])} spec={{min:0,max:path==='build'?maxBuild:maxMove,precision:0,keyboardStep:1,extent:path==='build'?maxBuild:maxMove,unit:'whole roles'}} disabled={disabled||!eligible||(path==='build'?maxBuild:maxMove)===0} onChange={text=>change(path,text)}/>)}
  <p><strong>Hire remaining: {mix.buy}</strong></p>
  {!eligible&&<p className="text-xs">Internal allocations need explicit distinct pools, release and backfill assumptions. Missing availability is not zero capacity.</p>}
  <button type="button" className="min-h-11 rounded border px-3 text-sm disabled:opacity-50" disabled={disabled||!staffing.selectedMix} onClick={()=>{try{onChange(null);setError('');}catch(e){setError((e as Error).message);}}}>Reset to comparison</button>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
