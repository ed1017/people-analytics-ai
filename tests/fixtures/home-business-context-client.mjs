/** Real conversation hooks and DecisionStore; the browser runner owns only transport and timing. */
import React,{useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {useProblemConversation} from '../../components/problem-conversation.tsx';
import {useHomeSolutionConversation} from '../../components/use-home-solution-conversation.ts';
import {decisionStore} from '../../components/decision-store.ts';
import {DatasetBoundary} from '../../components/dataset-boundary.tsx';
import {buildHomePack} from '../../lib/home-pack.mjs';
const evidence=buildHomePack({},'All company','');
function Fixture(){
 const conversation=useProblemConversation(),[context,setContext]=useState({scope:'All countries; All business units; All levels',query:''});
 const controller=useHomeSolutionConversation({enabled:true,conversation,active:true,settled:true,evidence,...context,target:()=>null});
 useLayoutEffect(()=>{window.businessHarness={controller,conversation,context,change:next=>flushSync(()=>setContext(next)),snapshot:()=>decisionStore.getSnapshot()};});
 return React.createElement('p',null,controller.notice||'Context regression fixture');
}
createRoot(document.getElementById('root')).render(React.createElement(DatasetBoundary,{initialToken:'legacy-v1:0'},React.createElement(Fixture)));
