"use client";

import {useId, useMemo, useState, type ReactNode} from 'react';
import {readDashboardScopeReceipt} from '@/lib/dashboard-scope';
import type {PerformanceFilters} from '@/lib/workforce-performance';
import {
  HISTORY_VERSION, HISTORY_SEED, HISTORY_ITEMS, HISTORY_DATASET_TOKEN, HISTORY_BUNDLE_DIGEST,
  HISTORY_PERIODS, HISTORY_OPTIONS, defaultHistoryFilters, queryWorkforceHistory,
} from '@/lib/synthetic-workforce-history';

type Filters = ReturnType<typeof defaultHistoryFilters>;
type Result = ReturnType<typeof queryWorkforceHistory>;
type Cells = Result['ratings'];
type Dimension = 'orgs' | 'countries' | 'levels';
type Composition = 'businessUnits' | 'countries' | 'levels';
type Option = {value:string; label:string};
const control = 'min-h-11 min-w-0 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const button = 'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50';
const context = Object.freeze({datasetToken:HISTORY_DATASET_TOKEN,bundleDigest:HISTORY_BUNDLE_DIGEST});
const dimensions = [{key:'orgs',label:'Business units',singular:'business unit',source:'org'}, {key:'countries',label:'Countries',singular:'country',source:'country'}, {key:'levels',label:'Levels',singular:'level',source:'level'}] as const;
const groups = [{value:'all',label:'All people'}, {value:'unfavorable',label:'Unfavorable respondents'}, {value:'neutral',label:'Neutral respondents'}, {value:'favorable',label:'Favorable respondents'}] as const;
const number = (value:number|null) => value === null ? 'Withheld' : value.toLocaleString('en-US');

/** The receipt binds the current token and scope. The generated model supplies its own pinned digest. */
export function historyScopeKey(filters:PerformanceFilters, scopeReceipt:unknown, loading=false):string|null {
  if(loading)return null;
  const receipt=readDashboardScopeReceipt(scopeReceipt);
  if(receipt?.version!==3 || receipt.status!=='verified_public_aggregate' || receipt.datasetToken!==HISTORY_DATASET_TOKEN || !receipt.effective)return null;
  if(dimensions.some(({key,source})=>receipt.requested[source]!==filters[source] || receipt.effective?.[source]!==filters[source] || filters[source]!=='all' && !HISTORY_OPTIONS[key].some(option=>option.value===filters[source])))return null;
  return JSON.stringify([receipt.datasetToken,receipt.contract,receipt.cutoff,filters.org,filters.country,filters.level]);
}

export function initialHistoryFilters(scope:PerformanceFilters):Filters {
  const result=defaultHistoryFilters();
  for(const {key,source} of dimensions)result[key]=scope[source]==='all' ? HISTORY_OPTIONS[key].map(option=>option.value) : [scope[source]];
  return result;
}

export function SyntheticWorkforceHistory({filters,scopeReceipt,loading=false,children}:{filters:PerformanceFilters;scopeReceipt:unknown;loading?:boolean;children?:ReactNode}) {
  const scopeKey=historyScopeKey(filters,scopeReceipt);
  return scopeKey === null
    ? <div>{children}<div className="mt-3"><button type="button" disabled className={button}>History and survey filters</button><p role="status" className="mt-1 text-xs text-muted-foreground">{loading?'Loading the selected workforce.':'History is unavailable for the current dataset or scope.'}</p></div></div>
    : <HistorySession key={scopeKey} scope={filters} loading={loading}>{children}</HistorySession>;
}

