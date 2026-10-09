"use client";

import { useState } from 'react';
import type { Preview } from '@/lib/synthetic-ta/v1';

const count = (value: number | null) => value === null ? 'Unavailable' : value.toLocaleString('en-US');
const month = (value: string) => new Date(value + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const methods = [
  { key: 'carryForward', label: 'Last count', color: '#2563eb', dash: '5 3' },
  { key: 'recentMean', label: 'Recent mean (3)', color: '#a855f7', dash: '2 3' },
  { key: 'dampedChange', label: 'Damped change', color: '#059669', dash: '8 3 2 3' },
] as const;

export function SyntheticTaPreview({ data }: { data: Preview }) {
  const [hover, setHover] = useState('Focus or hover a point for its month, method and count.');
  const history = data.history, forecasts = data.forecasts;
  const allMonths = [...history.map(r => r.month), ...forecasts.map(r => r.month)];
  const maximum = Math.ceil(Math.max(1, ...history.map(r => r.active ?? 0), ...forecasts.flatMap(r => methods.map(m => r[m.key]))) / 20) * 20;
  const width = Math.max(760, allMonths.length * 38), x = (i: number) => 40 + i * (width - 60) / Math.max(1, allMonths.length - 1), y = (v: number) => 136 - v / maximum * 108;
  const stageTotal = data.stages[0].count;
  return <main className="mx-auto max-w-6xl space-y-3 p-3 sm:p-5" data-source-version={data.version}>
    <header><h1 className="text-xl font-semibold">Talent Acquisition</h1><p className="text-sm text-muted-foreground">Synthetic company-wide history · {data.cutoff}</p></header>
    <section aria-labelledby="active-heading" className="rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="active-heading" className="font-semibold">Active requisitions at month-end</h2><p className="text-sm"><strong>{count(data.active)}</strong> at cutoff · {count(data.onHold)} on hold</p></div>
      <figure aria-label="Active requisitions: synthetic history and forecasts">
        <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-xs" aria-label="Chart legend"><span>● Synthetic history</span>{methods.map(m => <span key={m.key} className="inline-flex items-center gap-1"><svg width="28" height="12" aria-hidden="true"><line x1="0" x2="28" y1="6" y2="6" stroke={m.color} strokeWidth="2" strokeDasharray={m.dash} /></svg>{m.label} forecast</span>)}</div>
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">Scroll the chart to see all months.</p>
        <div className="overflow-x-auto rounded focus-visible:outline-2" tabIndex={0} role="region" aria-label="Scrollable requisition chart; use arrow keys to scroll">
          <svg width={width} height="194" viewBox={`0 0 ${width} 194`} className="block" role="group" aria-label="Requisition counts by month">
            {[0, maximum / 2, maximum].map(t => <g key={t}><line x1="36" x2={width - 12} y1={y(t)} y2={y(t)} stroke="currentColor" opacity=".12" /><text x="31" y={y(t) + 4} textAnchor="end" fill="currentColor" fontSize="12">{t}</text></g>)}
            {forecasts.length > 0 && <><line x1={x(history.length - .5)} x2={x(history.length - .5)} y1="14" y2="141" stroke="currentColor" strokeDasharray="3 3" /><text x={x(history.length - .5) + 4} y="14" fill="currentColor" fontSize="12">Forecast</text></>}
            {history.map((r, i) => {
              const previous = history[i - 1], label = `${month(r.month)} · Synthetic history · ${count(r.active)}${r.active === null ? ': snapshot coverage missing' : ' active requisitions'}`;
              return <g key={r.month}>
                {i > 0 && previous.active !== null && r.active !== null && <line x1={x(i - 1)} x2={x(i)} y1={y(previous.active)} y2={y(r.active)} stroke="currentColor" strokeWidth="2" />}
                <g tabIndex={0} role="img" aria-label={label} onFocus={() => setHover(label)} onMouseEnter={() => setHover(label)} onClick={() => setHover(label)} className="cursor-pointer focus-visible:outline-2" data-history-month={r.month}>
                  <rect x={x(i) - 10} y={(r.active === null ? 128 : y(r.active)) - 12} width="20" height="24" fill="transparent" />
                  {r.active === null ? <text x={x(i)} y="132" textAnchor="middle" fill="currentColor" fontSize="16">×</text> : <circle cx={x(i)} cy={y(r.active)} r="4" fill="currentColor" />}
                </g>
              </g>;
            })}
            {methods.map((m, methodIndex) => <g key={m.key}>{forecasts.map((r, j) => {
              const i = history.length + j, offset = (methodIndex - 1) * 10, previous = j ? forecasts[j - 1][m.key] : history.at(-1)?.active, label = `${month(r.month)} · ${m.label} forecast · ${r[m.key]} active requisitions`;
              return <g key={r.month}>
                {previous !== null && previous !== undefined && <line x1={x(i - 1) + (j ? offset : 0)} x2={x(i) + offset} y1={y(previous)} y2={y(r[m.key])} stroke={m.color} strokeWidth="2" strokeDasharray={m.dash} pointerEvents="none" />}
                <g tabIndex={0} role="img" aria-label={label} onFocus={() => setHover(label)} onMouseEnter={() => setHover(label)} onClick={() => setHover(label)} className="cursor-pointer focus-visible:outline-2" data-forecast-method={m.key}><rect x={x(i) + offset - 5} y={y(r[m.key]) - 5} width="10" height="10" fill={m.color} stroke="var(--background)" /><title>{label}</title></g>
              </g>;
            })}</g>)}
            {allMonths.map((m, i) => <text key={m} transform={`translate(${x(i)},158) rotate(-40)`} textAnchor="end" fill="currentColor" fontSize="12">{month(m)}</text>)}
          </svg>
        </div>
        <figcaption className="min-h-8 py-1 text-xs" aria-live="polite">{hover}</figcaption>
      </figure>
    </section>

    <section className="rounded-lg border p-3" aria-labelledby="funnel-heading">
      <h2 id="funnel-heading" className="font-semibold">Recruiting funnel</h2><p className="mb-2 text-xs text-muted-foreground">Cumulative stage attainment in the same application cohort, through {data.cutoff}</p>
      <ol aria-label="Cumulative recruiting stages" className="space-y-0.5">{data.stages.map((s, i) => {
        const next = data.stages[i + 1]?.count ?? s.count, top = stageTotal ? 100 * s.count / stageTotal : 0, bottom = stageTotal ? 100 * next / stageTotal : 0;
        const prior = i ? data.stages[i - 1].count : null;
        return <li key={s.stage} className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="py-1 text-sm"><span className="font-medium">{s.stage}</span> <strong>{count(s.count)}</strong><p className="text-xs text-muted-foreground">{prior === null ? 'Application cohort' : prior === 0 ? 'Conversion unavailable' : `${(s.count / prior * 100).toFixed(1)}% from prior stage`}</p></div>
          <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-11 w-full" aria-hidden="true"><polygon points={`${(100 - top) / 2},0 ${(100 + top) / 2},0 ${(100 + bottom) / 2},36 ${(100 - bottom) / 2},36`} fill="currentColor" opacity={.85 - i * .08} /></svg>
        </li>;
      })}</ol>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" aria-label="Mutually exclusive application outcomes">{Object.entries(data.outcomes).map(([label, n]) => <p key={label} className="rounded border px-2 py-1"><span className="block text-xs text-muted-foreground">{label}</span><strong>{count(n)}</strong></p>)}</div>
    </section>

    <details className="rounded-lg border px-3 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-2">Details</summary>
      <div className="space-y-3 pb-3">
        <p><strong>Source:</strong> {data.version}. Wholly synthetic records with no real identities, independently constructed rather than inferred from loaded records. {data.scope}. Cutoff {data.cutoff}; all generated events are assumed available on their event date. No selected filters apply.</p>
        <p><strong>Active:</strong> distinct requisitions opened or reopened by month-end and not filled or cancelled by that date. On-hold requisitions remain active, with their count shown separately; resuming does not add another requisition. Each requisition represents one modeled vacancy. Counts are stock, not monthly openings or a count of positions. Events on month-end apply that day. There is no 90-day maturity rule.</p>
        <p><strong>Coverage:</strong> January 2025 is a complete zero. March 2025 has a deliberately unavailable active snapshot (×); the underlying constructed events are retained but are not substituted for that missing snapshot. Later complete snapshots can recover coverage. All application events have complete coverage in this model. Missing snapshots are never interpreted as zero.</p>
        <p><strong>Funnel:</strong> distinct applications attaining each dated stage by cutoff, including applications later rejected or withdrawn. All modeled applications follow the same stage order. Outcome cards are mutually exclusive current outcomes and sum to Applied; they are not extra funnel stages. Hired uses the modeled actual start date and fills the associated requisition on that date. Accepted can later withdraw. This is not a current-stage inventory or proof of conversion in the loaded records.</p>
        <p><strong>Forecast methods:</strong> last complete count, rounded mean of the last three consecutive complete months, and recent average monthly change damped by 0.5 per horizon. Damped predictions are rounded and floored at zero. All require three complete consecutive snapshots ending at cutoff. Symbols are slightly offset within each month so overlapping methods remain selectable. These three-month stock baselines are unvalidated candidates, not selected winners, confidence intervals, future openings, or reconciled future recruiting flows.</p>
        <p><strong>Reconciliation at cutoff:</strong> {data.opened} distinct opened requisitions = {data.active} active + {data.filled} filled + {data.cancelled} cancelled. Hired applications = filled requisitions = {data.filled}. Application outcomes total {Object.values(data.outcomes).reduce((a, b) => a + b, 0)}.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="py-2 text-left font-medium">Month-end history and application events · {data.version}</caption><thead><tr><th className="p-2">Month</th><th>Active</th><th>Coverage</th><th>Applied</th><th>Hired</th></tr></thead><tbody>{history.map((r, i) => <tr key={r.month} className="border-t"><th className="p-2 text-left font-normal">{month(r.month)}</th><td>{count(r.active)}</td><td>{r.complete ? 'Complete' : 'Missing'}</td><td>{count(data.monthly[i].applications)}</td><td>{count(data.monthly[i].hires)}</td></tr>)}</tbody></table></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="py-2 text-left font-medium">Projected active requisitions</caption><thead><tr><th className="p-2">Month</th>{methods.map(m => <th key={m.key}>{m.label}</th>)}</tr></thead><tbody>{forecasts.map(r => <tr key={r.month} className="border-t"><th className="p-2 text-left font-normal">{month(r.month)}</th>{methods.map(m => <td key={m.key}>{count(r[m.key])}</td>)}</tr>)}</tbody></table></div>
        <p className="text-xs">Local preview only. The published TA summaries, Home hiring projection, AI requests and planning timing evidence still use their existing sources. This population must not be combined with those counts.</p>
      </div>
    </details>
  </main>;
}
