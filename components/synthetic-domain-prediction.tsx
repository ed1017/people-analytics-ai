import {SyntheticDomainChart} from '@/components/synthetic-domain-chart';
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {formatDemoValue,demoDomainCopy,demoMethodLabels,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';

const month=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});

/** The same unranked method comparison on domain pages and Home. */
export function SyntheticDomainPrediction({domain,data}:{domain:SyntheticDemoDomain;data:typeof artifact}){
 const d=data.domains[domain];
 const columns=domain==='satisfaction'
  ?'@min-[44rem]:grid-cols-[fit-content(16rem)_minmax(0,1fr)]'
  :'@min-[50rem]:grid-cols-[fit-content(24rem)_minmax(0,1fr)]';
 return <div className="@container min-w-0">
  <div className={`grid min-w-0 items-start gap-3 ${columns}`}>
   <div className="min-w-0 max-w-full overflow-x-auto">
    <p className="text-xs font-semibold">3 prediction methods</p>
    <table className="w-full text-xs">
     <caption className="py-2 text-left font-medium">{demoDomainCopy[domain].unit}</caption>
     <thead><tr className="border-b text-left"><th scope="col" className="min-w-32 py-2 pr-3">Method</th>{d.rows.map(row=><th key={row.month} scope="col" className="whitespace-nowrap px-2 py-2 text-right">{month(row.month)}</th>)}</tr></thead>
     <tbody>{d.methods.map((method,index)=><tr key={method} className="border-b"><th scope="row" className="py-2 pr-3 text-left font-normal">{demoMethodLabels[method]}</th>{d.rows.map(row=><td key={row.month} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatDemoValue(domain,row.values[index])}</td>)}</tr>)}</tbody>
    </table>
   </div>
   <SyntheticDomainChart domain={domain} data={data}/>
  </div>
 </div>;
}
