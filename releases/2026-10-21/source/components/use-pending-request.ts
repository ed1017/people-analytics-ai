'use client';
import {useCallback,useState,type SetStateAction} from 'react';

/** Keep the request's start time with its pending state, including batched restarts. */
export function usePendingRequest(){
 const [startedAt,setStartedAt]=useState<number|null>(null);
 const setPending=useCallback((value:SetStateAction<boolean>)=>{
  const now=performance.now();
  setStartedAt(previous=>{
   const pending=typeof value==='function'?value(previous!==null):value;
   return pending?previous??now:null;
  });
 },[]);
 return {pending:startedAt!==null,setPending,startedAt};
}
