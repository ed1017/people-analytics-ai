import React,{StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useHomeMixSearch} from '../../components/use-home-mix-search';
import {homeMixRequestKey,type HomeMixAdapter,type HomeMixRequest,type HomeMixTrigger} from '../../lib/home-mix-orchestration';
type Source={budget:number;roles:number;costPolicy:string};
type Report={requestKey:string;budget:number;cash:number;status:'complete';candidateId:string};
declare global{interface Window{homeMixFixture:{calls:number;aborts:number;completed:number;lastBudget:number|null}}}
window.homeMixFixture={calls:0,aborts:0,completed:0,lastBudget:null};
const adapter:HomeMixAdapter<Source,Report>={
 version:'browser-fixture-v1',
 search:async(request,signal)=>{
  window.homeMixFixture.calls++;window.homeMixFixture.lastBudget=request.source.budget;
  signal.addEventListener('abort',()=>window.homeMixFixture.aborts++,{once:true});
  // Deliberately ignore cancellation to test stale-result protection in the actual hook.
  await new Promise(resolve=>setTimeout(resolve,request.source.budget===12345?900:40));
  window.homeMixFixture.completed++;
  return {requestKey:homeMixRequestKey(adapter.version,request),budget:request.source.budget,cash:487500,status:'complete',candidateId:'buy-5'};
 },
 read:(raw,request)=>{
  const value=raw as Report;return value?.requestKey===homeMixRequestKey(adapter.version,request)?value:null;
 },
};
function Probe({request,trigger,enabled,current}:{request:HomeMixRequest<Source>;trigger:HomeMixTrigger;enabled:boolean;current:boolean}){
 const state=useHomeMixSearch({adapter,request,trigger,enabled,isCurrent:()=>enabled&&current,debounceMs:150});
 return <section aria-label="Automatic mix result"><p aria-label="Search state">{state.status}</p>{state.status==='ready'&&<p aria-label="Candidate">Proposed candidate {state.report.candidateId}; cash {state.report.cash}; budget {state.report.budget}. Review before Apply or Attach.</p>}</section>;
}
function Fixture(){
 const [budget,setBudget]=useState(10000),[trigger,setTrigger]=useState<HomeMixTrigger>('initial'),[enabled,setEnabled]=useState(true),[mounted,setMounted]=useState(true),[renders,setRenders]=useState(0),[goal,setGoal]=useState('g'),[current,setCurrent]=useState(true);
 const request:HomeMixRequest<Source>={identity:{goalId:goal,bindingKey:goal+'-evidence-planning',inputKey:JSON.stringify([goal,budget]),bundleId:'A',revision:1,preparationId:'fixture'},source:{budget,roles:5,costPolicy:'cash-hours-v2'}};
 return <main><h1>Home search lifecycle fixture</h1><label>Budget<input value={budget} onChange={event=>{setBudget(Number(event.target.value));setTrigger('constraint-change');}}/></label><p>Renders {renders}</p>
  <div>{(['explanation','compare','attach','passive'] as const).map(event=><button key={event} onClick={()=>setTrigger(event)}>{event}</button>)}<button onClick={()=>setRenders(n=>n+1)}>Rerender</button><button onClick={()=>setEnabled(!enabled)}>Toggle active</button><button onClick={()=>setMounted(!mounted)}>Toggle mount</button><button onClick={()=>{setGoal(goal==='g'?'other':'g');setTrigger('initial');}}>Switch goal</button></div>
  <button onClick={()=>setCurrent(!current)}>Toggle current guard</button>
  {mounted&&<Probe request={request} trigger={trigger} enabled={enabled} current={current}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
