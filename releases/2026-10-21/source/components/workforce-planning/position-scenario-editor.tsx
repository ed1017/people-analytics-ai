"use client";

import {InteractivePlanner} from "@/components/interactive-planner";
import {useMemo, useState} from "react";
import {usePlanningSession, type PositionEditorDraft} from "./planning-session-context";
import {usePlanningDecisionState} from "./use-planning-decision-state";
import {decisionStore, useDecisionStorage} from "@/components/decision-store";
import {calculatePositionScenario, createPositionScenario, revisePositionScenario, validatePositionScenario, type PositionRecord, type PositionChange, type PositionScenario} from "@/lib/position-design-scenario";

const emptyPosition = (): PositionRecord => ({id: crypto.randomUUID(), role:null, level:null, businessUnit:null, location:null, fte:null, annualCostUsd:null, occupancy:"unknown"});
const numberLabel = (value:number|null) => value === null ? "Unknown" : value.toLocaleString(undefined,{maximumFractionDigits:2});
const control = "min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const button = "min-h-11 rounded-md border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function PositionScenarioEditor(){
  const {goalKey}=usePlanningSession();
  return <PositionScenarioWorkspace key={goalKey}/>;
}
function PositionScenarioWorkspace(){
  const {goalKey,positionGoalActions,positionDesignDraft,setPositionDesignDraft,carryPositionDesignDraft,canCarryPositionDesignDraft}=usePlanningSession();
  const carriedGoalActions=positionGoalActions;
  const draft:PositionEditorDraft=positionDesignDraft??{baselineRows:[],scope:"",asOf:"",scenario:null,rows:[],editing:null};
  const {baselineRows,scope,asOf,scenario,rows,editing}=draft;
  function patchDraft<K extends keyof PositionEditorDraft>(key:K,value:PositionEditorDraft[K]){setPositionDesignDraft(current=>({...draft,...current,[key]:value}));}
  const setBaselineRows=(value:PositionRecord[])=>patchDraft("baselineRows",value);
  const setScope=(value:string)=>patchDraft("scope",value);
  const setAsOf=(value:string)=>patchDraft("asOf",value);
  const setScenario=(value:PositionScenario|null)=>patchDraft("scenario",value);
  const setRows=(value:PositionRecord[])=>patchDraft("rows",value);
  const setEditing=(value:PositionRecord|null)=>patchDraft("editing",value);
  const [newGoal,setNewGoal]=useState("");
  const storage=useDecisionStorage();
  const goalId=goalKey.slice(goalKey.indexOf(":")+1);
  const canSave=Boolean(goalId && storage.ready && storage.data.goals.goals.some(goal=>goal.id===goalId));
  const [storedHistory,setHistory]=usePlanningDecisionState<PositionScenario[]>("positionDesignRevisions",[]);
  const history=useMemo(()=>Array.isArray(storedHistory)?storedHistory.filter(item=>{try{validatePositionScenario(item);calculatePositionScenario(item);return true;}catch{return false;}}):[],[storedHistory]);
  const invalidHistory=!Array.isArray(storedHistory)||history.length!==storedHistory.length;
  const [error,setError]=useState("");
  const [status,setStatus]=useState("");
  const [revisionChoice,setRevisionChoice]=useState("");
  const [pendingAction,setPendingAction]=useState<"reset"|"reopen"|null>(null);
  function chooseGoal(action:()=>string,targetId?:string){guarded(()=>{
    if(targetId&&!canCarryPositionDesignDraft(targetId))throw Error("That goal already has a position draft. Choose another goal; both drafts remain unchanged.");
    const id=action();if(id)carryPositionDesignDraft(id,{baselineRows,scope,asOf,scenario,rows,editing});
  });}
  const changes=useMemo<PositionChange[]>(()=>{
    if(!scenario)return [];
    const original=new Map(scenario.baseline.positions.map(row=>[row.id,row]));
    const next=new Set(rows.map(row=>row.id));
    return [...scenario.baseline.positions.filter(row=>!next.has(row.id)).map(row=>({kind:"remove" as const,id:row.id})),...rows.flatMap<PositionChange>(row=>{
      const before=original.get(row.id);
      if(!before)return [{kind:"add",position:row}];
      if(JSON.stringify(before)===JSON.stringify(row))return [];
      const {id,...patch}=row;return [{kind:"change",id,patch}];
    })];
  },[scenario,rows]);
  const calculation=useMemo(()=>{try{return {result:scenario?calculatePositionScenario({...scenario,changes}):null,error:""};}catch(cause){return {result:null,error:cause instanceof Error?cause.message:"Position totals could not be calculated. Review the entered values."};}},[scenario,changes]);
  const result=calculation.result;
  function guarded(action:()=>void){try{action();setError("");}catch(cause){setError(cause instanceof Error?cause.message:"Could not update this scenario.");}}
  function adopt(){guarded(()=>{
    if(!baselineRows.length)throw Error("Add at least one current position before adopting the baseline.");
    const next=createPositionScenario(crypto.randomUUID(),{version:crypto.randomUUID(),asOf,scope:scope.trim(),source:"user-entered",positions:baselineRows});
    calculatePositionScenario(next);
    setScenario(next);setRows(structuredClone(baselineRows));setStatus("Baseline adopted. Edit the proposal below.");
  });}
  function applyPosition(){guarded(()=>{
    if(!editing)return;
    const target=scenario?rows:baselineRows;
    const next=target.some(row=>row.id===editing.id)?target.map(row=>row.id===editing.id?editing:row):[...target,editing];
    // Validate the edited records without assigning a dataset identity to user-entered positions.
    calculatePositionScenario(createPositionScenario("validation",{version:"user-entry",asOf:"2026-01-01",scope:"validation",source:"user-entered",positions:next}));
    if(scenario)setRows(next);else setBaselineRows(next);
    setEditing(null);setStatus("");
  });}
  function save(){guarded(()=>{
    if(invalidHistory)throw Error("Saved position records could not be read. Existing records have been kept unchanged.");
    if(!scenario||!canSave)throw Error("Choose a planning goal to save revisions in this browser.");
    if(editing)throw Error("Apply or cancel the position edit before saving.");
    const latest=history.filter(item=>item.id===scenario.id).reduce((max,item)=>Math.max(max,item.revision),0);
    const next=revisePositionScenario({...scenario,revision:Math.max(scenario.revision,latest)},changes);
    calculatePositionScenario(next);
    setHistory([...history,next]);
    setScenario(next);
    setStatus(decisionStore.getSnapshot().saved?`Revision ${next.revision} saved in this browser.`:"Revision retained in memory; browser save failed. Retry saving when storage is available.");
  });}
  function reopen(){guarded(()=>{
    const saved=history.find(item=>`${item.id}:${item.revision}`===revisionChoice);
    if(!saved)throw Error("Choose a saved revision.");
    validatePositionScenario(saved);const restored=calculatePositionScenario(saved);setScenario(structuredClone(saved));setRows(restored.proposed);setEditing(null);setStatus(`Opened revision ${saved.revision}.`);
  });}
  const dirty=Boolean(editing)||(scenario?JSON.stringify(changes)!==JSON.stringify(scenario.changes):baselineRows.length>0);
  function reset(){if(!scenario)return;setRows(structuredClone(scenario.baseline.positions));setEditing(null);setError("");setStatus("Proposal reset to its original baseline. Saved revisions are unchanged.");}
  function requestAction(action:"reset"|"reopen"){if(dirty){setPendingAction(action);return;}if(action==="reset")reset();else reopen();}
  const shownRows=scenario?rows:baselineRows;
  const positionControls=<div className="space-y-3">
    <div className="space-y-2">{shownRows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><strong>{row.role??"Role unspecified"}</strong><p className="text-sm">{row.businessUnit??"Business unit unspecified"}  /  {row.level??"Level unspecified"}  /  {row.location??"Location unspecified"}</p><p className="text-sm">{numberLabel(row.fte)} FTE  /  {row.occupancy}</p></div><div className="flex gap-2"><button type="button" className={button} onClick={()=>setEditing({...row})}>Edit position</button><button type="button" className={button} onClick={()=>{if(scenario)setRows(rows.filter(item=>item.id!==row.id));else setBaselineRows(baselineRows.filter(item=>item.id!==row.id));setStatus("");}}>Remove position</button></div></div>)}</div>
    {!editing&&<button type="button" className={button} onClick={()=>setEditing(emptyPosition())}>{scenario?"Add proposed position":"Add current position"}</button>}
    {editing&&<fieldset className="space-y-3 rounded-lg border p-3"><legend className="px-1 font-semibold">Position details</legend><div className="grid gap-3 sm:grid-cols-2">{([['role','Role'],['level','Level'],['businessUnit','Business unit'],['location','Location']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input className={control} value={editing[key]??""} onChange={event=>setEditing({...editing,[key]:event.target.value.trim()?event.target.value:null})}/></label>)}{([['fte','Position FTE'],['annualCostUsd','Annual position cost (USD)']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input className={control} type="number" min="0" step="any" placeholder="Unknown" value={editing[key]??""} onChange={event=>setEditing({...editing,[key]:event.target.value===""?null:Number(event.target.value)})}/></label>)}<label className="text-sm">Occupancy<select aria-label="Occupancy" className={control} value={editing.occupancy} onChange={event=>setEditing({...editing,occupancy:event.target.value as PositionRecord['occupancy']})}><option value="unknown">Unknown</option><option value="occupied">Occupied</option><option value="vacant">Vacant</option></select></label></div><div className="flex gap-2"><button type="button" className={button} onClick={applyPosition}>Apply position</button><button type="button" className={button} onClick={()=>{setEditing(null);setError("");}}>Cancel edit</button></div></fieldset>}
  </div>;
  return <section className="space-y-4 rounded-xl border p-4" aria-labelledby="position-design-heading">
    <div><h3 id="position-design-heading" className="text-xl font-semibold">Model individual positions</h3><p className="text-sm text-muted-foreground">Enter current positions, then compare a proposed structure. Employee headcount is separate.</p></div>
    {!scenario?<>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Baseline scope<input className={control} value={scope} onChange={event=>setScope(event.target.value)} placeholder="For example, Finance team"/></label><label className="text-sm">Baseline as of<input type="date" className={control} value={asOf} onChange={event=>setAsOf(event.target.value)}/></label></div>
      <p className="text-sm text-muted-foreground">Use your position records. Grouped inventory is available in source details below.</p>
    </>:<p className="text-sm">{scenario.baseline.scope}  /  {scenario.baseline.asOf}  /  User-entered baseline</p>}
    {result&&<InteractivePlanner compact scope={scenario?.baseline.scope} outcome={`${result.netPositions===0?"Same number of positions":`${Math.abs(result.netPositions)} ${result.netPositions>0?"more":"fewer"} positions`} / ${numberLabel(result.proposedTotals.positionFte)} proposed position FTE`} metrics={[
      {label:"Position FTE / current to proposed",value:`${numberLabel(result.currentTotals.positionFte)} to ${numberLabel(result.proposedTotals.positionFte)}`},
      {label:"Net FTE change",value:numberLabel(result.netPositionFte)},
      {label:"Annual cost change / USD",value:numberLabel(result.annualPositionCostDeltaUsd)},
      {label:"Proposed vacancies",value:result.proposedTotals.vacantPositions}
    ]} levers={positionControls} visual={<>{      <figure aria-label="Current and proposed position count" className="space-y-2 rounded-lg bg-muted/40 p-3"><figcaption className="text-sm font-medium">Position count</figcaption>{[["Current",result.currentTotals.positions],["Proposed",result.proposedTotals.positions]].map(([label,value])=><div key={label} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-sm"><span>{label}</span><div className="h-5"><div className="h-full rounded bg-primary" style={{width:`${Number(value)/Math.max(1,result.currentTotals.positions,result.proposedTotals.positions)*100}%`}}/></div><strong>{value}</strong></div>)}</figure>}<p className="mt-3 text-sm">Annual position cost: {numberLabel(result.currentTotals.annualPositionCostUsd)} to {numberLabel(result.proposedTotals.annualPositionCostUsd)} USD</p><p className="text-sm">{result.proposedTotals.unknownOccupancyPositions} positions with unknown occupancy</p></>} />}
    {!result&&positionControls}
    <div className="flex flex-wrap gap-2">{!scenario?<button type="button" className={button} disabled={!!editing||!baselineRows.length||!scope.trim()||!asOf} onClick={adopt}>Adopt baseline</button>:<><button type="button" className={button} disabled={!!editing||!canSave||invalidHistory||!!calculation.error} onClick={save}>Save revision</button><button type="button" className={button} onClick={()=>requestAction("reset")}>Reset proposal</button></>}</div>
    {scenario&&!canSave&&<div className="space-y-2"><p className="text-sm">Choose a planning goal to save this draft in this browser.</p>{carriedGoalActions?<><label className="block text-sm">Planning goal<select aria-label="Planning goal" className={control} value="" disabled={carriedGoalActions.disabled} onChange={event=>{if(event.target.value)chooseGoal(()=>carriedGoalActions.onSelect(event.target.value),event.target.value);}}><option value="">Choose an existing goal</option>{carriedGoalActions.goals.map(goal=><option key={goal.id} value={goal.id}>{goal.statement}</option>)}</select></label><div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm">New planning goal<input className={control} value={newGoal} onChange={event=>setNewGoal(event.target.value)} placeholder="Describe the organizational decision"/></label><button type="button" className={button} disabled={carriedGoalActions.disabled||!newGoal.trim()} onClick={()=>chooseGoal(()=>carriedGoalActions.onCreate(newGoal.trim()))}>Create goal</button></div></>:<p className="text-sm">Open the planning goal selector to choose a goal. Keep this page open while editing.</p>}</div>}
    {history.length>0&&<div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm">Saved position revisions<select aria-label="Saved position revisions" className={control} value={revisionChoice} onChange={event=>setRevisionChoice(event.target.value)}><option value="">Choose a revision</option>{history.map(item=><option key={`${item.id}:${item.revision}`} value={`${item.id}:${item.revision}`}>{item.baseline.scope}  /  revision {item.revision}  /  {item.baseline.asOf}</option>)}</select></label><button type="button" className={button} disabled={!revisionChoice||!!editing} onClick={()=>requestAction("reopen")}>Open revision</button></div>}
    {pendingAction&&<div role="alert" className="space-y-2 rounded-lg border p-3"><p className="text-sm">Discard the unsaved position edits and {pendingAction==="reset"?"reset the proposal":"open this revision"}?</p><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>{if(pendingAction==="reset")reset();else reopen();setPendingAction(null);}}>Discard edits and continue</button><button type="button" className={button} onClick={()=>setPendingAction(null)}>Keep editing</button></div></div>}
    {invalidHistory&&<p role="alert" className="text-sm text-destructive">Some saved position revisions could not be read. They remain unchanged; saving is paused.</p>}
    {calculation.error&&<p role="alert" className="text-sm text-destructive">{calculation.error} Review the position values; your records are retained.</p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{status&&<p role="status" className="text-sm">{status}</p>}
  </section>;
}
