"use client";
import {useEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {calculateRetentionWhatIf,emptyRetentionInput,type RetentionField,type RetentionInput,type RetentionResult} from '@/lib/retention-what-if';
import {readRetentionRecord,retainRetentionReview,retentionStorageField,type RetentionRecord} from '@/lib/retention-what-if-record';

const button='min-h-11 rounded border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const shown=(value:number|null)=>value===null?'Unknown':value.toLocaleString(undefined,{maximumFractionDigits:2});
const money=(value:number|null)=>value===null?'Unknown':`$${shown(value)} USD`;
const groups:[string,[RetentionField,string][]][]=[
 ['Scope and baseline',[['population','Which aggregate population?'],['startMonth','Planning start month (YYYY-MM)'],['months','Planning horizon (1–24 months)'],['baselineExpectedExits','Expected voluntary exits without intervention over this horizon']]],
 ['Effect and timing',[['lagMonths','Whole months before an effect begins'],['effectLowPct','Lower assumed relative reduction (%)'],['effectHighPct','Upper assumed relative reduction (%)']]],
 ['Program costs (optional)',[['setupCost','One-time setup cost (USD)'],['participants','Funded participants'],['perParticipantCost','One-time cost per participant (USD)'],['monthlyProgramCost','Monthly program cost (USD)'],['fundedMonths','Funded months within this horizon']]],
];
export function RetentionWhatIfPanel({initiallyOpen=false}:{initiallyOpen?:boolean}){
 const [epoch,setEpoch]=useState(0);
 const storage=useDecisionStorage(),id=storage.data.goals.activeId,goal=storage.data.goals.goals.find(g=>g.id===id);
 if(!storage.ready||!goal)return <p className="p-4 text-sm">Save a goal to use Retention what-if. Assumptions stay separate from workforce capacity options.</p>;
 return <RetentionEditor key={`${id}:${goal.statement}:${epoch}`} onRestart={()=>setEpoch(value=>value+1)} goalId={id} goalStatement={goal.statement} initiallyOpen={initiallyOpen}/>;
}
function RetentionEditor({goalId,goalStatement,initiallyOpen,onRestart}:{goalId:string;goalStatement:string;initiallyOpen:boolean;onRestart:()=>void}){
 const storage=useDecisionStorage(),raw=storage.data.workspaces[goalId]?.fields[retentionStorageField];
 let record:RetentionRecord|null=null,readError='';
 try{if(raw!==undefined)record=readRetentionRecord(raw,goalId)}catch(error){readError=(error as Error).message}
 const latest=record?.revisions.at(-1);
 const [open,setOpen]=useState(initiallyOpen),[step,setStep]=useState(0),[draft,setDraft]=useState<RetentionInput>(()=>latest?.input??emptyRetentionInput()),[review,setReview]=useState<{input:RetentionInput;result:RetentionResult;raw:unknown}|null>(null),[notice,setNotice]=useState(''),[stale,setStale]=useState(false);
 const invalid=useRef(false),heading=useRef<HTMLHeadingElement>(null),resultHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>decisionStore.subscribe(()=>{const state=decisionStore.getSnapshot(),goal=state.data.goals.goals.find(g=>g.id===goalId);if(state.data.goals.activeId!==goalId||goal?.statement!==goalStatement){invalid.current=true;setStale(true);}}),[goalId,goalStatement]);
 useEffect(()=>{if(open)heading.current?.focus()},[open,step]);
 useEffect(()=>{if(review)resultHeading.current?.focus()},[review]);
 const current=()=>{const state=decisionStore.getSnapshot();if(invalid.current||state.data.goals.activeId!==goalId||state.data.goals.goals.find(g=>g.id===goalId)?.statement!==goalStatement)throw Error('Goal changed. Reopen Retention what-if for the current goal.');if(!state.ready||!state.saved)throw Error('Browser storage is unavailable. Your draft is retained; no review was saved.');return state;};
 const change=(field:RetentionField,value:string)=>{setDraft(previous=>({...previous,[field]:value}));setReview(null);setNotice('Assumptions changed. Calculate again before saving.');};
 const input=(field:RetentionField,label:string)=><label key={field} className="block min-w-0 text-sm">{label}<input aria-label={label} value={draft[field]} maxLength={field==='population'?240:80} inputMode={field==='population'||field==='startMonth'?'text':'decimal'} onChange={event=>change(field,event.target.value)} className="mt-1 min-h-11 w-full rounded border bg-background p-2"/></label>;
 function calculate(){try{const state=current(),result=calculateRetentionWhatIf(draft);setReview({input:{...draft},result,raw:state.data.workspaces[goalId]?.fields[retentionStorageField]});setNotice('Calculated locally from your assumptions. Review the result, then save explicitly.')}catch(error){setNotice((error as Error).message)}}
 function save(){try{if(!review)throw Error('Calculate current assumptions before saving.');const state=current(),previous=state.data.workspaces[goalId]?.fields[retentionStorageField];if(JSON.stringify(previous)!==JSON.stringify(review.raw))throw Error('Saved review changed. Calculate again before saving.');const next=retainRetentionReview(previous,{id:crypto.randomUUID(),goalId,goalStatement,savedAt:new Date().toISOString(),input:review.input,result:review.result},{goalId,goalStatement,input:draft});decisionStore.setField(goalId,retentionStorageField,next);if(!decisionStore.getSnapshot().saved)throw Error('Browser storage did not save. Your working copy is retained.');setReview(null);setNotice('Retention review saved in this browser.')}catch(error){setNotice((error as Error).message)}}
 const disabled=stale||!storage.saved||!!readError;
 return <section aria-label="Retention what-if" className="mx-auto my-4 max-w-3xl space-y-3 rounded-lg border p-4 text-sm">
  <h2 className="text-lg font-semibold">Retention what-if</h2><p>Explore one program using your own baseline, effect and cost assumptions. This is conditional arithmetic, not a forecast or evidence of what works.</p>
  <p>Goal: {goalStatement}</p>
  {!open&&<button className={button} disabled={disabled} onClick={()=>setOpen(true)}>{latest?'Review retention assumptions':'Start retention what-if'}</button>}
  {readError&&<p role="alert">{readError} Original data is retained; editing is blocked.</p>}
  {stale&&<p role="alert">The goal changed. Close and reopen this review for the current goal. No stale result can be saved. <button className={button} onClick={onRestart}>Reopen for current goal</button></p>}
  {!storage.saved&&<p role="alert">{storage.notice??'Browser storage is unavailable. Your draft is kept in this view.'}</p>}
  {open&&<><h3 ref={heading} tabIndex={-1} className="font-semibold">{step<3?`${step+1} of 4 — ${groups[step][0]}`:'4 of 4 — Review assumptions'}</h3>
   <fieldset disabled={disabled} className="space-y-3">
    {step===0&&<p>Enter an expected number of voluntary exits for this population and horizon, not headcount or an annualized turnover rate. Blank means unknown; zero is an explicit assumption.</p>}
    {step===1&&<p>Enter an assumed relative reduction in expected exits, not percentage points. No benchmark effect is supplied. The no-effect case remains visible.</p>}
    {step===2&&<p>Leave costs blank if unknown, or enter explicit zeros where appropriate. Costs remain payable even with no effect. Funding duration is separate from effect lag.</p>}
    {step<3&&<div className="grid gap-3 sm:grid-cols-2">{groups[step][1].map(([field,label])=>input(field,label))}</div>}
    {step===1&&<><label className="block">Baseline timing after the lag<select aria-label="Baseline timing after the lag" value={draft.activeBaselineMode} onChange={event=>change('activeBaselineMode',event.target.value)} className="mt-1 min-h-11 w-full rounded border bg-background p-2"><option value="">Unknown / choose if lag is inside the horizon</option><option value="direct">Enter expected exits during the effect-active period</option><option value="uniform">I explicitly assume exits are uniform over the horizon</option></select></label>{(draft.activeBaselineMode==='direct'||!!draft.activeBaselineExpectedExits)&&input('activeBaselineExpectedExits','Expected exits during the effect-active period')}<p>With zero lag the whole baseline applies; with lag at or beyond the horizon, no exits are affected. Uniform timing is never assumed automatically.</p></>}
    {step===3&&<><p>Review your inputs before calculating. Missing baseline, effect, timing or cost assumptions stay Unknown. Scope, start month and horizon are required.</p><dl className="grid gap-2">{groups.flatMap(([,fields])=>fields).concat([['activeBaselineMode','Baseline timing'],['activeBaselineExpectedExits','Effect-active expected exits']]).map(([field,label])=><div key={field} className="break-words"><dt className="font-medium">{label}</dt><dd>{draft[field]||'Unknown'}</dd></div>)}</dl><button className={button} onClick={calculate}>Calculate retention what-if</button></>}
   </fieldset>
   <div className="flex flex-wrap gap-2">{step>0&&<button className={button} onClick={()=>setStep(step-1)}>Back</button>}{step<3&&<button className={button} disabled={disabled} onClick={()=>setStep(step+1)}>{step===2?'Review assumptions':'Continue'}</button>}<button className={button} onClick={()=>{setOpen(false);setReview(null);setNotice('Closed without saving. Your draft is kept while this goal remains open; unsaved edits do not survive reload.')}}>Cancel review</button></div>
  </>}
  {notice&&<p role="status">{notice}</p>}
  {open&&review&&<><h3 ref={resultHeading} tabIndex={-1} className="font-semibold">Calculated retention what-if — not yet saved</h3><RetentionSummary result={review.result}/><button className={button} disabled={disabled} onClick={save}>Save retention review</button></>}
  {latest&&!review&&<details><summary className="min-h-11 cursor-pointer py-2">Saved retention review ({record!.revisions.length})</summary><p>Saved {latest.savedAt}. Goal at save: {latest.goalStatement}</p>{latest.goalStatement!==goalStatement&&<p>This saved review belongs to an earlier goal statement. Review assumptions and calculate again.</p>}<RetentionSummary result={latest.result}/></details>}
  <p className="text-xs text-muted-foreground">Only Save retention review persists these assumptions and results. Unsaved edits are local to this view. No AI request or capacity calculation is made.</p>
 </section>;
}
function RetentionSummary({result:r}:{result:RetentionResult}){return <div className="space-y-3">
 <p><strong>{r.population}</strong> · {r.startMonth} through {r.endMonth}</p>
 <p>Program cost: <strong>{money(r.programNoEffect.programCost)}</strong>. Effect begins: {r.effectStartMonth??'Unknown'}; {shown(r.activeMonths)} active months in this horizon.</p>
 <p>If your reduction assumptions hold: <strong>{shown(r.assumedRange.lowReduction.fewerExits)}–{shown(r.assumedRange.highReduction.fewerExits)} fewer expected voluntary exits</strong> versus no intervention. Fractional counts are expected values, not identified people.</p>
 <ul className="list-disc space-y-1 pl-5"><li>No intervention: {shown(r.noIntervention.expectedExits)} expected exits; $0 incremental program cost.</li><li>Program with no effect: {shown(r.programNoEffect.expectedExits)} expected exits; {money(r.programNoEffect.programCost)}.</li><li>Assumed effect range: {shown(r.assumedRange.highReduction.expectedExits)}–{shown(r.assumedRange.lowReduction.expectedExits)} expected exits; {money(r.programNoEffect.programCost)}.</li></ul>
 <p>These are baseline comparisons for one program, not three strategies. The no-effect case is not a worst-case guarantee; worsening effects, savings and ROI are not modeled.</p>
 {r.issues.length>0&&<div role="status"><p>Missing assumptions — outcomes may remain unknown:</p><ul className="list-disc pl-5">{r.issues.map(issue=><li key={issue.field}>{issue.message}</li>)}</ul></div>}
 <details><summary className="min-h-11 cursor-pointer py-2">Details: arithmetic and limitations</summary><p>Effect-active baseline: {shown(r.baselineActive)} expected exits. Fewer exits = effect-active expected exits × assumed relative reduction / 100. Program cost = setup + participants × one-time cost + monthly cost × funded months.</p><ul className="list-disc space-y-1 pl-5">{r.limitations.map(text=><li key={text}>{text}</li>)}</ul></details>
 </div>}
