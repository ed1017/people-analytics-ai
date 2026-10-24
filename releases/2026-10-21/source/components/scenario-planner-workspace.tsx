'use client';
import type {ReactNode} from 'react';
/** This toggle changes visibility only. Children remain mounted to preserve edits. */
export function ScenarioPlannerWorkspace({active,hasResult,children}:{active:boolean;hasResult:boolean;children:ReactNode}){
 return <details open className="min-w-0 space-y-3"><summary hidden={!active&&!hasResult} className="min-h-11 cursor-pointer py-2 font-semibold">Scenario planner</summary>
  {active&&!hasResult&&<p className="text-sm">Your draft is ready to refine. Send it to review staffing options, or enter explicit monthly hires, exits and a horizon for a headcount projection.</p>} {children}
 </details>;
}
