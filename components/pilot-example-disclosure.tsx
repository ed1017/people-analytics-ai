'use client';
import {useState} from 'react';
import {standalonePilotLifecycle} from '@/lib/pilot-lifecycle-example';
import {PilotLifecycleView} from './pilot-lifecycle-view';
/** Always available; opening the example has no goal, storage, progress or transport callbacks. */
export function PilotExampleDisclosure(){
 const [open,setOpen]=useState(false);
 return <details className="min-w-0 text-sm" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary className="min-h-11 cursor-pointer py-2 text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">View fictional pilot example</summary>
  {open?<StandalonePilot/>:null}
 </details>;
}
function StandalonePilot(){
 const [record]=useState(standalonePilotLifecycle);
 return <div className="pb-3"><PilotLifecycleView record={record} goal={record.goal} standalone/></div>;
}
