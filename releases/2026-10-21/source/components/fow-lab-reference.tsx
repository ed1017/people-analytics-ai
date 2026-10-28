"use client";
import {useState,useSyncExternalStore} from 'react';
import {decisionStore,useDecisionStorage} from './decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {canonicalFoWLabReference,fowLabReferenceField,readFoWLabReference,saveFoWLabReference,type FoWLabSelection} from '@/lib/fow-lab-reference';
import type {AppPage} from '@/lib/types';

const control='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
export function FoWLabReferenceHandoff({functionName,jobKey,onNavigate}:FoWLabSelection&{onNavigate:(page:AppPage)=>void}){
 const storage=useDecisionStorage(),token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,datasetSession.snapshot),[error,setError]=useState('');
 const goal=storage.data.goals.goals.find(item=>item.id===storage.data.goals.activeId);
 let selectionError='';try{canonicalFoWLabReference({functionName,jobKey});}catch(e){selectionError=e instanceof Error?e.message:'Review the Lab selection.';}
 function save(){try{if(!goal){onNavigate('home');return;}saveFoWLabReference({store:decisionStore,datasetToken:token,goalId:goal.id,goal:goal.statement,revision:storage.data.revision,selection:{functionName,jobKey},at:new Date().toISOString()});setError('');onNavigate('planning-overview');}catch(e){setError(e instanceof Error?e.message:'Reference could not be saved.');}}
 return <section aria-label="Carry Lab reference" className="space-y-2 rounded border p-3"><p className="text-sm">Save this Lab selection as a reference. Enter workload, hours per item, available time and timing separately in Scenarios.</p><button type="button" className={control} disabled={!storage.ready||Boolean(selectionError)||Boolean(goal&&!storage.saved)} onClick={save}>{goal?'Save reference and open Scenarios':'Select a goal on Overview'}</button>{(error||selectionError)&&<p role="alert" className="text-sm">{error||selectionError}</p>}</section>;
}
export function SavedFoWLabReference({goalId}:{goalId?:string}={}){
 const storage=useDecisionStorage(),token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,datasetSession.snapshot),[error,setError]=useState('');
 const id=goalId??storage.data.goals.activeId,goal=storage.data.goals.goals.find(item=>item.id===id),raw=storage.data.workspaces[id]?.fields[fowLabReferenceField];
 if(!goal||!raw)return null;
 const reference=readFoWLabReference(raw,{goalId:id,goal:goal.statement,datasetToken:token});
 function remove(){try{saveFoWLabReference({store:decisionStore,datasetToken:token,goalId:id,goal:goal!.statement,revision:storage.data.revision,selection:null,at:new Date().toISOString()});setError('');}catch(e){setError(e instanceof Error?e.message:'Reference could not be removed.');}}
 return <section aria-label="Saved FoW Lab reference" className="space-y-2 rounded border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">FoW Lab reference{reference?' · '+(reference.selection.jobTitle??reference.selection.functionName??'All functions'):''}</h3><button type="button" className={control} disabled={!storage.saved||id!==storage.data.goals.activeId} onClick={remove}>Remove Lab reference</button></div>{reference?<><p>Reference only; capacity inputs stay unchanged.</p><details><summary className="min-h-11 cursor-pointer py-2">Lab reference details</summary><p>{reference.source.dataset.scopeLabel} · as of {reference.source.dataset.asOf}. This is not the app’s 9,037-person, 8-business-unit workforce.</p><p>{reference.selection.functionName??'All functions'}{reference.selection.jobKey?' · '+reference.selection.jobKey:''}</p><p>Dataset {reference.source.dataset.id} · {reference.source.version} · source commit {reference.source.sourceCommit} · exported {reference.source.exportedAt}</p><p>{reference.planningStatus}</p></details></>:<p role="status">This saved Lab reference is unavailable for the current goal or catalog version. Its history is retained.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
