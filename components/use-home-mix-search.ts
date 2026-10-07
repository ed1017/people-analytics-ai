'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import {createHomeMixOrchestration,homeMixRequestKey,type HomeMixAdapter,type HomeMixRequest,type HomeMixTrigger,type HomeMixState} from '@/lib/home-mix-orchestration';

/** No persistence or application side effects: a verified result remains a proposed option. */
export function useHomeMixSearch<Source,Report>({adapter,request,trigger,enabled,isCurrent,debounceMs=250}:{
 adapter:HomeMixAdapter<Source,Report>;
 request:HomeMixRequest<Source>|null;
 trigger:HomeMixTrigger;
 enabled:boolean;
 isCurrent:()=>boolean;
 debounceMs?:number;
}):HomeMixState<Report>{
 // The adapter is an injected stable module interface, never a render-time callback object.
 const coordinator=useMemo(()=>createHomeMixOrchestration(adapter,{debounceMs}),[adapter,debounceMs]);
 let key:string|null=null;
 try{if(request)key=homeMixRequestKey(adapter.version,request);}catch{key='invalid-input';}
 let available=false;
 try{available=enabled&&isCurrent();}catch{/* A stale or unavailable context cannot expose a candidate. */}
 const live=useRef({request,isCurrent});
 useLayoutEffect(()=>{live.current={request,isCurrent};});
 const state=useSyncExternalStore(coordinator.subscribe,coordinator.getSnapshot,coordinator.getServerSnapshot);
 // Compare, Attach and explanation renders keep the same source and do not cancel it.
 useLayoutEffect(()=>()=>coordinator.invalidate(),[coordinator,available,key]);
 useEffect(()=>{
  if(!available||!key){coordinator.invalidate();return;}
  const current=live.current;
  if(current.request)void coordinator.run({trigger,request:current.request,isCurrent:()=>live.current.isCurrent()});
 },[coordinator,available,key,trigger]);
 // invalidate (not dispose) supports React's development setup/cleanup/setup cycle.
 useEffect(()=>()=>coordinator.invalidate(),[coordinator]);
 return !available||state.key!==key?{status:'idle',key:null}:state;
}
