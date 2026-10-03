// Isolated development harness. No product route imports this host or its transport.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkforceAlternatives} from '../../components/workforce-alternatives';
import {decisionStore,useDecisionStorage} from '../../components/decision-store';
import {readWorkforceSolution,solutionResultIsCurrent,type WorkforceSolution} from '../../lib/workforce-solution';
import {readSavedWorkforceReview} from '../../lib/workforce-solution-review';
import {DECISIONS_STORAGE_KEY,type DecisionData} from '../../lib/local-decisions';
import type {WorkforceSelectionOffer} from '../../components/workforce-selection-handoff';
import type {WorkforceMixSearch} from '../../lib/workforce-mix-search';
declare global {interface Window {handoffSeed:{encoded:string;search:WorkforceMixSearch;nextSolution:WorkforceSolution};handoffFixture:{saved:()=>DecisionData}}}
if(!localStorage.getItem(DECISIONS_STORAGE_KEY))localStorage.setItem(DECISIONS_STORAGE_KEY,window.handoffSeed.encoded);
decisionStore.initialize(localStorage);
window.handoffFixture={saved:()=>decisionStore.getSnapshot().data};
const verify:WorkforceSelectionOffer['verify']=async(context,snapshot,ids)=>{
 const response=await fetch('/__fixture-only-selection-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context,snapshot,ids})});
 if(!response.ok)throw Error('Fixture verification rejected');return response.json();
};
function Harness(){
 const storage=useDecisionStorage(),[offer,setOffer]=useState<WorkforceSelectionOffer>(),[destination,setDestination]=useState('Home');
 const goalId=storage.data.goals.activeId,solution=readWorkforceSolution(storage.data.workspaces[goalId]?.fields.workforceSolution);
 const result=solution?.results.at(-1),review=solution&&result?readSavedWorkforceReview(solution,result):null;
 const setGoal=(activeId:string)=>decisionStore.saveGoals({...storage.data.goals,activeId});
 return <main className="mx-auto max-w-4xl space-y-3 p-4">
  <h1 className="text-xl font-semibold">Local scenario review — {destination}</h1>
  <div className="flex flex-wrap gap-2">
   <button onClick={()=>setGoal('goal-search')}>Goal A</button><button onClick={()=>setGoal('goal-b')}>Goal B</button>
   <button onClick={()=>setDestination(value=>value==='Home'?'Sidebar':'Home')}>Switch destination</button>
   <button onClick={()=>decisionStore.setField('goal-search','unrelated','Updated unrelated field')}>Publish unrelated state</button>
   <button onClick={()=>decisionStore.setField('goal-search','workforceSolution',window.handoffSeed.nextSolution)}>Publish newer saved result</button>
   <button onClick={()=>setOffer({snapshot:window.handoffSeed.search,selectedIds:['build-0-move-3-buy-0','build-1-move-2-buy-0'],verify})}>Load selected search results</button>
   <button onClick={()=>setOffer({snapshot:window.handoffSeed.search,selectedIds:['build-0-move-3-buy-0','build-1-move-2-buy-0','build-2-move-1-buy-0'],verify})}>Try three selections</button>
  </div>
  {solution&&result&&review?<WorkforceAlternatives key={`${goalId}:${destination}`} solution={solution} evidenceResultId={result.id} input={review.input} blocked={!solutionResultIsCurrent(solution,result)} selection={offer}/>:<p>Other goal has no saved calculation.</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
