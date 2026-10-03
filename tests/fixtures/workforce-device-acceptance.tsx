// Standalone synthetic acceptance host. Never imported by product code.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {decisionStore,useDecisionStorage} from '../../components/decision-store';
import {WorkforceAlternatives} from '../../components/workforce-alternatives';
import {readWorkforceSolution,solutionResultIsCurrent,type WorkforceSolution} from '../../lib/workforce-solution';
import {readSavedWorkforceReview} from '../../lib/workforce-solution-review';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions';
declare global {interface Window {deviceAcceptance:{encoded:string;nextSolution:WorkforceSolution;originalSolution:WorkforceSolution;source:string};acceptanceMode:string;releaseAcceptanceReplies:()=>void}}
const fixture=window.deviceAcceptance;
function Harness(){
 const storage=useDecisionStorage(),[dirty,setDirty]=useState(false),[mode,setMode]=useState('normal');
 const goalId=storage.data.goals.activeId,fields=storage.data.workspaces['goal-search']?.fields;
 const solution=readWorkforceSolution(storage.data.workspaces[goalId]?.fields.workforceSolution);
 const result=solution?.results.at(-1),review=solution&&result?readSavedWorkforceReview(solution,result):null;
 const goal=(activeId:string)=>decisionStore.saveGoals({...storage.data.goals,activeId});
 const control='min-h-10 rounded border p-2';
 return <main className="mx-auto max-w-4xl space-y-3 p-4">
  <h1 className="text-xl font-semibold">Synthetic device acceptance</h1>
  <p>No APIs, AI, real employee data or product service. This tests the real alternatives component and bundled worker, not the complete Next application.</p>
  <p className="break-all text-xs">Source: {fixture.source}</p>
  <p role="status">Saved locally: {String(storage.saved)}. Original plan unchanged: {String(JSON.stringify(fields?.workforceSolution)===JSON.stringify(fixture.originalSolution))}. Reviews: {Array.isArray(fields?.workforceAlternativeReviews)?fields.workforceAlternativeReviews.length:0}.</p>
  <div className="flex flex-wrap gap-2">
   <button className={control} onClick={()=>goal('goal-search')}>Goal A</button><button className={control} onClick={()=>goal('goal-b')}>Goal B</button>
   <button className={control} onClick={()=>setDirty(value=>!value)}>Toggle unsaved main edits</button>
   <button className={control} onClick={()=>decisionStore.setField('goal-search','workforceSolution',fixture.nextSolution)}>Publish newer synthetic calculation</button>
   <button className={control} onClick={()=>{localStorage.removeItem(DECISIONS_STORAGE_KEY);location.reload()}}>Reset synthetic fixture</button>
  </div>
  <label className="block">Worker test mode <select className={control} value={mode} onChange={event=>{window.acceptanceMode=event.target.value;setMode(event.target.value)}}><option value="normal">Normal</option><option value="hold">Hold replies</option><option value="no-worker">Worker unavailable</option><option value="no-crypto">Web Crypto unavailable</option></select></label>
  <button className={control} onClick={()=>window.releaseAcceptanceReplies()}>Release held replies</button>
  {solution&&result&&review?<WorkforceAlternatives key={goalId} solution={solution} evidenceResultId={result.id} input={review.input} blocked={dirty||!solutionResultIsCurrent(solution,result)}/>:<p>Other goal has no saved calculation.</p>}
 </main>;
}
try{
 if(!localStorage.getItem(DECISIONS_STORAGE_KEY))localStorage.setItem(DECISIONS_STORAGE_KEY,fixture.encoded);
 decisionStore.initialize(localStorage);
 createRoot(document.getElementById('root')!).render(<Harness/>);
}catch{document.getElementById('root')!.textContent='This browser cannot initialize the local fixture. No service fallback is used.'}
