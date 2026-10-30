import { resolveWorkforcePerformance, resolvePublicWorkforcePerformance, supportsPerformanceFilters, type PerformanceFilters } from '@/lib/workforce-performance';
import type { SelectedBusinessContext } from '@/lib/talent-evidence-scope';

/** One workforce, the existing top filters, and no fixture data imported at runtime. */
export function WorkforcePerformanceField({ value, filters, selectedContext, population, scopeReceipt, loading = false, ratingsOnly = false }: { value: unknown; filters: PerformanceFilters; selectedContext: SelectedBusinessContext; population?: number | null; scopeReceipt?: unknown; loading?: boolean; ratingsOnly?: boolean }) {
  const result = loading ? null : resolvePublicWorkforcePerformance(value, filters, population, scopeReceipt) ?? resolveWorkforcePerformance(value, filters, population);
  const counts = result?.counts;
  return <section className={ratingsOnly ? "min-w-0 rounded-lg border p-4" : "mb-6"} aria-label={ratingsOnly ? "Workforce performance" : "Workforce career measures"}>
    <p className="text-sm text-muted-foreground">Workforce at 30 Sep 2026 · 2026 year to date</p>
    <p className="mt-1 text-xs text-muted-foreground">{ratingsOnly && "Ratings scope: "}{selectedContext.country} · {selectedContext.businessUnit} · {selectedContext.level}</p>
    <div className={ratingsOnly ? "mt-2 min-w-0" : "mt-4 evidence-panel-grid grid min-w-0 gap-4"}>
      <section className={ratingsOnly ? "min-w-0" : "min-w-0 rounded-lg border p-4"} aria-label="Workforce performance ratings">
        <h3 className="font-semibold">Ratings distribution</h3>
        <p className="mt-1 text-xs text-muted-foreground">Employees by numeric rating · Counts</p>
        {counts ? <>
          <ul className={ratingsOnly ? "mt-3 space-y-2" : "mt-5 space-y-3"} aria-label="Ratings distribution bar chart">
            {counts.ratings.map((n, i) => <li key={i} className="space-y-1 text-sm">
              <div className="flex justify-between gap-2"><span>Rating {i + 1}</span><span className="tabular-nums">{n.toLocaleString('en-US')}</span></div><div className="h-3 rounded bg-muted" aria-hidden="true"><div className="h-full rounded bg-primary" style={{ width: `${100 * n / Math.max(...counts.ratings)}%` }} /></div>
            </li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{counts.rated.toLocaleString('en-US')} rated / {counts.population.toLocaleString('en-US')} employees. Unavailable ratings: {counts.unavailable}.</p>
        </> : <p role="status" className="mt-3 text-sm text-muted-foreground">{!supportsPerformanceFilters(filters) ? 'Unavailable for this selection. Ratings support the whole company or one business unit only; select all countries and all levels.' : loading ? 'Loading ratings for the selected workforce…' : 'Ratings unavailable. Reload to try again.'}</p>}
      </section>
      {!ratingsOnly && <>
      <UnavailableMeasure title="Promotion rate" unit="Promoted employees / eligible employees · %" reason="Unavailable. A verified promotion-eligible population and linked promotion outcomes for this workforce and period are not available. Recorded event shares are not promotion rates." />
      <UnavailableMeasure title="Median time in prior level" unit="Months before promotion" reason="Unavailable. Verified prior-level start dates and linked promotion dates are not available for this workforce. Current tenure and recorded movement counts cannot establish this duration." />
      </>}
    </div>
    <details className="mt-3 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-2 font-medium">Details</summary><p>Numeric ratings are ordinal categories. Rating names, calibration and not-rated status are unavailable. The displayed September 30 date is a dataset convention.</p></details>
  </section>;
}
function UnavailableMeasure({ title, unit, reason }: { title: string; unit: string; reason: string }) {
  return <section className="min-w-0 rounded-lg border p-4" aria-label={title}><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{unit}</p><p role="status" className="mt-3 text-sm text-muted-foreground">Unavailable for this workforce and period.</p><details className="mt-2 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-2 font-medium">What is missing?</summary><p>{reason}</p></details></section>;
}
