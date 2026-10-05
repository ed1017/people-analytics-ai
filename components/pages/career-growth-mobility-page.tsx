"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EvidenceScopeNotice } from "@/components/evidence-scope-notice";
import { formatWholeCount } from "@/lib/display-format";
import {
  enterpriseTalentEvidenceScope,
  type SelectedBusinessContext,
} from "@/lib/talent-evidence-scope";
import type {
  CareerGrowthMobilityResponse,
  MovementType,
} from "@/lib/career-growth-mobility";

type CareerGrowthMobilityPageProps = {
  data: CareerGrowthMobilityResponse | null;
  loading: boolean;
  error: string | null;
  selectedContext: SelectedBusinessContext;
};

function formatDate(value: string | null) {
  if (!value) return "Unavailable";
  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonth(value: string) {
  return new Date(
    value + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

const typeLabels: Record<
  MovementType,
  string
> = {
  promotion: "Promotions",
  lateral_move: "Lateral moves",
  transfer: "Transfers",
};

export function CareerGrowthMobilityPage({
  data,
  loading,
  error,
  selectedContext,
}: CareerGrowthMobilityPageProps) {
  const transitionsByType = (
    type: MovementType
  ) =>
    data?.level_transitions.filter(
      (row) =>
        row.movement_type === type
    ) ?? [];

  return (
    <section className="min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Descriptive recorded promotions,
            lateral moves, transfers, and level
            transitions from the governed
            movement-event source.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading
            ? "Loading recorded movement…"
            : data
              ? `${formatDate(
                  data.source
                    .first_recorded_date
                )}–${formatDate(
                  data.source
                    .last_recorded_date
                )}`
              : "Movement history"}
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
            label:
              "Company recorded movement events",
            asOf:
              data.source.last_recorded_date,
            populationLabel:
              "recorded movement events",
            populationCount:
              data.source.total_recorded_events,
            supportedBreakdowns: [
              "movement_type",
              "month",
              "job_level_transition",
            ],
          })}
          selectedContext={selectedContext}
          note={`Coverage begins ${formatDate(
            data.source.first_recorded_date
          )}. Dashboard country, business-unit, and level selections do not filter these movement events.`}
        />
      )}

      {data &&
      data.source
        .total_recorded_events > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Recorded Movement Events
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatWholeCount(
                  data.source
                    .total_recorded_events
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(
                  data.source
                    .distinct_recorded_employees
                )}{" "}
                distinct employees in this
                source
              </p>
            </div>

            {data.composition.map(
              (row) => (
                <div
                  key={row.movement_type}
                  className="rounded-lg border p-4"
                >
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[
                      row.movement_type
                    ]}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatWholeCount(
                      row.events
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.share_pct.toFixed(
                      1
                    )}
                    % of recorded movement
                    events
                  </p>
                </div>
              )
            )}
          </div>

          <div className="mt-4 rounded-lg border border-amber-700/30 bg-amber-700/10 p-4 text-sm">
            <p className="font-semibold">
              Source coverage & limitations
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Recorded events cover{" "}
                {formatDate(
                  data.source
                    .first_recorded_date
                )}{" "}
                through{" "}
                {formatDate(
                  data.source
                    .last_recorded_date
                )}
                .
              </li>
              <li>
                All{" "}
                {formatWholeCount(
                  data.source
                    .currently_active_linked_employees
                )}{" "}
                linked employees are currently
                active; zero linked employees in
                this source are currently
                non-active. Historical movement
                may therefore be incomplete for
                employees who later left.
              </li>
              <li>
                Origin position is missing for{" "}
                {formatWholeCount(
                  data.source
                    .origin_position_missing_events
                )}{" "}
                of{" "}
                {formatWholeCount(
                  data.source
                    .total_recorded_events
                )}{" "}
                events, so this page does not
                infer role-to-role career paths.
              </li>
              <li>
                The latest source month is
                partial through{" "}
                {formatDate(
                  data.source
                    .last_recorded_date
                )}
                ; no later movement rows are
                available in this source.
              </li>
              <li>
                Percentages below describe the
                recorded events only. They are
                not workforce promotion,
                transfer, or mobility rates.
              </li>
            </ul>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4">
              <h3 className="font-semibold">
                Monthly Recorded Movement
              </h3>
              <p className="text-sm text-muted-foreground">
                Recorded events by movement-date
                month. The final month is
                partial.
              </p>
            </div>

            <div className="h-80 min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={data.monthly}
                  margin={{
                    top: 8,
                    right: 8,
                    bottom: 8,
                    left: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    minTickGap={24}
                    fontSize={11}
                  />
                  <YAxis
                    allowDecimals={false}
                    fontSize={11}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatMonth(
                        String(value)
                      )
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="promotions"
                    name="Promotions"
                    fill="var(--chart-1)"
                    stackId="movement"
                  />
                  <Bar
                    dataKey="lateral_moves"
                    name="Lateral moves"
                    fill="var(--chart-2)"
                    stackId="movement"
                  />
                  <Bar
                    dataKey="transfers"
                    name="Transfers"
                    fill="var(--chart-3)"
                    stackId="movement"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            {(
              [
                "promotion",
                "lateral_move",
                "transfer",
              ] as MovementType[]
            ).map((type) => (
              <div
                key={type}
                className="rounded-lg border p-4"
              >
                <h3 className="font-semibold">
                  {typeLabels[type]} by
                  Recorded Level Transition
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Counts from recorded from/to
                  job levels. Lateral moves and
                  transfers remain separate
                  source classifications.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[260px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2">
                          Transition
                        </th>
                        <th className="pb-2 text-right">
                          Events
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitionsByType(
                        type
                      ).map((row) => (
                        <tr
                          key={`${type}-${row.from_level}-${row.to_level}`}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 font-medium">
                            {row.from_level} →{" "}
                            {row.to_level}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {row.events.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Interpretation
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.methodology.map(
                (item) => (
                  <li key={item}>
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </>
      ) : (
        !loading && !error && (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No recorded movement events were
            returned.
          </div>
        )
      )}
    </section>
  );
}
