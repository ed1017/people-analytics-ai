'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {publicAiReadiness} from '@/lib/public-ai-readiness-client.mjs';
export {publicAiReadiness} from '@/lib/public-ai-readiness-client.mjs';
export function usePublicAiReadiness(route:string){
 const token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,datasetSession.snapshot);
 useSyncExternalStore(publicAiReadiness.subscribe,publicAiReadiness.snapshot,()=>null);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')void publicAiReadiness.refresh();};
  void publicAiReadiness.refresh();
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[token]);
 return publicAiReadiness.available(route);
}
