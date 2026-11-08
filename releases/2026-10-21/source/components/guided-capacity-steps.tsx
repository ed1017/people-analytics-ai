"use client";
import {StaffingOptionsTable} from './staffing-options-table';
import {SwpOutcomeChart} from './swp-outcome-chart';
import {StaffingOptionCost} from './staffing-option-cost';
import {staffingOptionTitle} from '@/lib/staffing-option-title';
import {staffingAssumptions} from '@/lib/scenario-chat-continuity';
import {guidedOptionEffort,swpTradeoffOptions, type compareSwpDemo} from '@/lib/swp-demo';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
const button='min-h-11 rounded border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
/** Guided-only presentation. Calculations and save reviews remain owned by the normal journey. */
export function GuidedCapacitySteps({forcedChoice=false,draft,comparison,selection,reviewing,disabled,pending,onCalculate,onSelect,onPrepare}:{forcedChoice?:boolean;draft:BundleDraft;comparison:Comparison|null;selection:string|null;reviewing:boolean;disabled:boolean;pending:boolean;onCalculate:()=>void;onSelect:(id:string)=>void;onPrepare:()=>void}){
 const prescribed=(mix:{build:number;move:number;buy:number})=>mix.build===3&&mix.move===2&&mix.buy===0;
 const options=comparison?swpTradeoffOptions(comparison.evaluation):[],selected=options.find(option=>option.id===selection),step=reviewing?4:comparison?3:2;
 return <section aria-label="Required guided demo actions" className="space-y-4">
  <p className="text-sm font-semibold" role="status">Step {step} of 4: {reviewing?'Review the proposal before saving':comparison?'Select one option that meets the entered limits':'Compare the fixed example assumptions'}</p>
  <progress aria-label="Guided demo progress" max={4} value={step} className="h-2 w-full accent-primary"/>
  <p className="text-sm">Fictional example: 8 FTE needed, 3 FTE qualified capacity, 5 FTE gap, $325,000 USD budget, Nov 2026–Oct 2027. Inputs are fixed in this guided demo. {forcedChoice?"Exit the whole-app demo to explore freely.":"Close the popup to explore your own scenario."}</p>
  {!reviewing&&<>
   {!comparison&&<button className={button+' bg-primary text-primary-foreground'} disabled={disabled} onClick={onCalculate}>Compare staffing options</button>}
   {pending&&<p role="status">Calculating the example locally. No live AI request is needed.</p>}
   {comparison?.evaluation.context.status==='needs-inputs'&&<p role="alert">The example needs inputs: {comparison.evaluation.context.missing.map(item=>item.reason).join(' ')}. Close and restart the guide.</p>}
   {comparison?.evaluation.context.status==='ready'&&<>
    {forcedChoice&&!options.some(option=>option.candidate.status==='met'&&prescribed(option.candidate.mix))&&<p role="alert">The prescribed staffing mix is unavailable for these inputs. Exit the demo rather than saving a different result.</p>}
    <SwpOutcomeChart draft={draft} options={comparison.options}/>
    <p className="text-xs">{staffingAssumptions(selected?.draft??draft)}</p>
    <fieldset disabled={disabled} className="min-w-0 max-w-full"><legend className="font-semibold">{forcedChoice?"Required choice: Develop and move your team (3 develop / 2 move / 0 hire)":"Required action: choose a feasible staffing option"}</legend>{forcedChoice&&<p className="text-sm">This guided case uses the internal staffing mix. Compare its actual costs and uncovered work against the other displayed options before choosing it. Other choices remain visible for comparison.</p>}
     <StaffingOptionsTable enumerated={comparison.evaluation.report?.summary.enumerated??0} options={options.map(option=>({id:option.id,mix:option.candidate.mix,cash:option.candidate.cash.complete,staffHours:option.candidate.effort?.trainingHours??null,coverageDate:option.candidate.metrics?.fullCoverageDate??null,shortfallHours:guidedOptionEffort(option)?.shortfallHours??null,status:option.candidate.status,reason:option.candidate.reason}))} action={option=><label className="flex min-h-11 items-center gap-2"><input type="radio" name="guided-staffing-option" aria-label={staffingOptionTitle(option.mix)} checked={selection===option.id} disabled={disabled||option.status!=='met'||forcedChoice&&!prescribed(option.mix)} onChange={()=>onSelect(option.id)}/>{staffingOptionTitle(option.mix)}</label>}/>
    </fieldset>
    {selected&&<StaffingOptionCost draft={selected.draft} cash={selected.candidate.cash}/>}
    <p id="guided-choice-guidance" className="text-sm">{selected?'Review this option before saving. No plan has been saved yet.':'Select an option that meets the entered limits to unlock the review.'}</p>
    <button className={button+' bg-primary text-primary-foreground'} aria-describedby="guided-choice-guidance" disabled={disabled||!selected||selected.candidate.status!=='met'||forcedChoice&&!prescribed(selected.candidate.mix)} onClick={onPrepare}>Review selected Action Plan</button>
   </>}
  </>}
  <p className="text-xs">These are conditional planning assumptions, not verified staffing availability or achieved outcomes. Saving is an explicit final action and keeps earlier saved plans.</p>
 </section>;
}
