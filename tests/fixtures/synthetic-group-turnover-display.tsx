import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {SyntheticExitCountExample} from '../../components/synthetic-exit-count-example';
import artifact from '../../lib/data/synthetic-group-turnover-consumer-v1.json';
function Fixture(){const [mode,setMode]=useState('current');const changed=structuredClone(artifact);changed.cases[0].assessment.methods[0].expectedTotal=999;const evidence=mode==='missing'?null:mode==='altered'?changed:artifact;return <main className="mx-auto max-w-4xl p-3"><h1>Forecast disclosure fixture</h1><label>Fixture group evidence<select aria-label="Fixture group evidence" value={mode} onChange={e=>setMode(e.target.value)}><option>current</option><option>missing</option><option>altered</option></select></label><SyntheticExitCountExample key={mode} groupEvidence={evidence}/></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
