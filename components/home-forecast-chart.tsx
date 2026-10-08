import {SyntheticDomainPrediction} from '@/components/synthetic-domain-prediction';
import {CalibratedTaPanels} from "@/components/calibrated-ta-panels";
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {homeForecastChartDomain} from '@/lib/home-forecast';
import {resolveSyntheticDomainDemo,demoDomainCopy,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
import {SyntheticDomainChartNotes} from '@/components/synthetic-domain-chart';
function HomeForecastDetails({domain,data}:{domain:SyntheticDemoDomain;data:typeof artifact}){
 return <details><summary className="min-h-11 cursor-pointer py-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring">Details</summary><div className="space-y-2 break-words text-xs">
  <p>Fixed simulated company-wide population, separate from recorded workforce evidence. Your goal and workforce filters do not change these values. Operational forecasts are unavailable.</p>
  <p>Cutoff 30 Sep 2026 · History through {new Date(data.domains[domain].support.lastPeriod+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'})} · Intervals unavailable.</p>
  <p>Constructed synthetic demonstration: {data.historyCases} histories, {data.monthsPerHistory} months each. Fixed stable-mechanism case, seed {data.seed}; methods use only releases available at the cutoff.</p>
  <p>{demoDomainCopy[domain].assumption}</p>
  <SyntheticDomainChartNotes domain={domain} data={data}/>
  <p>All three methods are shown; none is designated as preferred. Their spread is not an uncertainty interval; confidence intervals and intervention effects are unavailable. No real-world accuracy is established.</p>
  <a className="inline-block min-h-11 py-2 text-primary underline" target="_blank" rel="noreferrer" href={'https://github.com/ed1017/people-analytics-ai/blob/'+data.evidence.commit+'/docs/synthetic-domain-predictions-v1.md'}>Source methods and complete comparisons</a>
  <p>Report SHA-256: {data.evidence.reportSha256}</p>
 </div></details>;
}
export function HomeForecastChart({question,answer,taReady=false}:{question:string;answer:string;taReady?:boolean}) {
 const domain=homeForecastChartDomain(question,answer);if(!domain)return null;
 if(domain==="hiring")return !taReady?null:<div className="my-3"><CalibratedTaPanels chartOnly /></div>;
 return <section aria-label="Turnover projection for this answer" className="my-3 min-w-0 rounded-lg border p-3">
  <SyntheticDomainPrediction domain={domain} data={artifact}/>
  <HomeForecastDetails domain={domain} data={artifact}/>
 </section>;
}

/** Starter charts use the same verified artifact and chart as the domain pages. */
export function HomeStarterForecastChart({domain,taReady=false}:{domain:SyntheticDemoDomain;taReady?:boolean}){
 if(domain==="hiring")return !taReady?null:<div className="my-3"><CalibratedTaPanels chartOnly /></div>;
 const view=resolveSyntheticDomainDemo(artifact);if(view.status!=='ready'||view.data.domains[domain].status!=='predicted')return null;
 return <section aria-label={`${domain[0].toUpperCase()+domain.slice(1)} projection for this starter`} className="my-3 min-w-0 rounded-lg border p-3">
  <SyntheticDomainPrediction domain={domain} data={view.data}/>
  <HomeForecastDetails domain={domain} data={view.data}/>
 </section>;
}
