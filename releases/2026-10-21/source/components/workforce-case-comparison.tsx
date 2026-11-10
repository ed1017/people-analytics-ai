'use client';

import {useState} from 'react';
import {compareWorkforceCase, defaultWorkforceCaseControls, type WorkforceCaseControls} from '@/lib/workforce-case-study';

const money = (amount: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(amount);
const control = 'min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function WorkforceCaseComparison() {
  const [controls, setControls] = useState<WorkforceCaseControls>({...defaultWorkforceCaseControls});
  const result = compareWorkforceCase(controls);
  return <section aria-labelledby="case-comparison" className="space-y-5">
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">03 / Compare the decision</p>
      <h2 id="case-comparison" className="text-2xl font-semibold tracking-tight">When should you hire, move or develop people?</h2>
      <p className="text-sm leading-relaxed">Change the decision constraints. The same staffing calculator used by the app recalculates three illustrative strategies locally. No AI request, employee selection or workforce-data change occurs.</p>
    </div>
    <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
      <label className="space-y-2 text-sm font-medium">Full-readiness target
        <select className={control} value={controls.deadline} onChange={event => setControls({...controls, deadline: Number(event.target.value) as WorkforceCaseControls['deadline']})}>
          <option value={2}>After 2 months</option><option value={3}>After 3 months</option><option value={4}>After 4 months</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Six-month listed-cash budget
        <select className={control} value={controls.budget} onChange={event => setControls({...controls, budget: Number(event.target.value) as WorkforceCaseControls['budget']})}>
          <option value={250000}>USD 250,000</option><option value={500000}>USD 500,000</option><option value={650000}>USD 650,000</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Internal release premise
        <select className={control} value={String(controls.release)} onChange={event => setControls({...controls, release: event.target.value === 'true'})}>
          <option value="true">Assume people can be released</option><option value="false">People cannot be released</option>
        </select>
      </label>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      {result.options.map(option => <article key={option.id} aria-label={option.title} className={`space-y-4 rounded-xl border p-5 ${result.shortlist?.id === option.id ? 'border-primary bg-primary/5' : 'bg-background'}`}>
        <h3 className="min-h-12 font-semibold">{option.title}</h3>
        <p className="text-3xl font-semibold tracking-tight">{money(option.listedCash!)}<span className="mt-1 block text-xs font-normal text-muted-foreground">USD listed incremental cash · six months</span></p>
        <dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Full readiness</dt><dd className="font-medium">After {option.readyAfterMonths} months</dd></div><div className="flex justify-between gap-3"><dt>Entered training effort</dt><dd className="font-medium">{option.totalTrainingHours} hours</dd></div><div className="flex justify-between gap-3"><dt>Complete cost</dt><dd className="font-medium">Unverified</dd></div></dl>
        <p className="border-t pt-3 text-sm">{option.blockers.length ? option.blockers.join(' ') : 'Passes these assumed constraints. Operational feasibility remains unverified.'}</p>
      </article>)}
    </div>
    <div role="status" aria-live="polite" className="space-y-2 rounded-xl border-l-4 border-primary bg-muted/40 p-5">
      <h3 className="font-semibold">{result.shortlist ? `Conditional shortlist: ${result.shortlist.title.toLowerCase()}` : 'No displayed strategy passes the assumptions'}</h3>
      <p className="text-sm leading-relaxed">{result.shortlist ? `At ${money(result.shortlist.listedCash!)} listed cash, this is the lowest listed-cash option among these three that meets the entered timing, budget and release premises. Confirm role proficiency, release, backfill and full costs before proceeding.` : 'Revisit the scope, delivery target, budget or release constraint. A cheaper late option is not a solution to the current deadline.'}</p>
      <p className="text-xs text-muted-foreground">This is a comparison of assumptions, not a hiring approval, predicted outcome or measured saving. No option covers all 10 roles from day one.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setControls({...defaultWorkforceCaseControls})}>Reset case assumptions</button><p className="text-xs text-muted-foreground">Try a four-month target to see why developing people enters the shortlist.</p></div>
  </section>;
}
