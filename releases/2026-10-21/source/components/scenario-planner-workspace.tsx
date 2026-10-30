"use client";
import type {ReactNode} from 'react';
export type ScenarioPlannerSource='inputs'|'positions';
/** Mode and disclosure changes preserve both editors; each keeps its own typed draft. */
export function ScenarioPlannerWorkspace({active,hasResult,children,source='inputs',onSourceChange,positionContent}:{active:boolean;hasResult:boolean;children:ReactNode;source?:ScenarioPlannerSource;onSourceChange?:(source:ScenarioPlannerSource)=>void;positionContent?:ReactNode}){
 return <details open className="min-w-0 space-y-3" data-shared-scenario-planner><summary hidden={!active&&!hasResult&&!positionContent} className="min-h-11 cursor-pointer py-2 font-semibold">Scenario planner</summary>
  {positionContent&&<div role="group" aria-label="Scenario input source" className="flex flex-wrap gap-2">{(['inputs','positions'] as const).map(value=><button key={value} type="button" aria-pressed={source===value} onClick={()=>onSourceChange?.(value)} className={'min-h-11 rounded-lg border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring '+(source===value?'bg-primary text-primary-foreground':'bg-card')}>{value==='inputs'?'Staffing assumptions':'Inventory positions'}</button>)}</div>}
  <div hidden={source==='positions'}>{active&&!hasResult&&<p className="text-sm">Choose planning inputs to compare staffing options.</p>}{children}</div>
  {positionContent&&<div hidden={source!=='positions'}>{positionContent}</div>}
 </details>;
}
