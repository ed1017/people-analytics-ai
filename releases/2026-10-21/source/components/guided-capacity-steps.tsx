"use client";
import {SimpleSwpDemo} from './simple-swp-demo';
import {swpTradeoffOptions, type compareSwpDemo} from '@/lib/swp-demo';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';

type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
const noEdit=()=>{};
/** The tutorial locks actions on the real planner, not a separate simulated comparison. */
export function GuidedCapacitySteps({forcedChoice=false,draft,comparison,selection,reviewing,disabled,pending,onCalculate,onSelect,onPrepare}:{forcedChoice?:boolean;draft:BundleDraft;comparison:Comparison|null;selection:string|null;reviewing:boolean;disabled:boolean;pending:boolean;onCalculate:()=>void;onSelect:(id:string)=>void;onPrepare:()=>void}){
 const step=reviewing?4:comparison?3:2;
 const prescribedAvailable=!forcedChoice||!comparison||swpTradeoffOptions(comparison.evaluation).some(option=>option.candidate.status==='met'&&option.candidate.mix.build===3&&option.candidate.mix.move===2&&option.candidate.mix.buy===0);
 return <section aria-label="Required guided demo actions" className="space-y-4">
  <p className="text-sm font-semibold" role="status">Step {step} of 4: {reviewing?'Review the proposal before saving':comparison?'Choose the lowest-cash option for this exercise':'Compare the fixed example assumptions'}</p>
  <progress aria-label="Guided demo progress" max={4} value={step} className="h-2 w-full accent-primary"/>
  <p className="text-sm">This is the same planner used outside the guide. These fictional example inputs are fixed for the tutorial. Exit demo, then choose Resume planning scenario to edit this same draft and choose freely. For this exercise, prioritize lowest incremental cash, not least uncovered work or lowest delivery risk. Calculations use the entered assumptions, not a live AI-generated estimate.</p>
  {!prescribedAvailable&&<p role="alert">The prescribed staffing mix is unavailable for these inputs. Exit the demo rather than saving a different result.</p>}
  <SimpleSwpDemo guided={{forcedChoice}} draft={draft} comparison={comparison} selection={selection} reviewing={reviewing} disabled={disabled||pending} editingDisabled pending={pending} edit={null} alreadySaved={false} onCalculate={onCalculate} onSelect={onSelect} onPrepare={onPrepare} onEdit={noEdit} onAccept={noEdit} onCancel={noEdit} onPrimaryChange={noEdit}/>
  <p className="text-xs">These are conditional planning assumptions, not verified staffing availability or achieved outcomes. Saving is an explicit final action and keeps earlier saved plans.</p>
 </section>;
}
