import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {homeForecastChartDomain} from '@/lib/home-forecast';
import {SyntheticDomainChart} from '@/components/synthetic-domain-chart';
export function HomeForecastChart({question,answer}:{question:string;answer:string}) {
 const domain=homeForecastChartDomain(question,answer);if(!domain)return null;
 return <section aria-label="Turnover projection for this answer" className="my-3 min-w-0 rounded-lg border p-3">
  <p className="mb-2 text-xs text-muted-foreground">Fixed simulated company-wide projection · Cutoff 30 Sep 2026 · Your goal and workforce filters do not change these values.</p>
  <SyntheticDomainChart domain={domain} data={artifact}/>
 </section>;
}
