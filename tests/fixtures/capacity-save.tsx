import {createRoot} from 'react-dom/client';
import {decisionStore,useDecisionStorage,switchDecisionDataset} from '../../components/decision-store';
import {datasetSession} from '../../lib/dataset-client.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions,parseDecisions} from '../../lib/local-decisions';
import {PlanningSessionProvider} from '../../components/workforce-planning/planning-session-context';
import {CapacityWorkspace} from '../../components/workforce-planning/capacity-workspace';
let quota=false;
const seed={version:1 as const,revision:1,goals:{version:1 as const,activeId:'a',goals:[{id:'a',statement:'Review service capacity'},{id:'b',statement:'Review another workload'}]},workspaces:{a:{savedAt:'2026-10-13T20:00:00.000Z',fields:{'planning.savedScenarios':[{id:'legacy',name:'Keep me'}]}}}};
if(!localStorage.getItem(DECISIONS_STORAGE_KEY))localStorage.setItem(DECISIONS_STORAGE_KEY,encodeDecisions(seed));
decisionStore.initialize({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>{if(quota)throw Error('Quota fixture: storage full');localStorage.setItem(key,value);},removeItem:key=>localStorage.removeItem(key)});
datasetSession.bootstrap('legacy-v1:0');
function Fixture(){
 const storage=useDecisionStorage();
 const select=(id:string)=>decisionStore.saveGoals({...decisionStore.getSnapshot().data.goals,activeId:id});
 return <><nav aria-label="Fixture context"><button onClick={()=>select('a')}>Goal A</button><button onClick={()=>select('b')}>Goal B</button><button onClick={()=>select('')}>No goal</button><button onClick={()=>{quota=true;}}>Fail next save</button><button onClick={()=>{const data=parseDecisions(localStorage.getItem(DECISIONS_STORAGE_KEY)!);data.revision++;localStorage.setItem(DECISIONS_STORAGE_KEY,encodeDecisions(data));}}>Simulate other tab</button><button onClick={()=>datasetSession.bootstrap('capacity-save:1',switchDecisionDataset)}>Change dataset</button></nav>
 <PlanningSessionProvider goalKey={`0:${storage.data.goals.activeId}`} onTalentEvidenceContextChange={()=>{}}><CapacityWorkspace/></PlanningSessionProvider></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