function HistorySession({scope,loading=false,children}:{scope:PerformanceFilters;loading?:boolean;children?:ReactNode}) {
  const id=useId(),[open,setOpen]=useState(false),[filters,setFilters]=useState(()=>initialHistoryFilters(scope)),[composition,setComposition]=useState<Composition>('businessUnits');
  const result=useMemo(()=>open&&!loading?queryWorkforceHistory(filters,context):null,[open,filters,loading]);
  const change=(key:Dimension,values:string[])=>setFilters(previous=>({...previous,[key]:values}));
  const reset=()=>{setFilters(initialHistoryFilters(scope));setComposition('businessUnits');};
  return <div className="min-w-0">
    {!open && children}
    <button type="button" aria-expanded={open} aria-controls={`${id}-explorer`} className={`${button} mt-3`} onClick={()=>setOpen(value=>!value)}>{open?'Current ratings':'History and survey filters'}</button>
    {open && loading && <p role="status" className="py-3 text-sm">Loading the selected workforce.</p>}
    {open && result && <section id={`${id}-explorer`} aria-label="Historical workforce composition" className="mt-3 min-w-0 space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">Historical workforce composition</h3><p className="text-xs text-muted-foreground">Modeled history · Filters apply to this view</p></div><button type="button" className={button} onClick={reset}>Reset history filters</button></div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-medium" htmlFor={`${id}-period`}>Review year<select id={`${id}-period`} aria-label="History review year" className={control} value={filters.period} onChange={event=>setFilters(previous=>({...previous,period:event.target.value as Filters['period']}))}>{HISTORY_PERIODS.map(period=><option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium" htmlFor={`${id}-group`}>People to include<select id={`${id}-group`} aria-label="History respondent group" className={control} value={filters.sentiment} onChange={event=>setFilters(previous=>({...previous,sentiment:event.target.value as Filters['sentiment']}))}>{groups.map(group=><option key={group.value} value={group.value}>{group.label}</option>)}</select></label>
      </div>
      <details className="rounded-lg border px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">History filters <span className="font-normal text-muted-foreground">· {filters.orgs.length} business units, {filters.countries.length} countries, {filters.levels.length} levels</span></summary><div className="grid gap-3 pb-3 lg:grid-cols-3">{dimensions.map(({key,label,singular})=><MultiChoice key={key} label={label} singular={singular} options={HISTORY_OPTIONS[key]} selected={filters[key]} onChange={values=>change(key,values)}/>)}</div></details>
      {result.status==='available' ? <>
        <div role="status" aria-live="polite" aria-atomic="true"><p className="text-xl font-bold tabular-nums">{number(result.totals.people)} {filters.sentiment==='all'?'people':'respondents'}</p><p className="text-xs text-muted-foreground">{result.period && new Date(`${result.period.snapshotDate}T00:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})} · {number(result.totals.rated)} rated · {number(result.totals.respondents)} survey respondents</p></div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <HistoryBars title="Historical ratings distribution" cells={result.ratings}/>
          <div className="min-w-0"><label className="mb-2 block text-sm font-medium" htmlFor={`${id}-composition`}>Compare by<select id={`${id}-composition`} aria-label="History composition dimension" className={control} value={composition} onChange={event=>setComposition(event.target.value as Composition)}><option value="businessUnits">Business unit</option><option value="countries">Country</option><option value="levels">Level</option></select></label><HistoryBars title="Selected workforce composition" cells={result[composition]}/></div>
        </div>
      </> : <p role="status" aria-live="polite" className="rounded-lg bg-muted/40 p-3 text-sm">{result.status==='empty'?'No people match these filters. Select more groups or reset the filters.':result.status==='suppressed'?'Results are withheld for small groups. Broaden or reset the filters.':'This selection is unavailable. Reset the filters to continue.'}</p>}
      <details className="text-xs text-muted-foreground"><summary className="min-h-11 w-fit cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Details</summary><div className="space-y-2">
        <p>Version {HISTORY_VERSION}. This separately generated synthetic history uses the fictional company’s published period populations and survey respondent totals. Business-unit, country and level assignments are modeled cohort templates, not source employee records. Existing published ratings and survey results remain unchanged.</p>
        <p>Generation seed: {HISTORY_SEED}. Reverse-coded item: “{HISTORY_ITEMS.find(item=>item.reverse)?.label}” (6 minus the raw score).</p>
        <p>Each review year uses its matching year-end survey, or September 2026 for year to date. Unfavorable, neutral and favorable groups use each valid respondent’s mean of at least two generated 1–5 answers, after reverse coding: unfavorable ≤2, favorable ≥4, neutral between. These respondent groups are different from favorable-answer percentages.</p>
        <p>Selections combine with OR within a dimension and AND across dimensions. All people includes nonrespondents; the other groups include only matching valid survey respondents. Filters do not change other dashboard panels or saved plans.</p>
        <p>Nonzero groups and complements below 10 are withheld. Small chart cells and an additional complementary cell are withheld together with their percentages. This is a minimum-cohort display policy for reproducible fictional data, not an anonymization guarantee. Zero remains a known empty count.</p>
        {result.status==='available' && <><dl className="grid grid-cols-2 gap-x-3 gap-y-1"><dt>People without a rating</dt><dd className="text-right tabular-nums">{number(result.totals.notRated)}</dd><dt>People without a valid survey response</dt><dd className="text-right tabular-nums">{number(result.totals.nonrespondents)}</dd></dl><HistoryBars title="Generated respondent groups" cells={result.sentiments}/></>}
      </div></details>
    </section>}
  </div>;
}

function MultiChoice({label,singular,options,selected,onChange}:{label:string;singular:string;options:readonly Option[];selected:readonly string[];onChange:(values:string[])=>void}) {
  return <fieldset className="min-w-0"><legend className="text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-1"><button type="button" className={button} aria-label={`Select all ${label.toLowerCase()}`} onClick={()=>onChange(options.map(option=>option.value))}>All</button><button type="button" className={button} aria-label={`Clear ${label.toLowerCase()}`} onClick={()=>onChange([])}>Clear</button></div><div className="max-h-52 overflow-y-auto rounded border p-1">{options.map(option=><label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm"><input type="checkbox" aria-label={`${singular}: ${option.label}`} className="h-4 w-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" checked={selected.includes(option.value)} onChange={event=>onChange(event.target.checked?[...selected,option.value]:selected.filter(value=>value!==option.value))}/><span className="min-w-0 break-words">{option.label}</span></label>)}</div></fieldset>;
}

function HistoryBars({title,cells}:{title:string;cells:Cells}) {
  const max=Math.max(1,...cells.flatMap(cell=>cell.count===null?[]:[cell.count]));
  return <figure aria-label={title} className="min-w-0"><figcaption className="mb-2 text-sm font-semibold">{title}</figcaption><ul className="space-y-2">{cells.map(cell=><li key={cell.id} className="text-sm"><div className="flex justify-between gap-2"><span className="min-w-0 break-words">{cell.label}</span><span className="shrink-0 tabular-nums">{cell.count===null?'Withheld':number(cell.count)}</span></div>{cell.count!==null && <div aria-hidden="true" className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{width:`${100*cell.count/max}%`}}/></div>}</li>)}</ul></figure>;
}
