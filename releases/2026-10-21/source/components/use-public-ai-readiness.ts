'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {publicAiReadiness} from '@/lib/public-ai-readiness-client.mjs';
export {publicAiReadiness} from '@/lib/public-ai-readiness-client.mjs';
export function usePublicAiReadiness(route:string){
 const token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,datasetSession.snapshot);
 const receipt=useSyncExternalStore(publicAiReadiness.subscribe,publicAiReadiness.snapshot,()=>null);
 useEffect(()=>{
  if(!receipt||receipt.status!=='configured')return;
  // Renew configuration only while a consumer is mounted and visible. Server admission still guards every paid round.
  const timer=setTimeout(()=>{if(document.visibilityState==='visible')void publicAiReadiness.refresh();},Math.max(1000,Date.parse(receipt.expiresAt)-Date.now()-5000));
  return()=>clearTimeout(timer);
 },[receipt,token]);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')void publicAiReadiness.refresh();};
  void publicAiReadiness.refresh();
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[token]);
 return publicAiReadiness.available(route);
}
