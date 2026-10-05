import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SyntheticExitCountExample} from '../../components/synthetic-exit-count-example';
import artifact from '../../lib/data/analysis-demo-display-v1.json';

function Fixture() {
  const [mode, setMode] = useState('current');
  const altered = structuredClone(artifact); altered.hiring.cases[0].selectedBrier = 999;
  const staleSatisfaction = structuredClone(artifact); staleSatisfaction.evidenceIdentities.satisfaction = '0'.repeat(64);
  const analysis = mode === 'current' ? artifact : mode === 'altered' ? altered : mode === 'stale-satisfaction' ? staleSatisfaction : null;
  return <main className="mx-auto max-w-5xl p-4"><label>Fixture evidence <select value={mode} onChange={e => setMode(e.target.value)}><option value="current">Current</option><option value="altered">Altered hiring comparison</option><option value="stale-satisfaction">Stale satisfaction evidence</option><option value="missing">Unavailable</option></select></label><SyntheticExitCountExample key={mode} analysis={analysis}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
