/** Real hooks/store; the browser test supplies a deferred, offline-only transport. */
import {useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {useProblemConversation} from '../../components/problem-conversation';
import {useHomeSolutionConversation} from '../../components/use-home-solution-conversation';
import {decisionStore} from '../../components/decision-store';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {buildHomePack} from '../../lib/home-pack.mjs';
const evidence=buildHomePack({},'All company','');
function Fixture(){
 const conversation=useProblemConversation();
 const controller=useHomeSolutionConversation({enabled:true,conversation,active:true,settled:true,evidence,scope:'All countries; All business units; All levels',query:'',target:()=>null});
 useLayoutEffect(()=>{Object.assign(window,{lateFixture:{controller,conversation,snapshot:decisionStore.getSnapshot,field:(id:string,field:string,value:unknown)=>decisionStore.setField(id,field,value)}});});
 return <><textarea aria-label="Draft request" value={conversation.input} onChange={e=>conversation.setInput(e.target.value)}/><button onClick={()=>conversation.recoverSaved()}>Keep saved versions and my request</button><output>{controller.pending?'Pending':'Idle'}</output></>;
}
createRoot(document.getElementById('root')!).render(<DatasetBoundary initialToken="legacy-v1:0"><Fixture/></DatasetBoundary>);
