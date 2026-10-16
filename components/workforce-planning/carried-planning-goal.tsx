"use client";
import {useState} from 'react';
import type {CarriedPlanningGoalActions} from './planning-session-context';
const control='min-h-11 min-w-0 rounded border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
export function CarriedPlanningGoal({actions}:{actions:CarriedPlanningGoalActions}){
 const [mode,setMode]=useState<'create'|'select'|null>(null),[statement,setStatement]=useState(actions.businessGoal),[selected,setSelected]=useState(''),[error,setError]=useState('');
 function confirm(){try{if(actions.disabled)return;if(mode==='create')actions.onCreate(statement);else actions.onSelect(selected);setError('');}catch(e){setError(e instanceof Error?e.message:'Goal could not be selected. Your worksheet is kept.');}}
 return <div className="space-y-2 rounded border p-3 text-sm" aria-label="Choose a goal for carried planning context">
  <p>Keep this worksheet and carried evidence with a browser-local goal. Evidence is reference context, not model inputs. Calculate again after choosing a goal before saving the scenario.</p>
  {!mode?<div className="flex flex-wrap gap-2">
   <button type="button" className={control} disabled={actions.disabled} onClick={()=>{setStatement(actions.businessGoal);setError('');setMode('create');}}>Create goal from carried context</button>
   <button type="button" className={control} disabled={actions.disabled||!actions.goals.length} onClick={()=>{setError('');setMode('select');}}>Select existing goal here</button>
   {!actions.goals.length&&<p className="text-xs">No saved goals yet.</p>}
  </div>:<div className="space-y-2" aria-label="Review planning goal choice">
   {mode==='create'?<label className="block">Goal statement<textarea className={control+' mt-1 w-full'} value={statement} onChange={e=>setStatement(e.target.value)}/></label>:<label className="block">Existing goal<select className={control+' mt-1 w-full'} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a saved goal</option>{actions.goals.map(g=><option key={g.id} value={g.id}>{g.statement}</option>)}</select></label>}
   <p>Your current worksheet and carried evidence will be used for this goal. This replaces its current unsaved worksheet and carried skill context; saved scenarios stay unchanged. Nothing is calculated or saved as a scenario automatically.</p>
   <div className="flex flex-wrap gap-2"><button type="button" className={control} disabled={actions.disabled||(mode==='create'?!statement.trim()||statement.trim().length>240:!selected)} onClick={confirm}>{mode==='create'?'Create and use goal':'Use selected goal'}</button><button type="button" className={control} onClick={()=>{setMode(null);setError('');}}>Cancel goal choice</button></div>
   {statement.trim().length>240&&mode==='create'&&<p>Use 240 characters or fewer. The carried evidence retains the original business goal.</p>}
  </div>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
