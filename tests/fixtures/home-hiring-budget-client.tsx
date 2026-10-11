/** Real conversation hooks, review components and DecisionStore; offline transport only. */
import {useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useProblemConversation} from '../../components/problem-conversation';
import {useHomeSolutionConversation} from '../../components/use-home-solution-conversation';
import {HomeSolutionConversationReview} from '../../components/home-solution-conversation-review';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {buildHomePack} from '../../lib/home-pack.mjs';
declare global {interface Window {__holdHiringReview?:boolean;__releaseHiringReview?:()=>void;__hiringFixture?:ReturnType<typeof useHomeSolutionConversation>;__lastHiringReview?:Awaited<ReturnType<ReturnType<typeof useHomeSolutionConversation>['reviewHiringPlan']>>;}}
const evidence=buildHomePack({},'All company','');
function Fixture(){
 const conversation=useProblemConversation(),[text,setText]=useState(''),[scope,setScope]=useState(()=>sessionStorage.getItem('fixture-scope')??'All countries; All business units; All levels');
 const controller=useHomeSolutionConversation({enabled:true,conversation,active:true,settled:true,evidence,scope,query:'',target:()=>null});
 useLayoutEffect(()=>{window.__hiringFixture=controller;});
 const delayedController={...controller,reviewHiringPlan:async(count:number)=>{const reviewed=await controller.reviewHiringPlan(count);window.__lastHiringReview=reviewed;if(window.__holdHiringReview)await new Promise<void>(resolve=>{window.__releaseHiringReview=resolve;});return reviewed;}};
 return <main className="mx-auto max-w-4xl space-y-3 p-4">
  <form onSubmit={async e=>{e.preventDefault();await controller.send(text);setText('');}}>
   <label>Ask Workforce AI<textarea className="block w-full border p-2" value={text} onChange={e=>setText(e.target.value)} disabled={!controller.canSend}/></label>
   <button className="min-h-11 border p-2" disabled={!controller.canSend||controller.pending}>Send overview question</button>
  </form>
  <button className="min-h-11 border p-2" onClick={()=>{sessionStorage.setItem('fixture-scope','Different workforce scope');setScope('Different workforce scope');}}>Change workforce scope</button>
  <HomeSolutionConversationReview controller={delayedController} goal={conversation.focusedIssue} pack={evidence} showSaved={true}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<DatasetBoundary initialToken="legacy-v1:0"><Fixture/></DatasetBoundary>);
