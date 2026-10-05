import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SyntheticExitCountExample } from '../../components/synthetic-exit-count-example';
import artifact from '../../lib/data/forecast-consumer-view-v1.json';
function Fixture(){
 const [mode,setMode] = useState('current');
 const altered = structuredClone(artifact); altered.conditionalDemo.preview.conditional.remainingTotal = 999;
 return <main className="mx-auto max-w-5xl p-4"><label>Fixture evidence <select aria-label="Fixture evidence" value={mode} onChange={e=>setMode(e.target.value)}><option value="current">Current</option><option value="altered">Altered cache</option><option value="missing">Unavailable</option></select></label><SyntheticExitCountExample key={mode} consumer={mode==='current'?artifact:mode==='altered'?altered:null}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
