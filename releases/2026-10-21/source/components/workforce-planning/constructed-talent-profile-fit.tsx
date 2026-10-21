import type { ConstructedTalentProfileFitResponse } from "@/lib/types";

/** Constructed profile comparisons are separate from the legacy readiness classification. */
export function ConstructedTalentProfileFit({ data }: { data: ConstructedTalentProfileFitResponse }) {
  const fit = data.profile_fit;
  const metrics = [
    ["Preference pool", fit.eligible_profiles],
    ["All required thresholds met", fit.all_required_thresholds_met],
    ["Within demo gap rule", fit.within_two_skill_two_point_gap_rule],
    ["Beyond demo gap rule", fit.beyond_gap_rule],
    ["Unknown profile values", fit.unknown_profiles],
  ] as const;
  return <section aria-label="Constructed role profile fit" className="mt-4 rounded-md border p-4">
    <h5 className="font-semibold">Constructed profile fit</h5>
    <p className="mt-2 text-sm">Assessed readiness: <strong>Not assessed</strong>. Available movers and release capacity: <strong>Unknown</strong>.</p>
    <p className="mt-2 text-xs text-muted-foreground">{data.data_meta.sourceLabel}. These are authored skill values and recorded preferences at {data.as_of}, not assessed employee capability or availability. Company-wide scope; dashboard filters do not narrow this pool.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(([label, value]) => <div key={label} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p></div>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">The demo gap rule permits at most two missing thresholds and two total proficiency points. Unknown profiles are a separate bucket. All buckets partition the eligible preference pool, excluding current incumbents.</p>
    <p className="mt-3 text-sm">Catalog coverage within the demo gap rule: {fit.course_coverage.fully_covered.toLocaleString()} full, {fit.course_coverage.partly_covered.toLocaleString()} partial, {fit.course_coverage.uncovered.toLocaleString()} without a mapped course.</p>
    <p className="mt-1 text-xs text-muted-foreground">Course availability is not completion, proficiency gain or time to readiness. No assessed-ready or available-mover count is supplied.</p>
  </section>;
}
