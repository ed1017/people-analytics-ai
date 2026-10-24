'use client';
import type {ReactNode} from 'react';
import {InteractivePlanner} from './interactive-planner';
/** This toggle changes visibility only. Children remain mounted to preserve edits. */
export function ScenarioPlannerWorkspace({active,hasResult,children}:{active:boolean;hasResult:boolean;children:ReactNode}){
 return <details open className="min-w-0 space-y-3"><summary hidden={!active&&!hasResult} className="min-h-11 cursor-pointer py-2 font-semibold">Scenario planner</summary>
  {active&&!hasResult&&<InteractivePlanner scope="Your current question · assumptions not yet calculated" outcome="Start with what you know; compare options after reviewing the inputs."
   metrics={[{label:'Required capacity',value:'Not assessed'},{label:'Available capacity',value:'Not assessed'},{label:'Gap',value:'Not assessed'},{label:'Cost',value:'Not assessed'}]}
   levers={<p className="text-sm">Enter or adjust the scope, quantity and timing in chat. Budget is optional. Your draft stays editable; choose Send when ready.</p>}
   visual={<p role="status" className="text-sm">The matching calculator will show supported results here. Unknown capacity is not zero, and no example assumptions have been adopted.</p>}/>} {children}
 </details>;
}
