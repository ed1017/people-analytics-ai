import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {homeForecastChartDomain} from '@/lib/home-forecast';
import {resolveSyntheticDomainDemo,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
import {SyntheticDomainChart} from '@/components/synthetic-domain-chart';
export function HomeForecastChart({question,answer}:{question:string;answer:string}) {
 const domain=homeForecastChartDomain(question,answer);if(!domain)return null;
 return <section aria-label="Turnover projection for this answer" className="my-3 min-w-0 rounded-lg border p-3">
  <p className="mb-2 text-xs text-muted-foreground">Fixed simulated company-wide projection · Cutoff 30 Sep 2026 · Your goal and workforce filters do not change these values.</p>
  <SyntheticDomainChart domain={domain} data={artifact}/>
 </section>;
}

/** Starter charts use the same verified artifact and chart as the domain pages. */
export function HomeStarterForecastChart({domain}:{domain:SyntheticDemoDomain}){
 const view=resolveSyntheticDomainDemo(artifact);if(view.status!=='ready'||view.data.domains[domain].status!=='predicted')return null;
 return <section aria-label={`${domain[0].toUpperCase()+domain.slice(1)} projection for this starter`} className="my-3 min-w-0 rounded-lg border p-3">
  <p className="mb-2 text-xs text-muted-foreground">Fixed simulated company-wide population · Cutoff 30 Sep 2026 · Separate from recorded workforce evidence.</p>
  <SyntheticDomainChart domain={domain} data={view.data}/>
  <p className="mt-2 text-xs text-muted-foreground">All three methods are unselected. Their spread is not an uncertainty interval; confidence intervals and intervention effects are unavailable.</p>
 </section>;
}
