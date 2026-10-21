'use client';
import {useLayoutEffect,useState,useSyncExternalStore} from 'react';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {publicAiFetch} from '@/lib/public-ai-readiness-client.mjs';
import {decisionStore} from './decision-store';
import {HomeProjectionSelection,type HomeProjectionContext} from '@/lib/home-projection-selection';

export function useHomeProjection(context:HomeProjectionContext){
  const [selection]=useState(()=>new HomeProjectionSelection(()=>context,publicAiFetch));
  useLayoutEffect(()=>{selection.setContext(()=>{
    const live=context,store=decisionStore.getSnapshot();
    const goal=store.data.goals.goals.find(item=>item.id===store.data.goals.activeId);
    return {...live,enabled:live.enabled&&store.ready&&store.saved&&goal?.id===live.goal.id&&goal.statement===live.goal.statement&&datasetSession.snapshot()===live.datasetToken};
  });});
  const view=useSyncExternalStore(selection.subscribe,selection.snapshot,selection.snapshot);
  useLayoutEffect(()=>{
    const stopStore=decisionStore.subscribe(selection.invalidate),stopDataset=datasetSession.subscribe(selection.invalidate);
    return()=>{stopStore();stopDataset();selection.invalidate();};
  },[selection]);
  useLayoutEffect(()=>{selection.invalidate();},[selection,context.key]);
  return {show:(id:string,revision:number)=>selection.show(id,revision),requested:view.requested,
    status:view.key===context.key&&context.enabled?view.status:'unavailable',
    value:view.key===context.key&&context.enabled?view.value:null};
}
