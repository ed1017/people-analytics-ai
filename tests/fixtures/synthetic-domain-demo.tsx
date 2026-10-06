import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {SyntheticDomainDemo} from '../../components/synthetic-domain-demo';
import artifact from '../../lib/data/synthetic-domain-demo-v1.json';
function Fixture(){const [mode,setMode]=useState('current');const changed=structuredClone(artifact);changed.domains.hiring.rows[0].values[0]=999;const evidence=mode==='missing'?null:mode==='altered'?changed:artifact;return <main className="mx-auto max-w-4xl p-3"><label>Fixture evidence<select aria-label="Fixture evidence" value={mode} onChange={e=>setMode(e.target.value)}><option>current</option><option>missing</option><option>altered</option></select></label><SyntheticDomainDemo domain="hiring" evidence={evidence}/><SyntheticDomainDemo domain="turnover" evidence={evidence}/></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
