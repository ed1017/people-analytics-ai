"use client";

import {
  formatPercent,
  formatWholeCount,
} from "@/lib/display-format";
import { EvidenceScopeNotice } from "@/components/evidence-scope-notice";
import {
  enterpriseTalentEvidenceScope,
  type SelectedBusinessContext,
} from "@/lib/talent-evidence-scope";
import type {
  SuccessionCoverageResponse,
} from "@/lib/types";

type SuccessionPlanningPageProps = {
  data: SuccessionCoverageResponse | null;
  loading: boolean;
  error: string | null;
  selectedContext: SelectedBusinessContext;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No recorded assessment";
  }

  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function displayCount(
  value: number | null
) {
  return value === null
    ? "Suppressed"
    : formatWholeCount(value);
}

function displayPercent(
  value: number | null
) {
  return value === null
    ? "Suppressed"
    : formatPercent(value);
}

export function SuccessionPlanningPage({
  data,
  loading,
  error,
  selectedContext,
}: SuccessionPlanningPageProps) {
  const illustrative = data?.data_meta?.successionSemantics === 'illustrative-plan-flags';
  const validZeroState =
    data?.filled_critical_positions === 0;

  return (
    <section className="min-w-0 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-3xl text-muted-foreground">
            {illustrative ? 'Illustrative demo succession-plan coverage and authored plan flags. No assessed or predicted individual readiness is supplied.' : 'Company-wide recorded succession-plan coverage and source-assessment readiness signals. No individual candidate records are shown.'}
          </p>
        </div>

        <span className="w-fit rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading
            ? "Loading summary…"
            : data
              ? (illustrative ? "Demo as of " : "Assessment ") +
                formatDate(data.as_of_date)
              : "Company summary"}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">
            Succession summary unavailable
          </p>
          <p className="mt-1">
            The governed company aggregate is not currently available. No fallback or inferred succession data is shown.
          </p>
        </div>
      )}

      {data && (
        <EvidenceScopeNotice
          scope={enterpriseTalentEvidenceScope({
            label: illustrative ? "Constructed succession population" : "Company succession population",
            asOf: data.as_of_date,
            populationLabel:
              "filled critical positions",
            populationCount:
              data.filled_critical_positions,
            supportedBreakdowns: [],
          })}
          selectedContext={selectedContext}
          note="The governed public succession summary exposes no country, business-unit, or level breakdowns."
        />
      )}

      {data ? (
        <>
          {validZeroState && (
            <div className="mb-6 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              {illustrative ? 'No filled critical-position population is recorded for this demo. This is a valid zero state, not an unavailable-data fallback.' : 'No filled critical-position population is recorded for this assessment. This is a valid zero state, not an unavailable-data fallback.'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {illustrative ? 'Illustrative Plan Coverage' : 'Recorded Plan Coverage'}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {displayPercent(
                  data.recorded_plan_coverage_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {illustrative ? 'Constructed filled critical positions with an illustrative plan' : 'Filled critical positions with a recorded succession plan'}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Filled Critical Positions
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {displayCount(
                  data.filled_critical_positions
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Across{" "}
                {formatWholeCount(
                  data.critical_job_profiles
                )} active critical job profiles
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {illustrative ? 'Positions with Demo Plan' : 'Positions with Recorded Plan'}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {displayCount(
                  data.positions_with_recorded_plan
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Without plan:{" "}
                {displayCount(
                  data.positions_without_recorded_plan
                )}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {illustrative ? 'Illustrative Flag Coverage' : 'Recorded Ready-Now Coverage'}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {displayPercent(
                  data.ready_now_plan_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {illustrative ? 'Demo plans with an authored illustrative flag; not assessed readiness' : 'Planned positions with at least one candidate recorded as ready now'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">
                Company Coverage
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <span className="text-muted-foreground">
                    With recorded plan
                  </span>
                  <span className="font-medium tabular-nums">
                    {displayCount(
                      data.positions_with_recorded_plan
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <span className="text-muted-foreground">
                    Without recorded plan
                  </span>
                  <span className="font-medium tabular-nums">
                    {displayCount(
                      data.positions_without_recorded_plan
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Small-cell threshold
                  </span>
                  <span className="font-medium tabular-nums">
                    k={data.small_cell_threshold}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">
                {illustrative ? 'Illustrative Plan Flags' : 'Recorded Readiness Signal'}
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <span className="text-muted-foreground">
                    {illustrative ? 'Demo plans with illustrative flag' : 'Planned positions with ready-now record'}
                  </span>
                  <span className="font-medium tabular-nums">
                    {displayCount(
                      data.positions_with_ready_now
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <span className="text-muted-foreground">
                    {illustrative ? 'Demo plans without illustrative flag' : 'Planned positions without ready-now record'}
                  </span>
                  <span className="font-medium tabular-nums">
                    {displayCount(
                      data.positions_without_ready_now
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {illustrative ? 'Illustrative share of demo plans' : 'Ready-now share of recorded plans'}
                  </span>
                  <span className="font-medium tabular-nums">
                    {displayPercent(
                      data.ready_now_plan_pct
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(data.plan_coverage_suppressed ||
            data.ready_now_suppressed) && (
            <div className="mt-6 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Small-cell protection applied
              </p>
              <p className="mt-1">
                Counts are suppressed in paired partitions when either side would expose a cell from 1–9. Downstream {illustrative ? 'illustrative flag' : 'readiness'} detail is also suppressed whenever its upstream plan partition is suppressed. Suppressed values are intentionally not estimated.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              How to read this summary
            </p>
            <p className="mt-1">
              {illustrative ? 'Constructed demo plan flags are authored examples, not source assessments or model predictions. The flags establish no individual readiness, capability, promotion or transfer recommendation. Career preferences are employee-expressed interests and remain separate from assessed readiness.' : 'Recorded plan coverage means a filled position in an active critical job profile has a source succession-plan record. Ready-now coverage means that source plan records at least one candidate in the ready-now category. These are recorded source assessments, not model predictions, promotion recommendations, transfer recommendations, or individual employment decisions.'}
            </p>
          </div>
        </>
      ) : !error && !loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No governed succession summary was returned.
        </div>
      ) : null}
    </section>
  );
}
