import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TalentAcquisitionPage} from '../../components/pages/talent-acquisition-page';
import {CalibratedTaPanels} from '../../components/calibrated-ta-panels';
import {HomeForecastChart,HomeStarterForecastChart} from '../../components/home-forecast-chart';
import {homeForecastAnswer} from '../../lib/home-forecast';
import {taExtension} from '../../lib/synthetic-ta/extension';
import targets from '../../lib/synthetic-ta/calibration-targets-v2.json';
function Fixture(){
 const [mode,setMode]=useState('TA');
 const data={as_of:targets.cutoff,summary:targets.summary,monthly:targets.monthly,sources:[],business_units:[],recruiters:[],modeled_extension:mode==='Stale'?null:taExtension};
 const missing={...taExtension,history:taExtension.history.map((r,i)=>({...r,active:i===24?null:i===25?0:r.active}))};
 return <main><nav className="flex flex-wrap gap-2 p-2">{['TA','Home','Stale','Null observations'].map(m=><button className="min-h-11 rounded border p-2" key={m} onClick={()=>setMode(m)}>{m}</button>)}</nav>
 {mode==='Home'?<div className="p-3"><HomeForecastChart question="Forecast hiring" answer={homeForecastAnswer('Forecast hiring')!} taReady/><HomeStarterForecastChart domain="hiring" taReady/></div>:mode==='Null observations'?<CalibratedTaPanels data={missing}/>:<TalentAcquisitionPage data={data} loading={false} error={null}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
