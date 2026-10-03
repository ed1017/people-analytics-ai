import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {decisionStore,useDecisionStorage} from '../../components/decision-store';
import {WorkforceSolutionPanel} from '../../components/workforce-solution-panel';
import {DECISIONS_STORAGE_KEY,type DecisionData} from '../../lib/local-decisions';
import type {WorkforceSolution} from '../../lib/workforce-solution';
import type {AppPage} from '../../lib/types';
declare global {interface Window {readinessSeed:{encoded:string;empty:WorkforceSolution;complete:WorkforceSolution;newer:WorkforceSolution};readinessSaved:()=>DecisionData}}
localStorage.setItem(DECISIONS_STORAGE_KEY,window.readinessSeed.encoded);decisionStore.initialize(localStorage);
window.readinessSaved=()=>decisionStore.getSnapshot().data;
function Harness(){
 const storage=useDecisionStorage(),[page,setPage]=useState<AppPage>('home'),[revision,setRevision]=useState(0);
 const publish=(solution:WorkforceSolution)=>{decisionStore.setField('goal-readiness','workforceSolution',solution);setRevision(value=>value+1)};
 return <main>
  <button onClick={()=>publish(window.readinessSeed.empty)}>Load empty saved inputs</button>
  <button onClick={()=>publish(window.readinessSeed.complete)}>Load complete saved inputs</button>
  <button onClick={()=>publish(window.readinessSeed.newer)}>Publish newer input version</button>
  <button onClick={()=>decisionStore.saveGoals({...storage.data.goals,goals:storage.data.goals.goals.map(goal=>goal.id==='goal-readiness'?{...goal,statement:'Changed synthetic goal'}:goal)})}>Change goal wording</button>
  <button onClick={()=>decisionStore.saveGoals({...storage.data.goals,activeId:'goal-other'})}>Goal B</button>
  <button onClick={()=>decisionStore.saveGoals({...storage.data.goals,activeId:'goal-readiness'})}>Goal A</button>
  <button onClick={()=>decisionStore.setField('goal-readiness','unrelated','Keep unrelated note')}>Publish unrelated state</button>
  <WorkforceSolutionPanel key={revision} page={page} onNavigate={setPage}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
