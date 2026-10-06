'use client';
import {useEffect,useId,useRef,useState} from 'react';
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {demoMethodLabels,demoDomainCopy,formatDemoValue,type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
const period=(value:string)=>new Date(value+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
const index=(value:string)=>Number(value.slice(0,4))*12+Number(value.slice(5,7));
const colors=['#2563eb','#b45309','#a855f7'];
export function SyntheticDomainChart({domain,data}:{domain:SyntheticDemoDomain;data:typeof artifact}){
 const d=data.domains[domain],id=useId(),[tip,setTip]=useState<string|null>(null),[width,setWidth]=useState(370),container=useRef<HTMLElement>(null);
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new ResizeObserver(entries=>{const next=Math.round(entries[0].contentRect.width);if(next>0)setWidth(next);});observer.observe(node);return()=>observer.disconnect();},[]);
 const history=domain==='satisfaction'?d.history:d.history.slice(-12);
 const values=[...history.flatMap(row=>row.value===null?[]:[row.value]),...d.rows.flatMap(row=>row.values)];
 if(!d.history.length||!d.rows.length||!values.length)return <p>Simulated history chart unavailable.</p>;
 const start=index(history[0].month),end=index(d.rows.at(-1)!.month),maximum=domain==='turnover'?Math.ceil(Math.max(...values)*1.12/10)*10:domain==='hiring'?1:100;
 const x=(month:string)=>58+(index(month)-start)/(end-start)*(width-78),y=(value:number)=>186-value/maximum*156;
 const paths:string[]=[];let active='';for(const row of history){if(row.value===null){if(active)paths.push(active);active='';}else active+=(active?' L':'M')+x(row.month)+','+y(row.value);}if(active)paths.push(active);
 const label=(month:string,value:number,name:string)=>`${period(month)} · ${name}: ${formatDemoValue(domain,value)}`;
 return <figure ref={container} aria-label={`${demoDomainCopy[domain].title}: simulated history and projections`} className="min-w-0 space-y-1">
  <figcaption className="text-xs font-medium">Simulated history → projections</figcaption>
  <svg viewBox={`0 0 ${width} 220`} role="img" aria-labelledby={id} className="w-full overflow-visible">
   <title id={id}>{demoDomainCopy[domain].unit}. Solid released history; dotted unselected methods. Unreleased periods remain gaps. Values are available in the tables.</title>
   {[0,.5,1].map(ratio=><g key={ratio}><line x1="58" x2={width-20} y1={y(maximum*ratio)} y2={y(maximum*ratio)} stroke="currentColor" opacity=".16"/><text x="52" y={y(maximum*ratio)+4} textAnchor="end" fill="currentColor" fontSize="12">{formatDemoValue(domain,maximum*ratio)}</text></g>)}
   {paths.map((path,i)=><path key={i} d={path} fill="none" stroke="currentColor" strokeWidth="2" data-series="history"/>)}
   {d.methods.map((method,i)=><path key={method} data-series={method} d={d.rows.length===1?`M${x(d.rows[0].month)-8},${y(d.rows[0].values[i])}h16`:d.rows.map((row,n)=>(n?'L':'M')+x(row.month)+','+y(row.values[i])).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={['2 4','5 4','8 3 2 3'][i]}/>)}
   {[{month:history[0].month,label:period(history[0].month)},...d.rows.filter((row,i)=>i===d.rows.length-1||i===0&&x(d.rows.at(-1)!.month)-x(row.month)>=36).map(row=>({month:row.month,label:period(row.month).slice(0,3)}))].map(row=><text data-axis="x" key={row.month} x={x(row.month)} y="210" textAnchor="middle" fill="currentColor" fontSize="12">{row.label}</text>)}
   {history.filter(row=>row.value!==null).map(row=><circle key={row.month} cx={x(row.month)} cy={y(row.value!)} r="3" fill="currentColor" tabIndex={0} aria-label={label(row.month,row.value!,'Released history')} onFocus={()=>setTip(label(row.month,row.value!,'Released history'))} onBlur={()=>setTip(null)} onMouseEnter={()=>setTip(label(row.month,row.value!,'Released history'))} onMouseLeave={()=>setTip(null)}><title>{label(row.month,row.value!,'Released history')}</title></circle>)}
   {d.rows.flatMap(row=>d.methods.map((method,i)=><circle key={row.month+method} cx={x(row.month)} cy={y(row.values[i])} r={3+i} fill="none" stroke={colors[i]} strokeWidth="2" tabIndex={0} aria-label={label(row.month,row.values[i],demoMethodLabels[method])} onFocus={()=>setTip(label(row.month,row.values[i],demoMethodLabels[method]))} onBlur={()=>setTip(null)} onMouseEnter={()=>setTip(label(row.month,row.values[i],demoMethodLabels[method]))} onMouseLeave={()=>setTip(null)}><title>{label(row.month,row.values[i],demoMethodLabels[method])}</title></circle>))}
  </svg>
  <p role="status" className="min-h-8 text-xs">{tip??(domain==='satisfaction'?'December is one future wave; dotted markers do not interpolate missing waves.':`Unreleased gap: ${d.gaps.map(period).join(', ')}. No history-to-forecast interpolation.`)}</p>
  <ul aria-label="Chart legend" className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><li>— Released history</li>{d.methods.map((method,i)=><li key={method} className="flex items-center gap-1"><svg width="22" height="10" aria-hidden="true"><line x1="0" x2="22" y1="5" y2="5" stroke={colors[i]} strokeWidth="2" strokeDasharray={['2 4','5 4','8 3 2 3'][i]}/></svg>{demoMethodLabels[method]}</li>)}</ul>
 </figure>;
}
