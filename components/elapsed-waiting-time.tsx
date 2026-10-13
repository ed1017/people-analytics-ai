'use client';
import {useEffect,useState} from 'react';

/** Mount only for a pending request; key by its start time to reset on replacement. */
export function ElapsedWaitingTime({startedAt}:{startedAt:number}){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{
  // Measure the clock instead of counting ticks: background tabs can throttle timers.
  const timer=setInterval(()=>setSeconds(Math.max(0,Math.floor((performance.now()-startedAt)/1000))),1000);
  return()=>clearInterval(timer);
 },[startedAt]);
 return <span role="timer" aria-live="off" className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">Elapsed {seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${seconds%60}s`}</span>;
}
