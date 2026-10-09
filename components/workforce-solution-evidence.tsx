import type {AppPage} from "@/lib/types";
import type {SolutionSection} from "@/lib/workforce-solution";
import {workforceReviewEvidence, type WorkforceReview} from "@/lib/workforce-solution-review";

const shown = (value: number | null) => value === null ? "Unknown" : value.toLocaleString();
const button = "min-h-10 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50";

export function WorkforceSolutionEvidence({review, page, editsBlocked, onReview}: {
  review: WorkforceReview; page: AppPage; editsBlocked: boolean;
  onReview: (section: SolutionSection) => void;
}) {
  const evidence = workforceReviewEvidence(review);
  const relevant = page === "skills" ? "skills" : ["learning-development", "development-planning"].includes(page) ? "learning" : page === "talent-acquisition" ? "hiring" : null;
  return <section aria-label="Evidence used for this workforce solution" className="space-y-3">
    <h4 className="font-semibold">Evidence used for this workforce solution</h4>
    <p className="text-sm">Destination: {evidence.businessUnit} · {evidence.role}. Workforce snapshot: {evidence.asOf ?? "Unknown"}. Synthetic company evidence, retained with this calculation.</p>
    <p className="text-xs">Internal readiness and recruiting history cover the role company-wide, not just the destination BU. Global filters and newer page charts do not change this saved evidence. Readiness has no independent assessment date.</p>
    {!evidence.scopeMatches && <p role="status" className="text-sm">Saved evidence scope could not be matched. Review the inputs and explicitly recalculate before relying on these signals.</p>}
    {(!relevant || relevant === "skills") && <details key={`skills-${page}`} open={relevant === "skills"} className="rounded border p-3">
      <summary className="cursor-pointer font-medium">Skills · whole-role readiness</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>Saved response: Build {review.input.build}, Move {review.input.move}, Buy {review.input.buy}.</p>
        <p>Eligible internal candidates: {shown(evidence.eligible)}. Whole-role ready: {shown(evidence.ready)}. Near ready: {shown(evidence.nearReady)}.</p>
        <p className="text-xs">These aggregates describe recorded skill requirements and role preferences. They do not establish availability, release approval or a commitment to fill these positions. Skill counts must not be added into whole-role capacity.</p>
        {evidence.skills.length ? <ul className="list-disc space-y-1 pl-5">{evidence.skills.map((skill, i) => <li key={i}>{skill.name} · {skill.importance ?? "Importance unknown"} · target proficiency {shown(skill.proficiency)}</li>)}</ul> : <p>No matched skill requirements are retained in this result.</p>}
        <button className={button} disabled={editsBlocked} onClick={() => onReview("response")}>Review response assumptions</button>
      </div>
    </details>}
    {(!relevant || relevant === "learning") && <details key={`learning-${page}`} open={relevant === "learning"} className="rounded border p-3">
      <summary className="cursor-pointer font-medium">L&amp;D · pathways and training assumptions</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>Near-ready candidates with pathways for all recorded gaps: {shown(evidence.fullyCovered)}; some gaps: {shown(evidence.partiallyCovered)}; no active pathway: {shown(evidence.noPathway)}.</p>
        <p>Saved Build assumption: {review.input.build} employees, {review.response.capacity_feasibility ? "assumed effective in" : "ready in"} {review.input.buildMonth || "an unknown month"}. Training cash: USD {review.input.trainingCash || "Unknown"}; total employee hours: {review.input.trainingHours || "Unknown"}.</p>
        {evidence.gaps.length ? <ul className="list-disc space-y-1 pl-5">{evidence.gaps.map((gap, i) => <li key={i}>{gap.name}: {shown(gap.candidates)} near-ready candidates below requirement, {shown(gap.courses)} active courses, shortest course {shown(gap.shortestHours)} hours.</li>)}</ul> : <p>No near-ready gap detail is retained in this result.</p>}
        <p className="text-xs">Course presence and duration do not establish suitability, enrollment, completion, readiness dates or productivity gains. Training cash and hours remain user assumptions; catalog hours do not populate them.</p>
        <button className={button} disabled={editsBlocked} onClick={() => onReview("training")}>Review training assumptions</button>
      </div>
    </details>}
    {(!relevant || relevant === "hiring") && <details key={`hiring-${page}`} open={relevant === "hiring"} className="rounded border p-3">
      <summary className="cursor-pointer font-medium">Hiring · historical timing and arrival assumption</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>Completed external-fill cohort: {evidence.recruiting.periodStart ?? "Unknown"} to {evidence.recruiting.periodEnd ?? "Unknown"}, selected by requisition closure date.</p>
        <p>Valid opening-to-start samples: {shown(evidence.recruiting.sample)}. Historical median: {shown(evidence.recruiting.medianDays)} days (minimum five valid samples).</p>
        <p>Saved Buy assumption: {review.input.buy} external hires; additional external backfills: {review.input.backfills || "0"}. Recruiting launch: {review.input.recruitingStart || "Unknown"}. Hire arrival: {review.proposed.arrivalDate ?? "Unknown"} ({review.proposed.arrivalBasis === "explicit" ? "user-entered date" : review.proposed.arrivalBasis === "historical-median" ? "historical median chosen as a planning assumption" : "no timing assumption"}).</p>
        <p className="text-xs">Opening-to-start includes the wait after offer acceptance. This completed-history sample excludes unsuccessful searches and does not promise a start date or simultaneous hiring capacity. Internal moves do not add company employees; external backfills do.</p>
        <button className={button} disabled={editsBlocked} onClick={() => onReview("timing")}>Review timing assumptions</button>
      </div>
    </details>}
  </section>;
}
