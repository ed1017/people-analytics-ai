"use client";
import {useEffect,useEffectEvent,useRef,useState} from "react";
import {decisionStore,useDecisionStorage} from "@/components/decision-store";
import {readWorkforceAlternativeReview,workforceAgentReviewIsCurrent} from "@/lib/workforce-planning-agent";
import {readWorkforceSolution,solutionResultIsCurrent,type WorkforceSolution} from "@/lib/workforce-solution";
import {workforceLimitSummary} from "@/lib/workforce-solution-review";
import type {WorkforcePlanField,WorkforcePlanInput} from "@/lib/workforce-increment";
import {WorkforceSelectionHandoff,type WorkforceSelectionOffer} from "@/components/workforce-selection-handoff";
import {WorkforceLocalSearch} from "@/components/workforce-local-search";
import {localWorkforceTask} from "@/lib/workforce-search-client";
import {originForSelection,type SearchOrigin,type LocalWorkforceReview} from "@/lib/workforce-local-search";
const field="workforceAlternativeReviews";
const edits:[WorkforcePlanField,string][]=[['build','Build count'],['move','Move count'],['buy','External hires'],['backfills','External backfills'],['buildMonth','Build readiness month'],['moveMonth','Move effective month'],['backfillDate','Backfill arrival date'],['annualBackfillCost','Annual cost per backfill (USD)'],['backfillFee','One-time fee per backfill (USD)'],['internalAnnualCostChange','Annual internal cohort uplift (USD)'],['trainingCash','Training cash (USD)'],['trainingHours','Employee training hours']];
const button="min-h-10 rounded border px-3 py-2 text-sm disabled:opacity-50";
const money=(value:number|null)=>value===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
type Props={solution:WorkforceSolution;evidenceResultId:string;input:WorkforcePlanInput;blocked:boolean;selection?:WorkforceSelectionOffer;onDirty?:(dirty:boolean)=>void};
function sourceIdentity(solution:WorkforceSolution|null,evidenceResultId:string){
 return JSON.stringify(solution&&{id:solution.id,goalId:solution.goalId,versions:solution.versions,evidence:solution.evidence,result:solution.results.find(item=>item.id===evidenceResultId),pending:solution.pending});
}
export function WorkforceAlternatives(props:Props){
 const storage=useDecisionStorage(),goal=storage.data.goals.goals.find(item=>item.id===props.solution.goalId);
 const saved=readWorkforceSolution(storage.data.workspaces[props.solution.goalId]?.fields.workforceSolution);
 // Reset ephemeral drafts on a source/goal transition, but retain them across unrelated shared-state updates.
 const identity=JSON.stringify([storage.data.goals.activeId,goal?.statement,sourceIdentity(saved,props.evidenceResultId),props.blocked]);
 return <AlternativeDrafts key={identity} {...props}/>;
}
function AlternativeDrafts({solution,evidenceResultId,input,blocked,selection,onDirty}:Props){
 const storage=useDecisionStorage(),raw=storage.data.workspaces[solution.goalId]?.fields[field]??[];
 const history=Array.isArray(raw)?raw:[];
 const unreadable=!Array.isArray(raw)||history.some(item=>!readWorkforceAlternativeReview(item,solution)&&!(item&&typeof item==='object'&&!Array.isArray(item)&&item.schemaVersion===2));
 const [drafts,setDrafts]=useState<WorkforcePlanInput[]>([{...input}]);
 const [draftRevision,setDraftRevision]=useState(0);
 const [preview,setPreview]=useState<LocalWorkforceReview|null>(null),[notice,setNotice]=useState('');
 const [localOffer,setLocalOffer]=useState<WorkforceSelectionOffer>(),[origin,setOrigin]=useState<SearchOrigin|null>(null),[working,setWorking]=useState(false);
 const offer=selection??localOffer,operation=useRef<AbortController|null>(null);
 const stop=()=>{operation.current?.abort();operation.current=null;setWorking(false)};
 const current=()=>{
  const snapshot=decisionStore.getSnapshot(),goal=snapshot.data.goals.goals.find(item=>item.id===solution.goalId);
  const saved=readWorkforceSolution(snapshot.data.workspaces[solution.goalId]?.fields.workforceSolution);
  if(blocked||!snapshot.saved||snapshot.data.goals.activeId!==solution.goalId||!saved||saved.id!==solution.id||goal?.statement!==saved.versions.at(-1)?.inputs.scope.goalStatement||sourceIdentity(saved,evidenceResultId)!==sourceIdentity(solution,evidenceResultId)||!saved.results.some(item=>item.id===evidenceResultId&&solutionResultIsCurrent(saved,item)))throw Error('Return to the current saved goal and calculation before reviewing alternatives.');
  return saved;
 };
 const validatePending=useEffectEvent(()=>{if(operation.current){try{current()}catch{stop()}}});
 useEffect(()=>{const off=decisionStore.subscribe(()=>validatePending());return()=>{off();operation.current?.abort();onDirty?.(false)}},[onDirty]);
 const selectionContext=()=>({solution:current(),activeGoalId:decisionStore.getSnapshot().data.goals.activeId,activeGoalStatement:decisionStore.getSnapshot().data.goals.goals.find(item=>item.id===solution.goalId)?.statement??'',evidenceResultId,expectedSearchFingerprint:offer?.snapshot.searchFingerprint??'',hasUnsavedPlanEdits:blocked});
 async function calculate(){
  stop();const controller=new AbortController();operation.current=controller;setWorking(true);setPreview(null);
  try{
   const result=await localWorkforceTask<LocalWorkforceReview>('preview',{context:selectionContext(),revisions:drafts,origin,id:crypto.randomUUID(),createdAt:new Date().toISOString()},controller.signal);
   if(controller.signal.aborted)return;current();setPreview(result);setNotice('Local comparison ready. Review the amounts and unknowns before saving.');
  }catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 async function save(){if(!preview)return;stop();const controller=new AbortController();operation.current=controller;setWorking(true);
  try{
   const saved=current(),previous=decisionStore.getSnapshot().data.workspaces[solution.goalId]?.fields[field]??[];
   const next=await localWorkforceTask<LocalWorkforceReview[]>('retain',{previous,review:preview,solution:saved},controller.signal);
   if(controller.signal.aborted)return;current();
   if(JSON.stringify(previous)!==JSON.stringify(decisionStore.getSnapshot().data.workspaces[solution.goalId]?.fields[field]??[]))throw Error('Review history changed; inspect it before saving again.');
   decisionStore.setField(solution.goalId,field,next);
   const snapshot=decisionStore.getSnapshot();
   if(!snapshot.saved){setNotice(snapshot.notice??'This review remains in the working tab; browser storage did not save it.');return}
   onDirty?.(false);setPreview(null);setNotice('Reviewed alternatives saved locally. Your original plan, evidence and approval notes are unchanged.');
  }catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 return <details className="space-y-3 rounded border p-3"><summary className="cursor-pointer font-semibold">Review local alternatives</summary><section aria-label="Local workforce alternatives" className="space-y-3 text-sm">
  <p>Compare up to two alternatives using this calculation&apos;s saved evidence. Demand, budget, employee limit, deadline, hire cost and hiring timing stay fixed. Calculations run locally; no AI request or real-world action occurs.</p>
  <p>{input.roles} additional {input.jobProfile} roles in {input.businessUnit}; {input.planningMonth}, {input.months} months. Cash budget: {input.budget?money(Number(input.budget)):'Unknown'}. Employee cap: {input.maxAddedEmployees||'Unknown'}. Deadline: {input.deadlineMonth||'Unknown'}.</p>
  <p className="text-xs">Fixed hiring basis: annual cost per hire {input.annualHireCost?money(Number(input.annualHireCost)):'Unknown'}, fee per hire {input.hireFee?money(Number(input.hireFee)):'Unknown'}; recruiting launch {input.recruitingStart||'Unknown'}, arrival mode {input.arrivalMode||'Unknown'}{input.arrivalMode==='explicit'?`, arrival ${input.arrivalDate||'Unknown'}`:''}. Loaded hourly cost: {input.loadedHourlyCost?money(Number(input.loadedHourlyCost)):'Unknown'}.</p>
  {blocked&&<p role="status">Select a current calculation and save any main-plan edits before previewing or saving alternatives. Historical alternative reviews remain below.</p>}
  {unreadable&&<p role="status">Saved alternative history is unreadable. Original records are retained; saving is unavailable.</p>}
  {!selection&&!blocked&&<WorkforceLocalSearch currentContext={selectionContext} roles={Number(input.roles)} savedMix={input} onOffer={setLocalOffer}/>}
  {offer&&!blocked&&<WorkforceSelectionHandoff key={JSON.stringify([draftRevision,offer.snapshot.searchFingerprint,offer.selectedIds])} offer={offer} currentContext={selectionContext} onReplace={(next,selected)=>{current();stop();onDirty?.(true);setOrigin(originForSelection(selected.snapshot,selected.selectedIds,next));setDrafts(next);setDraftRevision(value=>value+1);setPreview(null);setNotice('Selected mixes opened as temporary drafts. Review assumptions, then calculate explicitly.')}}/>}
  {drafts.map((draft,index)=><fieldset key={index} disabled={blocked||working} className="rounded border p-3"><legend>Alternative {index+1}</legend><div className="grid gap-3 sm:grid-cols-2">{edits.map(([key,label])=><label key={key} className="min-w-0">{label}<input aria-label={`Alternative ${index+1}: ${label}`} className="mt-1 min-h-10 w-full min-w-0 rounded border bg-background p-2" maxLength={100} value={draft[key]} onChange={event=>{stop();onDirty?.(true);setDrafts(before=>before.map((item,i)=>i===index?{...item,[key]:event.target.value}:item));setDraftRevision(value=>value+1);setPreview(null);setNotice('Alternative draft changed; preview again before saving.')}}/></label>)}</div></fieldset>)}
  <div className="flex flex-wrap gap-2"><button className={button} disabled={blocked||working} onClick={()=>{stop();onDirty?.(true);if(drafts.length===2&&origin){const selections=origin.selections.filter(item=>item.revisionSlot===0);setOrigin(selections.length?{...origin,selections}:null)}setDrafts(before=>before.length===1?[...before,{...input}]:before.slice(0,1));setDraftRevision(value=>value+1);setPreview(null);setNotice('Drafts changed; preview again before saving.')}}>{drafts.length===1?'Add second alternative':'Remove second draft'}</button><button className={button} disabled={blocked||working} onClick={()=>void calculate()}>Calculate alternatives locally</button><button className={button} disabled={blocked||working} onClick={()=>{stop();onDirty?.(false);setOrigin(null);setDrafts([{...input}]);setDraftRevision(value=>value+1);setPreview(null);setNotice('Temporary alternative edits cancelled. Saved reviews and approvals are unchanged.')}}>Cancel alternative edits</button></div>
  <p className="text-xs">Drafts are temporary until explicitly saved. Build + Move + external hires must equal the role requirement; backfills are additional employees. Training time stays separate from cash. Saving an alternative does not authorize an AI run or change the saved solution version.</p>
  {working&&<p role="status">Checking local calculation and review history… <button className={button} onClick={()=>{stop();setPreview(null);setNotice('Local work cancelled; saved records retained.')}}>Cancel local calculation</button></p>}
  {preview&&<><Comparison review={preview}/><button className={button} disabled={blocked||working||unreadable||history.length>=10||!workforceAgentReviewIsCurrent(solution,preview)} onClick={()=>void save()}>Save reviewed alternatives</button></>}
  {notice&&<p role="status">{notice}</p>}
  <h4 className="font-semibold">Saved local alternative reviews ({history.length})</h4>
  {history.length>=10&&<p role="status">The ten-review limit is reached. Existing reviews are retained.</p>}
  {history.map((rawReview,index)=><SavedReview key={JSON.stringify([index,rawReview])} raw={rawReview} solution={solution} index={index}/>)}
 </section></details>;
}
function Comparison({review}:{review:LocalWorkforceReview}){
 return <div className="space-y-3">{review.schemaVersion===2&&<Lineage origin={review.selectionOrigin}/>} {review.comparisons.map(result=><article key={result.optionId} className="space-y-1 rounded border p-3"><h5 className="font-semibold">{result.optionId==='reviewed-mix'?'Saved mix — recalculated locally':result.optionId==='hiring-only'?'Hiring-only — recalculated locally':`Alternative ${result.optionId==='revision-1'?1:2}`}</h5><p>Build {result.plan.input.build}, Move {result.plan.input.move}, external hires {result.plan.input.buy}, backfills {result.plan.input.backfills||'0'}.</p><p>Incremental cash: {money(result.plan.totalCash)}. Employee time value: {money(result.plan.totalTime)} (separate). Additional employees: {result.plan.maxAddedEmployees}.</p><p>{workforceLimitSummary(result.plan)}</p><ul className="list-disc pl-5">{result.plan.checks.map(check=><li key={check.name}>{check.name}: {check.status}</li>)}</ul><details><summary>Reviewed assumptions and limitations</summary><dl className="grid grid-cols-1 gap-1">{edits.map(([key,label])=><div key={key}><dt className="inline font-medium">{label}: </dt><dd className="inline">{result.plan.input[key]||'Unknown'}</dd></div>)}</dl><ul className="list-disc pl-5">{result.plan.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></details></article>)}</div>;
}

function Lineage({origin}:{origin:SearchOrigin}){
 return <details className="rounded border p-2"><summary>Search origin and conditional assumptions</summary><p>Source plan version {origin.source.version}; calculation {origin.source.evidenceResultId}. {origin.search.calculator.methodVersion}; {origin.search.methodVersion}.</p><p>Bounds: Build {origin.search.spec.build.min}–{origin.search.spec.build.max}, Move {origin.search.spec.move.min}–{origin.search.spec.move.max}, Buy {origin.search.spec.buy.min}–{origin.search.spec.buy.max}. Evaluation budget {origin.search.spec.maxEvaluations}; output cap {origin.search.spec.maxResults}; filter {origin.search.spec.resultFilter}.</p><ul>{origin.selections.map(item=><li key={item.revisionSlot}>Alternative {item.revisionSlot+1} originated as Build {item.mix.build}, Move {item.mix.move}, Buy {item.mix.buy}: {item.editedSinceSelection?'Customized after selection; only its recalculated checks apply.':'Unchanged from selected mix.'}</li>)}</ul><p>Conditional on entered assumptions. Candidate pools are not assignable capacity. Operational feasibility remains unverified; approvals are separate.</p><p className="break-all text-xs">Evidence fingerprint: {origin.source.evidenceFingerprint}. Result fingerprint: {origin.source.sourceResultFingerprint}.</p></details>;
}
function SavedReview({raw,solution,index}:{raw:unknown;solution:WorkforceSolution;index:number}){
 const v1=readWorkforceAlternativeReview(raw,solution),[verified,setVerified]=useState<LocalWorkforceReview|null>(null),[notice,setNotice]=useState(''),controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const review=v1??verified;
 async function inspect(){controller.current?.abort();const c=new AbortController();controller.current=c;setNotice('Verifying saved search origin locally…');try{const result=await localWorkforceTask<LocalWorkforceReview|null>('read',{review:raw,solution},c.signal);if(!c.signal.aborted){setVerified(result);setNotice(result?'':'Saved review is unavailable or uses an unsupported version. Original record retained.')}}catch{if(!c.signal.aborted)setNotice('Local verification unavailable. Original record retained.')}}
 if(!review)return <div className="rounded border p-2"><p>Review {index+1} · saved record retained; verify before inspection.</p><button className={button} onClick={()=>void inspect()}>Verify saved review {index+1} locally</button>{notice&&<p role="status">{notice}</p>}</div>;
 return <details className="rounded border p-2"><summary>Review {index+1} · version {review.binding.version} · {workforceAgentReviewIsCurrent(solution,review)?'Current saved evidence':'Historical inputs or evidence'}</summary><Comparison review={review}/></details>;
}
