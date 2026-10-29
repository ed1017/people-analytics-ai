import type {ReactNode} from 'react';

/** HTML bars keep exact values and selection available without SVG or hover. */
export function MarketEvidenceBars({title,unit,rows,onSelect}:{title:string;unit:string;rows:{id:string;label:string;value:number|null;text:string;selected:boolean}[];onSelect:(id:string)=>void}){
 const maximum=Math.max(0,...rows.flatMap(row=>row.value===null?[]:[row.value]));
 return <figure className="min-w-0 rounded-xl border p-4"><figcaption className="mb-4 font-semibold">{title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{unit} · bars start at zero</span></figcaption><ul className="space-y-4">{rows.map(row=><li key={row.id}><button type="button" aria-pressed={row.selected} onClick={()=>onSelect(row.id)} className="min-h-11 w-full rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><span className="flex flex-wrap justify-between gap-x-3 text-sm"><span className={row.selected?'font-semibold':''}>{row.label}{row.selected?' · Selected':''}</span><strong className="tabular-nums">{row.text}</strong></span><span aria-hidden="true" className="mt-2 block h-3 rounded bg-muted">{row.value!==null&&maximum>0&&<span className={`block h-3 rounded ${row.selected?'bg-primary':'bg-primary/40'}`} style={{width:`${100*row.value/maximum}%`}}/>}</span></button></li>)}</ul></figure>;
}

export function SkillNames({title,children}:{title:string;children:ReactNode}){
 return <div className="rounded-lg border p-3"><h4 className="mb-2 text-sm font-semibold">{title}</h4><p className="text-sm leading-6">{children}</p></div>;
}
