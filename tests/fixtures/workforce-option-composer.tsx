import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {WorkforceSolutionPanel} from '@/components/workforce-solution-panel';
import {OverallOverviewPage} from '@/components/pages/overall-overview-page';
import {useProblemConversation} from '@/components/problem-conversation';
import {emptyDevelopmentSession} from '@/components/development-workspace';
import {WorkforceOptionActions} from '@/lib/workforce-option-actions';
import {DECISIONS_STORAGE_KEY} from '@/lib/local-decisions';
const noop=()=>{},development=emptyDevelopmentSession();
if(!localStorage.getItem(DECISIONS_STORAGE_KEY))localStorage.setItem(DECISIONS_STORAGE_KEY,window.readinessSeed.encoded);
decisionStore.initialize(localStorage);
window.readinessSaved=()=>decisionStore.getSnapshot().data;
function Fixture(){
 const conversation=useProblemConversation(),storage=useDecisionStorage(),[actions]=useState(()=>new WorkforceOptionActions());
 Object.assign(window,{optionQA:()=>({history:conversation.history.current,goalContext:conversation.goalContext}),fixtureSetField:(field:string,value:unknown)=>decisionStore.setField('goal-readiness',field,value)});
 return <main>
 <button onClick={()=>conversation.selectGoal('goal-other')}>Goal B</button><button onClick={()=>conversation.selectGoal('goal-readiness')}>Goal A</button>
 <button onClick={()=>{decisionStore.saveGoals({...storage.data.goals,activeId:'goal-other'});decisionStore.saveGoals({...storage.data.goals,activeId:'goal-readiness'})}}>Batched goal roundtrip</button>
 <button onClick={()=>decisionStore.setField('goal-readiness','workforceSolution',window.readinessSeed.newer)}>Advance current inputs</button>
 <button onClick={()=>conversation.updateFocusedIssue('Changed synthetic goal')}>Change goal wording</button>
 <button onClick={()=>conversation.removeGoal()}>Delete goal</button>
 <button onClick={()=>{const prior=document.querySelector<HTMLButtonElement>('[aria-label="Workforce option actions"] button');conversation.setInput('Keep queued draft');prior?.click()}}>Queue draft then suggestion</button>
 <WorkforceSolutionPanel page="home" onNavigate={noop} optionActions={actions}/>
 <OverallOverviewPage optionActions={actions} onStartDemo={noop} active persona="HR" onNavigate={noop} workforceQuery="?country=all" workforceScope="Synthetic all countries" conversation={conversation} developmentSession={development} countryOptions={[]} onCountry={noop} onEvidencePack={noop} marketReference={null}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
