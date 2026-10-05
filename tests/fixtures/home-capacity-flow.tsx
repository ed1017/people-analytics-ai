import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {decisionStore} from '@/components/decision-store';
import {OverallOverviewPage} from '@/components/pages/overall-overview-page';
import {useProblemConversation} from '@/components/problem-conversation';
import {emptyDevelopmentSession} from '@/components/development-workspace';
import {WorkforceOptionActions} from '@/lib/workforce-option-actions';
import {ConversationMessages} from '@/components/goal-conversation-messages';
const noop=()=>{},development=emptyDevelopmentSession();
decisionStore.initialize(localStorage);
function Fixture(){
 const conversation=useProblemConversation(),[actions]=useState(()=>new WorkforceOptionActions()),[query,setQuery]=useState('?country=all');
 Object.assign(window,{
  capacityPinGoal:(goal:string)=>conversation.confirmWorkforceGoal(goal),
  capacityState:()=>decisionStore.getSnapshot(),
  changeCapacityScope:()=>setQuery('?country=US'),
  capacityRename:()=>conversation.updateFocusedIssue('A changed additional-role goal'),
  capacityRoundtrip:()=>{const goals=decisionStore.getSnapshot().data.goals;decisionStore.saveGoals({...goals,activeId:'other',goals:[...goals.goals,{id:'other',statement:'Other goal'}]});decisionStore.saveGoals(goals)},
 });
 return <main>
  <OverallOverviewPage optionActions={actions} onStartDemo={noop} active persona="HR" onNavigate={noop} workforceQuery={query} workforceScope="Synthetic all countries" conversation={conversation} developmentSession={development} countryOptions={[]} onCountry={noop} onEvidencePack={noop} marketReference={null}/>
  <section aria-label="Other page typography"><ConversationMessages messages={[{role:'assistant',content:'Other page body.\n\nSecond paragraph.'}]}/></section>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
