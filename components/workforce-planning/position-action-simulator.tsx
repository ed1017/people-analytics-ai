import type {
  PositionActionAssumptions,
  PositionActionScenarioResponse,
  PositionModelingResponse,
} from "@/lib/types";

type PositionActionSimulatorProps = {
  assumptions: PositionActionAssumptions | null;
  defaultsAvailable: boolean;
  loading: boolean;
  error: string | null;
  result: PositionActionScenarioResponse | null;
  positionModelingData: PositionModelingResponse | null;
  onChange: (
    key: keyof PositionActionAssumptions,
    value: number
  ) => void;
  onReset: () => void;
  onRun: () => void;
};

type Field = {
  key: keyof PositionActionAssumptions;
  label: string;
  help: string;
  min: number;
  max?: number;
  step: number;
  suffix?: string;
};
const fields: Field[] = [
  {
    key: "add_positions",
    label: "Add Positions",
    help:
      "New authorized roles added to the inventory. They enter the model as open vacancies.",
    min: 0,
    step: 1,
  },
  {
    key: "close_vacant_positions",
    label: "Close Vacant Positions",
    help:
      "Close currently vacant positions only. Filled positions are not eliminated in this model.",
    min: 0,
    step: 1,
  },
  {
    key: "freeze_vacancies",
    label: "Freeze Vacancies",
    help:
      "Freeze open vacancies. Frozen roles remain authorized but are removed from the fillable vacancy pool.",
    min: 0,
    step: 1,
  },
  {
    key: "vacancy_fill_pct",
    label: "Fill Open Vacancies",
    help:
      "Share of remaining fillable vacancies expected to be staffed in this position scenario.",
    min: 0,
    max: 100,
    step: 5,
    suffix: "%",
  },
];
export function PositionActionSimulator({
  assumptions,
  defaultsAvailable,
  loading,
  error,
  result,
  positionModelingData,
  onChange,
  onReset,
  onRun,
}: PositionActionSimulatorProps) {
  return (
    <div className="mb-5 rounded-md border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">
            Position Action Simulator
          </h4>
          <p className="text-sm text-muted-foreground">
            Model changes to the current authorized position inventory without changing source records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={
              !defaultsAvailable || loading
            }
            className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!assumptions || loading}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Running…"
              : "Run Position Scenario"}
          </button>
        </div>
      </div>
      {assumptions ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map((field) => (
            <label
              key={field.key}
              className="rounded-md border p-3"
            >
              <span
                className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                title={field.help}
              >
                {field.label}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={assumptions[field.key]}
                  onChange={(event) =>
                    onChange(
                      field.key,
                      Number(event.target.value)
                    )
                  }
                  className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-right text-sm tabular-nums"
                />
                {field.suffix && (
                  <span className="text-sm text-muted-foreground">
                    {field.suffix}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Loading position action model…
        </p>
      )}

      <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Current inventory:{" "}
        {positionModelingData
          ? positionModelingData.current.current_positions.toLocaleString()
          : "—"}{" "}
        active authorized positions, including{" "}
        {positionModelingData
          ? positionModelingData.current.vacant_positions.toLocaleString()
          : "—"}{" "}
        open vacancies. Closing positions in this first model is restricted to vacant roles only.
      </div>
      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Authorized Positions
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {result.modeled.authorized_positions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.modeled
                .net_authorized_position_change >= 0
                ? "+"
                : ""}
              {result.modeled.net_authorized_position_change.toLocaleString()}{" "}
              vs current
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Filled Positions
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {result.modeled.filled_positions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.modeled.projected_fills.toLocaleString()} projected fills
            </p>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Open Vacancies
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {result.modeled.open_vacancies.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.modeled.vacancy_rate_pct.toFixed(
                1
              )}% vacancy rate
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              Frozen Positions
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {result.modeled.frozen_positions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.modeled.occupancy_rate_pct.toFixed(
                1
              )}% staffed occupancy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
