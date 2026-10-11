import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HomeSolutionConversationReview,HomeSolutionProposalLinks} from '../../components/home-solution-conversation-review';
import {emptySolutionState,type SolutionEvaluation} from '../../lib/home-solution-conversation';
const items=(window as unknown as {focusItems:SolutionEvaluation[]}).focusItems;
function Fixture(){
 const [focus,setFocus]=useState(items[0].id),[stale,setStale]=useState(false),[saved,setSaved]=useState('');
 const state={...emptySolutionState(),working:items,focusCandidateId:focus,...(stale?{constraints:[{action:'set' as const,field:'budget_usd' as const,number:1,text:null,unit:'USD',turnId:'fixture'}]}:{})};
 const controller={state,canSend:true,pending:false,saving:false,saved:null,save:async(item:SolutionEvaluation,_ack:boolean,goal:string)=>{setSaved(JSON.stringify({goal,participants:item.draft?.inputs.groups[0].count.value}));}} as unknown as Parameters<typeof HomeSolutionConversationReview>[0]['controller'];
 return <main className="mx-auto max-w-5xl space-y-3 p-3"><div className="flex gap-2"><button onClick={()=>setFocus(items[0].id)}>Focus A</button><button onClick={()=>setFocus(items[1].id)}>Focus B</button><button onClick={()=>setStale(true)}>Change constraints</button></div><output aria-label="Saved fixture">{saved}</output><HomeSolutionProposalLinks controller={controller}/><HomeSolutionConversationReview controller={controller} goal="" pack={null} showSaved={false}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
