"use client";
import {useEffect,useRef,useState} from 'react';
import {readMarketContext} from '@/lib/market-context-lookup';
import {positionMarketCatalogReferences} from '@/lib/position-market-context';
import {PositionMarketFacts} from './workforce-planning/position-market-context';
const references=positionMarketCatalogReferences();
const countryLabels:Record<string,string>={US:'United States',GB:'United Kingdom'};
const countries=[...new Set(references.map(r=>r.countryCode))].filter(code=>countryLabels[code]);
const control='min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const button='min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
type Lookup=ReturnType<typeof readMarketContext>;
export function HomeMarketContextExplorer({onClose}:{onClose:()=>void}){
 const [country,setCountry]=useState(''),[role,setRole]=useState(''),[result,setResult]=useState<Lookup|null>(null),[error,setError]=useState('');
 const countryRef=useRef<HTMLSelectElement>(null),resultsRef=useRef<HTMLDivElement>(null);
 const roles=[...new Set(references.filter(r=>r.countryCode===country).flatMap(r=>r.roles))].sort();
 useEffect(()=>{countryRef.current?.focus();},[]);
 useEffect(()=>{if(result)resultsRef.current?.focus();},[result]);
 function reset(){setCountry('');setRole('');setResult(null);setError('');countryRef.current?.focus();}
 function show(){if(!countries.includes(country)||!roles.includes(role))return;try{setResult(readMarketContext({country,role,occupationCode:null,kind:'all'}));setError('');}catch{setResult(null);setError('Market evidence could not be read. Choose a role and country again.');}}
 const available=result?.status==='available'&&'references' in result?result.references:null;
 return <section aria-label="Explore hiring market" className="mt-3 min-w-0 space-y-3 rounded-xl border bg-card p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">Explore the hiring market</h3><button type="button" className={button} onClick={onClose}>Close market evidence</button></div>
 <div className="grid min-w-0 gap-2 sm:grid-cols-2"><label className="min-w-0 text-sm">Country<select ref={countryRef} aria-label="Market evidence country" className={control} value={country} onChange={e=>{setCountry(e.target.value);setRole('');setResult(null);setError('');}}><option value="">Choose a country</option>{countries.map(code=><option key={code} value={code}>{countryLabels[code]}</option>)}</select></label><label className="min-w-0 text-sm">Role<select aria-label="Market evidence role" className={control} value={role} disabled={!country} onChange={e=>{setRole(e.target.value);setResult(null);setError('');}}><option value="">Choose a role</option>{roles.map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>
 <p className="text-xs text-muted-foreground">Available catalogue: United States and United Kingdom national references.</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!countries.includes(country)||!roles.includes(role)} onClick={show}>Show market evidence</button><button type="button" className={button} onClick={reset}>Reset market selection</button></div>
 {!result&&!error&&<p className="text-sm text-muted-foreground">Choose a country and role to see the available evidence.</p>}{error&&<p role="alert" className="text-sm">{error}</p>}
 {result&&<div ref={resultsRef} tabIndex={-1} aria-label="Market evidence results" className="min-w-0 space-y-3 focus-visible:ring-2 focus-visible:ring-ring"><h4 className="text-sm font-semibold">{role} · {countryLabels[country]}</h4>{available?<><div className="grid min-w-0 gap-3 xl:grid-cols-2">{available.map(reference=><article key={reference.id} className="min-w-0 space-y-2 rounded-lg border p-3"><h5 className="text-sm font-semibold">{reference.title}</h5><p className="text-xs text-muted-foreground">{reference.occupation} · {reference.geography} · {reference.period}</p><PositionMarketFacts reference={reference}/><details><summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring">Source details</summary><div className="space-y-2 text-sm"><p>{reference.population}. {reference.unit}.</p><p>Occupation {reference.occupationCode}. {reference.mappingDuties}</p><p>{reference.mappingLimit}</p><p>{reference.attribution}</p><a href={reference.sourceUrl} target="_blank" rel="noreferrer" className="inline-block min-h-11 py-2 text-primary underline">Official source</a><p><a href={reference.licenceUrl} target="_blank" rel="noreferrer" className="text-primary underline">{reference.licence}</a></p></div></details></article>)}</div></>:<p role="status" className="text-sm text-muted-foreground">{result.status==='needs-clarification'&&'question' in result?result.question:'No reviewed market evidence matches this selection.'}</p>}</div>}
 </section>;
}
