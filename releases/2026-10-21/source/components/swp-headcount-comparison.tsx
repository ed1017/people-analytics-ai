'use client';

import {useId, useState} from 'react';
import type {SwpHistory} from '../lib/swp-history-qualification';
import {compareSwpHeadcount, maximumMonthlyCostPerEmployee, swpDemoDisclaimer, type SwpUserFlows, type SwpUserMonthlyCost} from '../experiments/swp-headcount/comparison';

const format = (v:number) => v.toLocaleString('en-US', {maximumFractionDigits:1});
const money = (v:number) => v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const monthLabel = (month:string) => new Date(month + '-01T00:00:00Z').toLocaleDateString('en-US', {month:'short',year:'numeric',timeZone:'UTC'});

export function SwpHeadcountComparison({history}:{history:SwpHistory}) {
  const id = useId();
  const [hires,setHires] = useState(''), [departures,setDepartures] = useState('');
  const [rate,setRate] = useState(''), [cost,setCost] = useState<SwpUserMonthlyCost|null>(null);
  const [assumptions,setAssumptions] = useState<SwpUserFlows|null>(null), [error,setError] = useState('');
  let comparison:ReturnType<typeof compareSwpHeadcount>;
  try {comparison = compareSwpHeadcount(history, assumptions, cost);} catch {return <section aria-label="Company headcount comparison"><p>{swpDemoDisclaimer}</p><p role="alert">This company-headcount demo is unavailable: the reviewed history could not be verified.</p></section>;}
  const edit = (field:'hires'|'departures'|'rate',value:string) => {if (field === 'hires') setHires(value); else if(field === 'departures') setDepartures(value); else setRate(value); setAssumptions(null); setCost(null); setError('');};
  const submit = (event:React.FormEvent) => {
    event.preventDefault();
    if (![hires,departures].every(v => /^\d+$/.test(v.trim()))) {setError('Enter both monthly counts. Use 0 only if you assume none.'); return;}
    const next:SwpUserFlows = {basis:'user-entered',monthlyHires:Number(hires),monthlyDepartures:Number(departures)};
    if(rate.trim() && !/^\d+(?:\.\d{1,2})?$/.test(rate.trim())) {setError('Enter a nonnegative monthly USD cost per employee with at most two decimal places, or leave it blank.');return;}
    const nextCost:SwpUserMonthlyCost|null = rate.trim() ? {basis:'user-entered',currency:'USD',unit:'per-employee-month',amount:Number(rate)} : null;
    try {compareSwpHeadcount(history,next,nextCost);setAssumptions(next);setCost(nextCost);setError('');} catch (e) {setAssumptions(null);setCost(null);setError(e instanceof Error ? e.message : 'Review your assumptions.');}
  };
  return <section aria-label="Company headcount comparison" style={{maxWidth:760,margin:'0 auto',fontSize:14,lineHeight:1.5,color:'#172033'}}>
    <h1 style={{fontSize:22,margin:'0 0 8px'}}>Compare company headcount</h1>
    <p style={{margin:'0 0 8px',padding:10,background:'#fff6df',borderRadius:6}}>{swpDemoDisclaimer}</p>
    <p>Company-wide · opening {format(comparison.opening)} people at 30 Sep 2026.<br/>Six month ends: Oct 2026–Mar 2027.</p>
    <details><summary className="min-h-11 cursor-pointer py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p><strong>Demo baseline:</strong> drift fitted to Jan 2024–Sep 2026 synthetic headcount. This extrapolation does not predict separate hires or departures.</p></details>
    <form onSubmit={submit} noValidate>
      <fieldset style={{border:'1px solid #cbd5e1',borderRadius:6,padding:12,margin:0}}>
        <legend>Your assumptions</legend>
        <p id={id+'-help'} style={{margin:'0 0 10px'}}>Total external hires and departures each month, held constant. These replace the baseline path; they are not additions to its growth.</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
          <label style={{flex:'1 1 160px'}}>Monthly hires<input aria-describedby={id+'-help'} inputMode="numeric" value={hires} onChange={e=>edit('hires',e.target.value)} style={{display:'block',width:'100%',minHeight:44,boxSizing:'border-box',padding:8,border:'1px solid #64748b',borderRadius:4}}/></label>
          <label style={{flex:'1 1 160px'}}>Monthly departures<input aria-describedby={id+'-help'} inputMode="numeric" value={departures} onChange={e=>edit('departures',e.target.value)} style={{display:'block',width:'100%',minHeight:44,boxSizing:'border-box',padding:8,border:'1px solid #64748b',borderRadius:4}}/></label>
        </div>
        <label style={{display:'block',marginTop:12}}>Monthly USD cost per employee (optional)<input inputMode="decimal" aria-describedby={id+'-cost-help'} value={rate} onChange={e=>edit('rate',e.target.value)} style={{display:'block',width:'100%',maxWidth:260,minHeight:44,boxSizing:'border-box',padding:8,border:'1px solid #64748b',borderRadius:4}}/></label>
        <p id={id+'-cost-help'} style={{margin:'6px 0'}}>Your assumed rate per employee per month, applied equally to both paths. No FTE scaling, component additions or currency conversion. Blank means unknown. Supported range: USD 0–{format(maximumMonthlyCostPerEmployee)} per employee per month.</p>
        <div style={{display:'flex',gap:12,marginTop:12}}><button type="submit" style={{minHeight:44,padding:'8px 14px'}}>Compare</button><button type="button" onClick={()=>{setHires('');setDepartures('');setRate('');setCost(null);setAssumptions(null);setError('');}} style={{minHeight:44,padding:'8px 14px'}}>Reset</button></div>
        {error && <p role="alert" style={{color:'#a11818'}}>{error}</p>}
      </fieldset>
    </form>
    <p role="status">{assumptions ? `Your scenario: ${format(assumptions.monthlyHires)} hires and ${format(assumptions.monthlyDepartures)} departures per month. Starting from ${format(comparison.opening)} people; internal transfers do not change company headcount.` : 'Enter both assumptions to compare. Blank values are unknown, not zero.'}</p>
    <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontVariantNumeric:'tabular-nums'}}>
      <caption style={{textAlign:'left',fontWeight:600,marginBottom:6}}>Month-end headcount · people</caption>
      <thead><tr>{['Month','Demo baseline','Your scenario','Difference'].map(t=><th key={t} scope="col" style={{padding:'8px 3px',textAlign:t==='Month'?'left':'right',verticalAlign:'bottom',borderBottom:'2px solid #cbd5e1'}}>{t}</th>)}</tr></thead>
      <tbody>{comparison.points.map(p=><tr key={p.month}><th scope="row" style={{padding:'8px 3px',textAlign:'left',fontWeight:400,borderBottom:'1px solid #e2e8f0'}}>{monthLabel(p.month)}</th>{[p.baseline,p.scenario,p.difference].map((v,i)=><td key={i} style={{padding:'8px 3px',textAlign:'right',borderBottom:'1px solid #e2e8f0'}}>{v===null?'—':(i===2&&v>0?'+':'')+format(v)}</td>)}</tr>)}</tbody>
    </table>
    {comparison.cost && <section aria-label="Assumed monthly cost run-rates" style={{marginTop:16}}>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p><strong>Your cost assumption: USD {money(comparison.cost.assumption.amount)} per employee per month.</strong> Calculated from your rate, not sourced actual cost or statistically predicted spend. Each row is a month-end monthly run-rate; no six-month spending total is calculated.</p></details>
      <h2 id={id+'-cost-table'} style={{fontSize:14,fontWeight:600,margin:'8px 0'}}>Assumed monthly cost run-rate · USD/month</h2>
      <p style={{margin:'0 0 6px',color:'#475569'}}>Scroll the table if needed to compare all columns.</p>
      <div style={{overflowX:'auto'}} tabIndex={0} role="region" aria-label="Monthly cost table">
        <table aria-labelledby={id+'-cost-table'} style={{width:'100%',minWidth:520,borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'}}>
          <thead><tr>{['Month','Baseline × rate','Scenario × rate','Difference'].map(t=><th key={t} scope="col" style={{padding:'8px 4px',textAlign:t==='Month'?'left':'right',borderBottom:'2px solid #cbd5e1'}}>{t}</th>)}</tr></thead>
          <tbody>{comparison.cost.points.map(p=><tr key={p.month}><th scope="row" style={{padding:'8px 4px',textAlign:'left',fontWeight:400,borderBottom:'1px solid #e2e8f0'}}>{monthLabel(p.month)}</th>{[p.baseline,p.scenario,p.difference].map((v,i)=><td key={i} style={{padding:'8px 4px',textAlign:'right',borderBottom:'1px solid #e2e8f0'}}>{v===null?'—':(i===2&&v>0?'+':'')+money(v)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>}
    <details><summary className="min-h-11 cursor-pointer py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p style={{color:'#475569'}}>Difference = your scenario − demo baseline. Costs unavailable from source: period, components and FTE basis are not qualified. No uncertainty interval is available.</p></details>
  </section>;
}
