import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HomeStarterForecastChart,HomeForecastChart} from '../../components/home-forecast-chart';
import {homeForecastAnswer} from '../../lib/home-forecast';
import {SyntheticDomainChart} from '../../components/synthetic-domain-chart';
import {SyntheticDomainDemo} from '../../components/synthetic-domain-demo';
import artifact from '../../lib/data/synthetic-domain-demo-v1.json';
function Fixture() {
  const [mode, setMode] = useState('verified');
  const [visible, setVisible] = useState(true);
  const data = structuredClone(artifact);
  if (mode === 'flat') {
    for (const [domain,d] of Object.entries(data.domains)) {
      const value = domain === 'hiring' ? .8 : 65;
      d.history.forEach(row => {if (row.value !== null) row.value = value});
      d.rows.forEach(row => {row.values = row.values.map(() => value)});
    }
  } else if (mode === 'singleton') {
    for (const d of Object.values(data.domains)) {d.history = []; d.rows = d.rows.slice(-1); d.gaps = []}
  } else if (mode === 'unavailable') {
    data.domains.hiring.history.forEach(row => {row.value = null});
    for (const d of Object.values(data.domains)) {d.rows = []; d.gaps = []}
    data.domains.turnover.history = []; data.domains.satisfaction.history = [];
  }
  return <main data-workspace-palette="slate-blue" className="mx-auto max-w-4xl bg-background p-3 text-foreground"><label>Chart fixture<select aria-label="Chart fixture" value={mode} onChange={e=>setMode(e.target.value)}><option>verified</option><option>flat</option><option>singleton</option><option>unavailable</option><option>home</option></select></label><button onClick={()=>setVisible(!visible)}>Toggle projection page</button>{visible && (['hiring','turnover','satisfaction'] as const).map(domain => mode === 'home' ? <HomeStarterForecastChart key={domain} domain={domain}/> : mode === 'verified' ? <SyntheticDomainDemo key={domain} domain={domain}/> : <section key={domain} className="my-6 border p-4"><SyntheticDomainChart domain={domain} data={data}/></section>)}{visible && mode === 'home' && <HomeForecastChart question="Forecast turnover" answer={homeForecastAnswer("Forecast turnover")!}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
