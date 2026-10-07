import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {homeForecastChartDomain} from '@/lib/home-forecast';
import {resolveSyntheticDomainDemo,demoDomainCopy,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
import {SyntheticDomainChart,SyntheticDomainChartNotes} from '@/components/synthetic-domain-chart';
function HomeForecastDetails({domain,data}:{domain:SyntheticDemoDomain;data:typeof artifact}){
 return <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring">Details: assumptions, methods and evidence</summary><div className="space-y-2 break-words text-xs">
  <p>Fixed simulated company-wide population, separate from recorded workforce evidence. Your goal and workforce filters do not change these values. Operational forecasts are unavailable.</p>
  <p>{demoDomainCopy[domain].assumption}</p>
  <SyntheticDomainChartNotes domain={domain} data={data}/>
  <p>All three methods are unselected. Their spread is not an uncertainty interval; confidence intervals and intervention effects are unavailable. No real-world accuracy is established.</p>
  <a className="inline-block min-h-11 py-2 text-primary underline" target="_blank" rel="noreferrer" href={'https://github.com/ed1017/people-analytics-ai/blob/'+data.evidence.commit+'/docs/synthetic-domain-predictions-v1.md'}>Source methods and complete comparisons</a>
  <p>Report SHA-256: {data.evidence.reportSha256}</p>
 </div></details>;
}
export function HomeForecastChart({question,answer}:{question:string;answer:string}) {
 const domain=homeForecastChartDomain(question,answer);if(!domain)return null;
 return <section aria-label="Turnover projection for this answer" className="my-3 min-w-0 rounded-lg border p-3">
  <p className="mb-2 text-xs text-muted-foreground">Fixed simulated company-wide projection · Cutoff 30 Sep 2026 · Goal and filters excluded · Methods unselected · Intervals unavailable.</p>
  <SyntheticDomainChart domain={domain} data={artifact}/>
  <HomeForecastDetails domain={domain} data={artifact}/>
 </section>;
}

/** Starter charts use the same verified artifact and chart as the domain pages. */
export function HomeStarterForecastChart({domain}:{domain:SyntheticDemoDomain}){
 const view=resolveSyntheticDomainDemo(artifact);if(view.status!=='ready'||view.data.domains[domain].status!=='predicted')return null;
 return <section aria-label={`${domain[0].toUpperCase()+domain.slice(1)} projection for this starter`} className="my-3 min-w-0 rounded-lg border p-3">
  <p className="mb-2 text-xs text-muted-foreground">Fixed simulated company-wide population · Cutoff 30 Sep 2026 · Goal and filters excluded · Methods unselected · Intervals unavailable.</p>
  <SyntheticDomainChart domain={domain} data={view.data}/>
  <HomeForecastDetails domain={domain} data={view.data}/>
 </section>;
}
