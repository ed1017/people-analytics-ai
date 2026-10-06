import { resolveWorkforcePerformance, supportsPerformanceFilters, type PerformanceFilters } from '@/lib/workforce-performance';
import type { SelectedBusinessContext } from '@/lib/talent-evidence-scope';

/** One workforce, the existing top filters, and no fixture data imported at runtime. */
export function WorkforcePerformanceField({ value, filters, selectedContext, population, loading = false }: { value: unknown; filters: PerformanceFilters; selectedContext: SelectedBusinessContext; population?: number | null; loading?: boolean }) {
  const result = loading ? null : resolveWorkforcePerformance(value, filters, population);
  const counts = result?.counts;
  return <section className="mb-6" aria-label="Workforce career measures">
    <p className="text-sm text-muted-foreground">Demo data · Original workforce on 30 Sep 2026 · 2026 year to date</p>
    <p className="mt-1 text-xs text-muted-foreground">{selectedContext.country} · {selectedContext.businessUnit} · {selectedContext.level}</p>
    <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
      <section className="min-w-0 rounded-lg border p-4" aria-label="Workforce performance ratings">
        <h3 className="font-semibold">Ratings distribution</h3>
        <p className="mt-1 text-xs text-muted-foreground">Employees by numeric rating · Counts</p>
        {counts ? <>
          <ul className="mt-5 space-y-3" aria-label="Ratings distribution bar chart">
            {counts.ratings.map((n, i) => <li key={i} className="space-y-1 text-sm">
              <div className="flex justify-between gap-2"><span>Rating {i + 1}</span><span className="tabular-nums">{n.toLocaleString('en-US')}</span></div><div className="h-3 rounded bg-muted" aria-hidden="true"><div className="h-full rounded bg-primary" style={{ width: `${100 * n / Math.max(...counts.ratings)}%` }} /></div>
            </li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{counts.rated.toLocaleString('en-US')} rated / {counts.population.toLocaleString('en-US')} employees. Unavailable ratings: {counts.unavailable}. Not-rated status: not collected.</p>
        </> : <p role="status" className="flex min-h-48 items-center text-sm text-muted-foreground">{!supportsPerformanceFilters(filters) ? 'Unavailable for this selection. Ratings support the whole company or one business unit only; select all countries and all levels.' : loading ? 'Loading ratings for the selected workforce…' : 'Ratings unavailable. No active, validated aggregate release was returned for this workforce.'}</p>}
      </section>
      <UnavailableMeasure title="Promotion rate" unit="Promoted employees / eligible employees · %" reason="Unavailable. A verified promotion-eligible population and linked promotion outcomes for this workforce and period are not available. Recorded event shares are not promotion rates." />
      <UnavailableMeasure title="Median time in prior level" unit="Months before promotion" reason="Unavailable. Verified prior-level start dates and linked promotion dates are not available for this workforce. Current tenure and recorded movement counts cannot establish this duration." />
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Numeric ratings are ordinal categories; category names and calibration are unverified. The September 30 availability date is a simulated display convention, not a verified historical release date. These measures are descriptive only and excluded from AI evidence.</p>
  </section>;
}
function UnavailableMeasure({ title, unit, reason }: { title: string; unit: string; reason: string }) {
  return <section className="min-w-0 rounded-lg border p-4" aria-label={title}><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{unit}</p><p role="status" className="flex min-h-48 items-center text-sm text-muted-foreground">{reason}</p></section>;
}
