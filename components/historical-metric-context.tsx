import {historicalContextText,historicalObservations,historicalMetrics,observationText,historicalContextLimit,type HistoricalMeasure} from '@/lib/home-metric-context';

export function HistoricalMetricContext({goal,measure,detailsOnly=false,inline=false}:{inline?:boolean;goal:string;measure?:HistoricalMeasure;detailsOnly?:boolean}){
 const text=historicalContextText(goal,measure);if(!text)return null;
 const observations=historicalObservations(measure),Container=inline?'div':'details',Heading=inline?'h4':'summary';
 return <section aria-label="Historical metric context" className="space-y-1 text-sm">
  {!detailsOnly&&<p>{text}</p>}
  <Container><Heading className="min-h-11 cursor-pointer py-2">Metric definitions and limits</Heading>
   {!observations.length&&<p>No historical metric snapshot stored.</p>}
   <ul className="list-disc pl-5">{observations.map(o=>{const m=historicalMetrics[o.metric];return <li key={o.metric}><p>{observationText(o)}</p><p>{m.population}. {m.statistic}. {m.period}. {m.denominator}. Source: {m.source}.{m.field}; as of {o.asOf??'Unknown'}.</p></li>;})}</ul>
   <p>{historicalContextLimit}</p>
   <p>Plan baseline and target require their own population and comparable observation periods. This context supplies neither pilot observations nor evidence of effectiveness.</p>
  </Container>
 </section>;
}
