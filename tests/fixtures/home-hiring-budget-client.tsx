/** Real conversation hooks, review components and DecisionStore; offline transport only. */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useProblemConversation} from '../../components/problem-conversation';
import {useHomeSolutionConversation} from '../../components/use-home-solution-conversation';
import {HomeSolutionConversationReview} from '../../components/home-solution-conversation-review';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {buildHomePack} from '../../lib/home-pack.mjs';
const evidence=buildHomePack({},'All company','');
function Fixture(){
 const conversation=useProblemConversation(),[text,setText]=useState(''),[scope,setScope]=useState('All countries; All business units; All levels');
 const controller=useHomeSolutionConversation({enabled:true,conversation,active:true,settled:true,evidence,scope,query:'',target:()=>null});
 return <main className="mx-auto max-w-4xl space-y-3 p-4">
  <form onSubmit={async e=>{e.preventDefault();await controller.send(text);setText('');}}>
   <label>Ask Workforce AI<textarea className="block w-full border p-2" value={text} onChange={e=>setText(e.target.value)} disabled={!controller.canSend}/></label>
   <button className="min-h-11 border p-2" disabled={!controller.canSend||controller.pending}>Send overview question</button>
  </form>
  <button className="min-h-11 border p-2" onClick={()=>setScope('Different workforce scope')}>Change workforce scope</button>
  <HomeSolutionConversationReview controller={controller} goal={conversation.focusedIssue} pack={evidence} showSaved={false}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<DatasetBoundary initialToken="legacy-v1:0"><Fixture/></DatasetBoundary>);
