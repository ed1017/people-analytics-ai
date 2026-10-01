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
  CareerMobilityResponse,
} from "@/lib/types";

type CareerMobilityPageProps = {
  data: CareerMobilityResponse | null;
  loading: boolean;
  error: string | null;
  selectedContext: SelectedBusinessContext;
};

function formatDate(value: string | null) {
  if (!value) return "No update date";

  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CareerMobilityPage({
  data,
  loading,
  error,
  selectedContext,
}: CareerMobilityPageProps) {
  return (
    <section className="min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Career Interests
          </h2>
          <p className="text-muted-foreground">
            Describe recorded career interests, desired destinations, and preference coverage without treating preferences as readiness or recommendations.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading
            ? "Loading preferences…"
            : data
              ? "Updated through " +
                formatDate(data.as_of)
              : "Career Interests"}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <EvidenceScopeNotice
          scope={enterpriseTalentEvidenceScope({
            label: "Company active workforce",
            asOf: data.as_of,
            populationLabel: "active employees",
            populationCount:
              data.summary.active_employees,
            supportedBreakdowns: [
              "current_org_preference_coverage",
            ],
          })}
          selectedContext={selectedContext}
          note="Only Current Organization Coverage contains its own business-unit coverage rows; interest, destination, and relocation distributions remain company-wide."
        />
      )}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Preference Record Coverage
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(
                  data.summary
                    .preference_record_coverage_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(
                  data.summary.employees_with_preference
                )} of{" "}
                {formatWholeCount(
                  data.summary.active_employees
                )} active employees
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                No Recorded Preference
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.summary
                    .employees_without_preference
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No preference row recorded; not evidence of no career interest
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Relocation Willingness
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(
                  data.summary.relocation_willing_pct
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(
                  data.summary.relocation_willing_employees
                )} of{" "}
                {formatWholeCount(
                  data.summary.known_relocation_records
                )} preference holders with a recorded answer
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Destination Role Records
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.summary
                    .destination_profile_records
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Valid desired job-profile references among active preference holders
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Denominator & interpretation
            </p>
            <p className="mt-1">
              Preference-record coverage uses the active workforce as its denominator. All other distributions use active employees with a recorded preference and, where relevant, a known value for that field. A recorded destination or relocation preference does not establish readiness, suitability, an available role, or a likely move.
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Recorded Career Interests
                </h3>
                <p className="text-sm text-muted-foreground">
                  Share among{" "}
                  {formatWholeCount(
                    data.summary
                      .career_interest_records
                  )} active preference holders with a recorded interest
                </p>
              </div>

              <div className="space-y-3">
                {data.career_interests.length > 0 ? (
                  data.career_interests.map(
                    (row) => (
                      <div
                        key={row.code}
                        className="rounded-md border p-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium">
                            {row.label}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatWholeCount(
                              row.employees
                            )}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatPercent(
                            row.share_pct
                          )} of recorded career-interest responses
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recorded career-interest categories were returned.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Preference Data Coverage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Current data-quality checks used before aggregation
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Duplicate preference employees
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatWholeCount(
                      data.data_quality
                        .employees_with_multiple_preference_rows
                    )}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Missing destination profiles
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatWholeCount(
                      data.data_quality
                        .missing_desired_profile
                    )}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Missing desired locations
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatWholeCount(
                      data.data_quality
                        .missing_desired_location
                    )}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Missing relocation answers
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatWholeCount(
                      data.data_quality
                        .missing_relocation_willingness
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Preference updates in the current active population span{" "}
                {formatDate(
                  data.data_quality
                    .earliest_preference_update
                )} through{" "}
                {formatDate(
                  data.data_quality
                    .latest_preference_update
                )}.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4">
              <h3 className="font-semibold">
                Desired Destination Roles
              </h3>
              <p className="text-sm text-muted-foreground">
                Top recorded desired job profiles among{" "}
                {formatWholeCount(
                  data.summary
                    .destination_profile_records
                )} preference holders with a valid destination profile
              </p>
            </div>

            {data.destination_roles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">
                        Desired Role
                      </th>
                      <th className="pb-3 pr-4">
                        Profile Code
                      </th>
                      <th className="pb-3 pr-4 text-right">
                        Preference Holders
                      </th>
                      <th className="pb-3 text-right">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.destination_roles.map(
                      (row) => (
                        <tr
                          key={row.code}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {row.label}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {row.code}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatWholeCount(
                              row.employees
                            )}
                          </td>
                          <td className="py-3 text-right font-semibold tabular-nums">
                            {formatPercent(
                              row.share_pct
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No valid desired job-profile preferences were returned.
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Desired Locations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Top recorded destination locations among{" "}
                  {formatWholeCount(
                    data.summary
                      .destination_location_records
                  )} preference holders with a valid location
                </p>
              </div>

              {data.desired_locations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">
                          Location
                        </th>
                        <th className="pb-3 pr-4">
                          Country
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          Preference Holders
                        </th>
                        <th className="pb-3 text-right">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.desired_locations.map(
                        (row) => (
                          <tr
                            key={row.location_code}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium">
                              {row.location_name}
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {row.country_code}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">
                              {formatWholeCount(
                                row.employees
                              )}
                            </td>
                            <td className="py-3 text-right font-semibold tabular-nums">
                              {formatPercent(
                                row.share_pct
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No valid desired-location preferences were returned.
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Current Organization Coverage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preference-record coverage among active employees by current organization
                </p>
              </div>

              {data.current_org_coverage.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">
                          Current Organization
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          Active Employees
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          With Preference
                        </th>
                        <th className="pb-3 text-right">
                          Coverage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.current_org_coverage.map(
                        (row) => (
                          <tr
                            key={row.org_code}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium">
                              {row.org_name}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">
                              {formatWholeCount(
                                row.active_employees
                              )}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">
                              {formatWholeCount(
                                row.employees_with_preference
                              )}
                            </td>
                            <td className="py-3 text-right font-semibold tabular-nums">
                              {formatPercent(
                                row.preference_coverage_pct
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No current-organization coverage rows were returned.
                </div>
              )}
            </div>
          </div>

          <details className="mt-6 rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              Methodology & guardrails
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {data.methodology.map(
                (item) => (
                  <li
                    key={item}
                    className="flex gap-2"
                  >
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </details>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading
            ? "Loading Career Interests preference coverage…"
            : "No Career Interests data returned."}
        </div>
      )}
    </section>
  );
}
