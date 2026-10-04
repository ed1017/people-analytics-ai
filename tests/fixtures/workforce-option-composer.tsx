declare global {interface Window {optionExecutions?:number}}
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
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
 const conversation=useProblemConversation(),storage=useDecisionStorage(),[actions]=useState(()=>{const bridge=new WorkforceOptionActions(),execute=bridge.execute.bind(bridge);bridge.execute=(...args)=>{window.optionExecutions=(window.optionExecutions??0)+1;return execute(...args)};return bridge});
 Object.assign(window,{optionQA:()=>({history:conversation.history.current,goalContext:conversation.goalContext}),fixtureSetField:(field:string,value:unknown)=>decisionStore.setField('goal-readiness',field,value)});
 return <main>
 <button onClick={()=>conversation.selectGoal('goal-other')}>Goal B</button><button onClick={()=>conversation.selectGoal('goal-readiness')}>Goal A</button>
 <button onClick={()=>{decisionStore.saveGoals({...storage.data.goals,activeId:'goal-other'});decisionStore.saveGoals({...storage.data.goals,activeId:'goal-readiness'})}}>Batched goal roundtrip</button>
 <button onClick={()=>decisionStore.setField('goal-readiness','workforceSolution',window.readinessSeed.newer)}>Advance current inputs</button>
 <button onClick={()=>conversation.updateFocusedIssue('Changed synthetic goal')}>Change goal wording</button>
 <button onClick={()=>conversation.removeGoal()}>Delete goal</button>
 <button onClick={()=>{const prior=document.querySelector<HTMLButtonElement>('[aria-label="Workforce option actions"] button');conversation.setInput('Keep queued draft');prior?.click()}}>Queue draft then suggestion</button>
 <button onClick={()=>{const prior=document.querySelector<HTMLButtonElement>('[aria-label="Workforce option actions"] button');prior?.click();decisionStore.saveGoals({...storage.data.goals,activeId:'goal-other'});decisionStore.saveGoals({...storage.data.goals,activeId:'goal-readiness'})}}>Click then goal roundtrip</button>
 <button onClick={()=>{document.querySelector<HTMLButtonElement>('[aria-label="Workforce option actions"] button')?.click();decisionStore.setField('goal-readiness','workforceSolution',window.readinessSeed.newer)}}>Click then change inputs</button>
 <button onClick={()=>{document.querySelector<HTMLButtonElement>('[aria-label="Workforce option actions"] button')?.click();decisionStore.setField('goal-readiness','workforceInspection','missing-result')}}>Click then change result</button>
 <OverallOverviewPage optionActions={actions} onStartDemo={noop} active persona="HR" onNavigate={noop} workforceQuery="?country=all" workforceScope="Synthetic all countries" conversation={conversation} developmentSession={development} countryOptions={[]} onCountry={noop} onEvidencePack={noop} marketReference={null}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
