'use client';
import type {WorkforceFlow} from '@/lib/home-workforce-flows';
export function HomeWorkforceFlows({rows}:{rows:WorkforceFlow[]|null}){
 if(!rows?.length)return <p className="mt-3 text-xs text-muted-foreground">Monthly hires and separations are available for the verified company-wide snapshot only.</p>;
 const high=Math.max(1,...rows.flatMap(r=>[r.hires??0,r.separations??0])),top=Math.ceil(high/50)*50;
 const x=(i:number)=>12+85*i/Math.max(1,rows.length-1),y=(n:number)=>142-120*n/top;
 const label=(m:string)=>new Date(m+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
 return <figure aria-label="Monthly hires and separations" className="mt-4 min-w-0 space-y-2 border-t pt-3 text-sm">
  <h3 className="font-semibold">Monthly hires and separations</h3>
  <p className="text-xs text-muted-foreground">Company-wide synthetic workforce · {label(rows[0].month)}–{label(rows.at(-1)!.month)} · people per month</p>
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span style={{color:'#1d4ed8'}}>━━ Hires: external starts (derived)</span><span style={{color:'#b45309'}}>┄┄ Separations: all exits</span></div>
  <svg role="img" aria-label="Monthly external starts and total separations, counts. Exact values in the table below; missing months are not connected." width="100%" height="174">
   {[0,top/2,top].map(t=><g key={t}><line x1="12%" x2="97%" y1={y(t)} y2={y(t)} stroke="currentColor" opacity=".15"/><text x="10%" y={y(t)+4} textAnchor="end" fill="currentColor" fontSize="11">{t}</text></g>)}
   {(['hires','separations'] as const).map(key=>rows.map((row,i)=>{const value=row[key],previous=rows[i-1]?.[key],color=key==='hires'?'#1d4ed8':'#b45309';return value===null?null:<g key={key+row.month}>{i>0&&previous!=null&&<line x1={x(i-1)+'%'} x2={x(i)+'%'} y1={y(previous)} y2={y(value)} stroke={color} strokeWidth="2" strokeDasharray={key==='separations'?'5 3':undefined}/>}<circle tabIndex={0} aria-label={label(row.month)+': '+(key==='hires'?'External starts (derived)':'Total separations')+', '+value+' people'} cx={x(i)+'%'} cy={y(value)} r="3" fill={color}><title>{label(row.month)+' - '+(key==='hires'?'External starts (derived)':'Total separations')+': '+value+' people'}</title></circle></g>;}))}
   {[0,Math.floor((rows.length-1)/2),rows.length-1].filter((n,i,a)=>a.indexOf(n)===i).map((n,i,a)=><text key={n} x={x(n)+'%'} y="168" textAnchor={i===0?'start':i===a.length-1?'end':'middle'} fill="currentColor" fontSize="11">{label(rows[n].month)}</text>)}
  </svg>
  <figcaption className="text-xs text-muted-foreground">External starts = month-end headcount change + total exits. Separations include voluntary and involuntary exits. Internal moves and recruiting offer dates are excluded. Missing months remain gaps.</figcaption>
  <details><summary className="min-h-11 cursor-pointer py-2">Monthly counts and calculation</summary><div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Monthly workforce flows in people</caption><thead><tr><th scope="col">Month</th><th scope="col">External starts (derived)</th><th scope="col">Separations</th></tr></thead><tbody>{rows.map(r=><tr key={r.month}><th scope="row">{r.month}</th><td>{r.hires??'Unavailable'}</td><td>{r.separations??'Unavailable'}</td></tr>)}</tbody></table></div></details>
 </figure>;
}
