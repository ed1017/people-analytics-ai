"use client";
import {useId,useState} from 'react';
import {UK_HIRING_SOURCE as source,UK_HIRING_DIFFICULTY,findHiringDifficulty,hiringPercent} from '@/lib/uk-hiring-difficulty';

export function UkHiringDifficulty() {
  const id=useId(), [code,setCode]=useState('K02000001');
  const selected=findHiringDifficulty(code);
  return <section aria-labelledby={`${id}-title`} className="mt-4 min-w-0 space-y-3 rounded-xl border p-3">
    <div><h3 id={`${id}-title`} className="text-lg font-bold">Hiring difficulty</h3><p className="text-sm text-muted-foreground">Professional occupations · 2024 · All sectors</p></div>
    <label className="block max-w-sm text-sm font-semibold" htmlFor={`${id}-nation`}>Nation
      <select id={`${id}-nation`} aria-label="Hiring difficulty nation" value={code} onChange={event=>setCode(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {UK_HIRING_DIFFICULTY.map(row=><option key={row.code} value={row.code}>{row.nation}</option>)}
      </select>
    </label>
    {!selected ? <p role="status">Choose a supported nation.</p> : <>
      <p role="status" aria-live="polite" className="text-sm">{selected.hardToFillPercent === null ? `Hiring difficulty is unavailable for ${selected.nation}.` : <><strong>{hiringPercent(selected.hardToFillPercent)}</strong> of professional vacancies in {selected.nation} were hard to fill.</>}</p>
      <figure className="space-y-3"><figcaption className="text-xs text-muted-foreground">Share of vacancies · 0–100%</figcaption>
        {([{label:'Hard to fill',value:selected.hardToFillPercent},{label:'Skill-shortage vacancies',value:selected.skillShortagePercent}]).map(item=><div key={item.label}>
          <div className="flex flex-wrap justify-between gap-x-3 text-sm"><span>{item.label}</span><strong className="tabular-nums">{hiringPercent(item.value)}</strong></div>
          <div aria-hidden="true" className="mt-1 h-3 rounded bg-muted">{item.value !== null && <div className="h-3 rounded bg-primary" style={{width:`${item.value}%`}}/>}</div>
        </div>)}
      </figure>
      <details className="text-sm text-muted-foreground"><summary className="min-h-11 w-fit cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Details</summary>
        <div className="space-y-2">
          <p>{source.taxonomy}; {selected.nation}; vacancies reported during 2024 survey fieldwork (June 2024–January 2025).</p>
          <p>Hard-to-fill vacancies reflect employer-reported recruitment difficulty. Skill-shortage vacancies are the subset attributed to a lack of skills, qualifications or experience. Both percentages use all vacancies in this occupation group as their denominator; the bars overlap.</p>
          <p>This broad occupation group is separate from the software pay reference above. It does not measure available applicants or days to hire, and is not mapped to an internal role or city.</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1"><dt>Occupation/site sample</dt><dd className="text-right tabular-nums">{selected.sample.toLocaleString('en-GB')}</dd><dt>Estimated vacancies</dt><dd className="text-right tabular-nums">{selected.vacancies?.toLocaleString('en-GB')??'Unavailable'}</dd><dt>Hard-to-fill vacancies</dt><dd className="text-right tabular-nums">{selected.hardToFillVacancies?.toLocaleString('en-GB')??'Unavailable'}</dd><dt>Skill-shortage vacancies</dt><dd className="text-right tabular-nums">{selected.skillShortageVacancies?.toLocaleString('en-GB')??'Unavailable'}</dd></dl>
          <p>The sample is the unweighted number of occupations for which sites had at least one vacancy in this SOC code. Vacancy estimates are weighted and rounded; percentages retain the published calculation. Suppressed or unavailable cells stay unavailable.</p>
          <p>{source.attribution} Data published {source.publishedAt}; retrieved {source.retrievedAt}. Report corrected June 2026.</p>
          <div className="flex flex-wrap gap-x-4">{([{label:'Official data',url:source.sourceUrl},{label:'Methodology',url:source.methodologyUrl},{label:'Open Government Licence',url:source.licenseUrl}]).map(link=><a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{link.label}<span className="sr-only"> (opens a new tab)</span></a>)}</div>
        </div>
      </details>
    </>}
  </section>;
}
