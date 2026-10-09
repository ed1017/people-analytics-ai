/** Isolated real SWP components and local storage. No product route or provider. */
import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SwpGuidedJourney} from '../../components/swp-guided-journey';
import {decisionStore,switchDecisionDataset,useDecisionStorage} from '../../components/decision-store';
import type {ProblemConversation} from '../../components/problem-conversation';
import type {DemandIntakeControl} from '../../components/swp-demand-journey';
import type {Json} from '../../lib/local-decisions';
import type {DemandReview} from '../../lib/swp-demand';
function Harness(){
 const store=useDecisionStorage(),[input,setInput]=useState(''),[reply,setReply]=useState(''),[busy,setBusy]=useState(false),[active,setActive]=useState(true),[resetEpoch,setReset]=useState(0);
 const command=useRef<((text:string)=>Promise<string|null>)|null>(null),model=useRef<unknown>(null),demand=useRef<DemandIntakeControl|null>(null),review=useRef<((r:DemandReview)=>void)|null>(null),context=useRef<unknown>(null);
 const conversation={activeGoalId:store.data.goals.activeId,focusedIssue:store.data.goals.goals.find(g=>g.id===store.data.goals.activeId)?.statement??'',resetEpoch,storageReady:store.ready,input:'',beginGuidedExploration:()=>{},endGuidedExploration:()=>{},draftExample:()=>{},selectProposalGoal:(goal:{id:string;statement:string},revision:number,fields:Record<string,Json>)=>decisionStore.commitGoalSelection(goal.id,goal.statement,revision,new Date().toISOString(),()=>fields)} as unknown as ProblemConversation;
 return <main className="mx-auto max-w-4xl space-y-3 p-4">
  <h1>Isolated optional assumption editor</h1><p>Fictional local inputs only. No model, database or application server.</p>
  <label className="block">Fixture chat<input className="min-h-11 w-full rounded border p-2" value={input} onChange={e=>setInput(e.target.value)}/></label>
  <button className="min-h-11 rounded border p-2" onClick={async()=>setReply(await demand.current?.command(input)??'Natural-language request remains on the normal path; no fixture model call.')}>Send fixture request</button>
  <p data-testid="reply">{reply}</p>
  <div className="flex flex-wrap gap-2"><button onClick={()=>setBusy(v=>!v)}>Toggle busy</button><button onClick={()=>setReset(n=>n+1)}>Reset fixture conversation</button><button onClick={()=>setActive(v=>!v)}>Toggle navigation</button><button onClick={()=>switchDecisionDataset('editor-other:1')}>Switch fixture dataset</button></div>
  <SwpGuidedJourney conversation={conversation} active={active} busy={busy} commandRef={command} modelContextRef={model} demandControlRef={demand} demandReviewRef={review} demandContextRef={context} sources={[]} onNavigate={()=>{}}/>
  <output data-testid="saved" className="hidden">{JSON.stringify(store.data)}</output>
 </main>;
}
decisionStore.initialize(localStorage);
createRoot(document.getElementById('root')!).render(<Harness/>);
