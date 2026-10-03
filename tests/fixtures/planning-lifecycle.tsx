// Browser-only fixture for real React hooks; never imported by the product.
import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import type {SkillsResponse} from '../../lib/types';
import {createRoot} from 'react-dom/client';
import {usePlanningDecisionState} from '../../components/workforce-planning/use-planning-decision-state';
import {PlanningSessionProvider} from '../../components/workforce-planning/planning-session-context';
import {usePlanningEvidenceValidation} from '../../components/use-planning-evidence-validation';
import {SkillsEvidenceHandoffPanel} from '../../components/skills-evidence-handoff-panel';
import {decisionStore} from '../../components/decision-store';
import {createSkillsEvidenceHandoff} from '../../lib/evidence-handoff';
import {enterpriseTalentEvidenceScope} from '../../lib/talent-evidence-scope';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions';
import {skill,skillsData} from './skills-evidence.mjs';
const context={country:'All',businessUnit:'All',level:'All'};
const makePacket=(goal:string)=>{
 const result=createSkillsEvidenceHandoff({skillsData,skill,evidenceScope:enterpriseTalentEvidenceScope({label:'Company',asOf:skillsData.as_of,populationLabel:'employees',populationCount:10000,supportedBreakdowns:['skill']}),selectedBusinessContext:context,businessGoal:goal});
 if(!result.ok)throw Error(result.error);return result.value;
};
const packets={a:makePacket('Synthetic goal A'),b:makePacket('Synthetic goal B')};
const requests:Array<{signal:AbortSignal;reply:(body:unknown)=>void}>=[];
// Intentionally ignore cancellation at the transport layer to exercise late replies.
window.fetch=async(_url,options)=>new Promise<Response>(resolve=>requests.push({signal:options!.signal as AbortSignal,reply:body=>resolve(Response.json(body))}));
const setters:Record<string,Set<Dispatch<SetStateAction<number>>>>={};
const seed={version:1 as const,revision:1,goals:{version:1 as const,activeId:'a',goals:[{id:'a',statement:'Synthetic goal A'},{id:'b',statement:'Synthetic goal B'}]},workspaces:{a:{savedAt:'2026-10-03',fields:{'planning.fixture':7,brief:{owner:'Keep owner',approvals:[{text:'Keep approval',recordedAt:'2026-10-03'}]}}},b:{savedAt:'2026-10-03',fields:{'planning.fixture':21}}}};
localStorage.setItem(DECISIONS_STORAGE_KEY,encodeDecisions(seed));decisionStore.initialize(localStorage);
function PlanningValue({goal}:{goal:string}){
 const [value,setValue]=usePlanningDecisionState('fixture',0);
 useEffect(()=>{(setters[goal]??=new Set()).add(setValue)},[goal,setValue]);
 return <><output id="plan">{value}</output><button onClick={()=>{setValue(v=>v+1);setValue(v=>v+1)}}>Increment twice</button></>;
}
function Harness(){
 const [goal,setGoal]=useState<'a'|'b'|''>('a'),[active,setActive]=useState(true),[packet,setPacket]=useState<typeof packets.a|null>(packets.a),[renders,setRenders]=useState(0);
 const [skills,setSkills]=useState<SkillsResponse>(skillsData);
 const validation=usePlanningEvidenceValidation(goal,active,packet,skills,setSkills);
 return <>
  <button onClick={()=>setRenders(v=>v+1)}>Rerender</button><output id="renders">{renders}</output>
  <button onClick={()=>{setGoal('a');setPacket(packets.a)}}>Goal A</button><button onClick={()=>{setGoal('b');setPacket(packets.b)}}>Goal B</button>
  <button onClick={()=>{setGoal('');setPacket(null)}}>General exploration</button><button onClick={()=>{setGoal('b');setPacket(null)}}>Goal B without packet</button>
  <button onClick={()=>setActive(v=>!v)}>Toggle planning</button><button onClick={validation.refresh}>Refresh</button><button onClick={()=>setPacket(null)}>Clear packet</button>
  <output id="checking">{String(validation.checking)}</output><output id="freshness">{validation.freshness.status}</output><output id="asof">{skills.as_of}</output>
  <PlanningSessionProvider goalKey={'0:'+goal} onTalentEvidenceContextChange={()=>{}}><PlanningValue key={goal} goal={goal}/></PlanningSessionProvider>
  <SkillsEvidenceHandoffPanel key={goal} skillsData={skills} selectedContext={context} activeHandoff={packet} onCarryToPlanning={setPacket} onClearHandoff={()=>setPacket(null)} onOpenPlanning={()=>{}}/>
 </>;
}
declare global {interface Window {lifecycleFixture:{requests:()=>number;aborted:(i:number)=>boolean;reply:(i:number,asOf?:string)=>void;setterCount:(goal:string)=>number;saved:()=>unknown;publish:()=>void}}}
window.lifecycleFixture={requests:()=>requests.length,aborted:i=>requests[i].signal.aborted,reply:(i,asOf)=>requests[i].reply({...skillsData,as_of:asOf??skillsData.as_of}),setterCount:goal=>setters[goal]?.size??0,saved:()=>decisionStore.getSnapshot().data,publish:()=>decisionStore.setField('a','unrelated','Synthetic publication')};
createRoot(document.getElementById('root')!).render(<Harness/>);
