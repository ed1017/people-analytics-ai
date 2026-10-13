import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {PlanningSessionProvider} from '../../components/workforce-planning/planning-session-context';
import {CapacityWorkspace} from '../../components/workforce-planning/capacity-workspace';
function Fixture(){
 const [goal,setGoal]=useState('a'),[dataset,setDataset]=useState('legacy-v1:0');
 return <><button onClick={()=>setGoal('a')}>Goal A</button><button onClick={()=>setGoal('b')}>Goal B</button><button onClick={()=>setDataset('capacity-fixture:1')}>Change dataset</button>
  <DatasetBoundary initialToken={dataset}><PlanningSessionProvider goalKey={`0:${goal}`} onTalentEvidenceContextChange={()=>{}}><CapacityWorkspace/></PlanningSessionProvider></DatasetBoundary>
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
