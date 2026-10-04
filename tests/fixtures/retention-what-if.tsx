import {createRoot} from 'react-dom/client';
import {RetentionWhatIfPanel} from '@/components/retention-what-if-panel';
import {decisionStore} from '@/components/decision-store';
decisionStore.initialize(localStorage);
function select(id:string){const state=decisionStore.getSnapshot();decisionStore.saveGoals({...state.data.goals,activeId:id})}
function Fixture(){return <main className="p-4"><div className="flex flex-wrap gap-2"><button onClick={()=>select('retain')}>Retention goal</button><button onClick={()=>select('other')}>Other goal</button><button onClick={()=>{select('other');select('retain')}}>Rapid goal roundtrip</button><button onClick={()=>{const goals=decisionStore.getSnapshot().data.goals;decisionStore.saveGoals({...goals,goals:goals.goals.map(goal=>goal.id==='retain'?{...goal,statement:'Changed retention goal'}:goal)})}}>Edit goal statement</button><button onClick={()=>decisionStore.setField('retain','retentionWhatIfV1',{broken:true})}>Corrupt review</button></div><RetentionWhatIfPanel/></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
