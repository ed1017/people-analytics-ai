"use client";

import { useEffect, useRef, useState } from "react";
import type { CareerGrowthMobilityResponse } from "@/lib/career-growth-mobility";
import type { LearningDevelopmentResponse, RoleWorkforceResponsePlanResponse } from "@/lib/types";
import { selectTalentResponseEvidence, talentResponseChatSnapshot } from "@/lib/talent-response-evidence";
import { usePlanningSession } from "./planning-session-context";

type Props = {
  roleCode: string;
  roleName: string;
  initialGoal?: string;
  rolePlan: RoleWorkforceResponsePlanResponse | null;
};

async function readEvidence<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

export function TalentResponseEvidence({ roleCode, roleName, initialGoal = "", rolePlan }: Props) {
  const [goal, setGoal] = useState(initialGoal);
  const [comparedGoal, setComparedGoal] = useState<string | null>(null);
  const [learning, setLearning] = useState<LearningDevelopmentResponse | null>(null);
  const [movements, setMovements] = useState<CareerGrowthMobilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const evidence = selectTalentResponseEvidence(roleCode, learning, movements, rolePlan);
  const { pathway, readiness, recruiting, enterpriseHistory } = evidence;
  const { setTalentEvidenceContext } = usePlanningSession();
  const chatSnapshot = talentResponseChatSnapshot(roleCode, roleName, goal, comparedGoal, loading, evidence);
  useEffect(() => { setTalentEvidenceContext(chatSnapshot); }, [chatSnapshot, setTalentEvidenceContext]);
  useEffect(() => () => setTalentEvidenceContext(null), [setTalentEvidenceContext]);

  async function compare() {
    if (loading) return;
    if (!roleCode || !goal.trim()) {
      setError("Choose a role and enter a business goal before comparing evidence.");
      return;
    }
    setError(null);
    setLoading(true);
    const requestedGoal = goal.trim();
    const [nextLearning, nextMovements] = await Promise.all([
      readEvidence<LearningDevelopmentResponse>("/api/learning-development"),
      readEvidence<CareerGrowthMobilityResponse>("/api/career-growth-mobility"),
    ]);
    setLearning(nextLearning);
    setMovements(nextMovements);
    setComparedGoal(requestedGoal);
    setLoading(false);
    window.requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <section aria-label="Talent evidence for response options" className="my-4 -mx-3 rounded-md border p-3 sm:mx-0 sm:p-4">
      <h5 className="font-semibold">Compare Talent evidence</h5>
      <p className="mt-1 text-sm text-muted-foreground">
        Selected role: {roleName || "Choose a job profile above"}. Review evidence alongside Build, Move and Buy without changing your allocations or running a scenario.
      </p>
      <label className="mt-3 grid gap-2 text-sm font-medium">
        Comparison business goal
        <textarea value={goal} onChange={(event) => { setGoal(event.target.value); setError(null); }}
          rows={2} className="min-w-0 rounded-md border bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
      <button type="button" onClick={() => void compare()} aria-disabled={loading}
        className="mt-3 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {loading ? "Loading Talent evidence…" : "Compare evidence for this role"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 text-xs text-muted-foreground">
        {loading ? "Loading existing aggregate Talent sources." : comparedGoal ? "Evidence comparison loaded. Missing sources are marked unavailable." : "Sources load only when you choose to compare."}
      </p>
      {comparedGoal && !loading && <div className="mt-4">
        <h6 ref={heading} tabIndex={-1} className="rounded-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring">
          Talent evidence for {roleName}
        </h6>
        <p className="mt-2 whitespace-pre-wrap text-sm">User-stated goal: {comparedGoal}</p>
        {goal.trim() !== comparedGoal && <p className="mt-1 text-sm text-muted-foreground">Goal edited. Compare again to use the new goal.</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Enterprise evidence for the selected role where supported. Country, business-unit and level selections do not narrow these sources. The goal and Build/Move/Buy allocations are user assumptions, not observed outcomes. No skill-gap-to-headcount conversion or individual recommendations are made.
        </p>
        <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-3">
          <article className="min-w-0 rounded-md border p-3">
            <h6 className="font-semibold">Build · Learning catalog</h6>
            {pathway ? <>
              <p className="mt-2 text-sm">{pathway.required_skills_with_active_pathway} of {pathway.required_skill_count} required skills have an active mapped course.</p>
              <p className="mt-1 text-xs text-muted-foreground">Source: Learning &amp; Development · as of {evidence.learningAsOf || "unavailable"}. Denominator: required skills for {roleName}, not employees.</p>
              <p className="mt-2 text-sm">Shortest mapped catalog duration: {pathway.shortest_catalog_duration_hours === null ? "Unavailable" : `${pathway.shortest_catalog_duration_hours} hours`}.</p>
            </> : <p className="mt-2 text-sm">Role-matched learning catalog evidence unavailable. This is not zero coverage.</p>}
            <p className="mt-2 text-xs text-muted-foreground">Catalog coverage is not completion, proficiency improvement or role readiness. The shortest course is not a complete learning pathway or time to readiness.</p>
            <p className="mt-2 text-sm">Cost and time to readiness: unavailable.</p>
          </article>
          <article className="min-w-0 rounded-md border p-3">
            <h6 className="font-semibold">Move · Existing readiness evidence</h6>
            {readiness ? <>
              <p className="mt-2 text-sm">{readiness.candidate_pool.role_ready} meet all required-skill thresholds; {readiness.candidate_pool.near_ready} meet the existing near-ready rule.</p>
              <p className="mt-1 text-xs text-muted-foreground">Source: Internal Talent Readiness from the current role-plan result. Denominator: {readiness.candidate_pool.eligible_internal_candidates} active employees who prefer this role, excluding current incumbents. Source as-of date: unavailable in this response.</p>
              <p className="mt-2 text-xs text-muted-foreground">Near-ready rule: at most {readiness.readiness_rules.near_ready_max_missing_required_skills} required-skill gaps and {readiness.readiness_rules.near_ready_max_total_proficiency_shortfall} total proficiency points of shortfall. Preferred skills do not gate readiness.</p>
            </> : <p className="mt-2 text-sm">No matching role-plan readiness result. Use the existing Run Role Plan control if you choose to calculate that comparison.</p>}
            <p className="mt-2 text-xs text-muted-foreground">Preference and proficiency thresholds do not establish eligibility, willingness, availability or a pool of deployable movers. No employees are identified or ranked.</p>
            <p className="mt-2 text-sm">Move cost and time to availability: unavailable.</p>
          </article>
          <article className="min-w-0 rounded-md border p-3">
            <h6 className="font-semibold">Buy · Existing recruiting evidence</h6>
            {recruiting ? <>
              <p className="mt-2 text-sm">{recruiting.historical_external.recent_12m_filled_requisitions} external requisitions filled in the reported 12-month window.</p>
              <p className="mt-1 text-xs text-muted-foreground">Source: Role Buy Feasibility · {recruiting.historical_external.recent_12m_window_start} to {recruiting.as_of}. Unit: completed external requisitions for {roleName}, not available applicants.</p>
              <p className="mt-2 text-sm">Historical median time to fill: {recruiting.historical_external.median_time_to_fill_days === null ? "Unavailable" : `${recruiting.historical_external.median_time_to_fill_days} days`}.</p>
              <p className="mt-1 text-xs text-muted-foreground">Total historical external fills: {recruiting.historical_external.filled_requisitions}; source start: {recruiting.historical_external.evidence_start_date || "unavailable"}. The median uses available time-to-fill observations; its contributing sample count is not supplied. It is not a forecast for this plan.</p>
            </> : <p className="mt-2 text-sm">No matching role-plan recruiting result. Existing recruiting methodology is unchanged.</p>}
            <p className="mt-2 text-sm">Hiring cost and forecast time to hire: unavailable.</p>
          </article>
        </div>
        <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm">
          <h6 className="font-semibold">Historical movements · Enterprise context only</h6>
          {enterpriseHistory ? <>
            <p className="mt-2">{enterpriseHistory.source.total_recorded_events} recorded movement events · {enterpriseHistory.source.first_recorded_date || "date unavailable"} to {enterpriseHistory.source.last_recorded_date || "date unavailable"}.</p>
            <p className="mt-1">{enterpriseHistory.composition.map((row) => `${row.label}: ${row.events}`).join(" · ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Source: Career Growth &amp; Internal Mobility. Denominator: recorded movement events, not the workforce. These are not counts for {roleName}, mobility rates or a pool of available movers.</p>
            <details className="mt-2"><summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">Movement source limitations</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{enterpriseHistory.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
          </> : <p className="mt-2">Historical movement source unavailable. No role-specific movement evidence can be inferred.</p>}
        </div>
      </div>}
    </section>
  );
}
