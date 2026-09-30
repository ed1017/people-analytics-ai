import type {
  StructuralPositionAction,
  StructuralPositionCatalogResponse,
} from "@/lib/types";

type StructuralPositionActionsEditorProps = {
  actions: StructuralPositionAction[];
  catalog: StructuralPositionCatalogResponse | null;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onReset: () => void;
  onRun: () => void;
  onUpdate: (
    index: number,
    patch: Partial<StructuralPositionAction>
  ) => void;
  onRemove: (index: number) => void;
};

const actionLabels: Record<
  StructuralPositionAction["action_type"],
  string
> = {
  add_positions: "Add positions",
  close_vacant_positions:
    "Close vacant positions",
  freeze_vacancies: "Freeze vacancies",
  fill_vacancies: "Fill vacancies",
};

export function StructuralPositionActionsEditor({
  actions,
  catalog,
  loading,
  error,
  onAdd,
  onReset,
  onRun,
  onUpdate,
  onRemove,
}: StructuralPositionActionsEditorProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">
            Structural Position Actions
          </h4>
          <p className="text-sm text-muted-foreground">
            Apply ordered actions by business unit, career level, and optional job profile.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={actions.length >= 20}
            className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Action
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!catalog || loading}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Running…"
              : "Run Structural Scenario"}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {actions.map((action, index) => {
          const profileOptions =
            catalog?.job_profiles.filter(
              (profile) =>
                catalog.combinations.some(
                  (combo) =>
                    (!action.business_unit ||
                      combo.org_code ===
                        action.business_unit) &&
                    (!action.level ||
                      combo.level_code ===
                        action.level) &&
                    combo.job_profile_code ===
                      profile.job_profile_code
                )
            ) ?? [];

          return (
            <div
              key={index}
              className="grid gap-3 rounded-md border p-3 xl:grid-cols-[36px_1.1fr_1.2fr_1fr_1.4fr_0.8fr_36px]"
            >
              <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {index + 1}
              </div>
              <label>
                <span className="text-[11px] text-muted-foreground">
                  Action
                </span>
                <select
                  value={action.action_type}
                  onChange={(event) => {
                    const actionType =
                      event.target
                        .value as StructuralPositionAction["action_type"];
                    onUpdate(index, {
                      action_type: actionType,
                      amount:
                        actionType ===
                        "fill_vacancies"
                          ? null
                          : 0,
                      fill_pct:
                        actionType ===
                        "fill_vacancies"
                          ? 0
                          : null,
                    });
                  }}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                >
                  {Object.entries(
                    actionLabels
                  ).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[11px] text-muted-foreground">
                  Business Unit
                </span>
                <select
                  value={
                    action.business_unit ?? ""
                  }
                  onChange={(event) =>
                    onUpdate(index, {
                      business_unit:
                        event.target.value ||
                        null,
                      job_profile: null,
                    })
                  }
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                >
                  <option value="">
                    All business units
                  </option>
                  {catalog?.business_units.map(
                    (option) => (
                      <option
                        key={option.org_code}
                        value={option.org_code}
                      >
                        {option.org_name}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label>
                <span className="text-[11px] text-muted-foreground">
                  Level
                </span>
                <select
                  value={action.level ?? ""}
                  onChange={(event) =>
                    onUpdate(index, {
                      level:
                        event.target.value ||
                        null,
                      job_profile: null,
                    })
                  }
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                >
                  <option value="">
                    All levels
                  </option>
                  {catalog?.levels.map(
                    (option) => (
                      <option
                        key={
                          option.level_code
                        }
                        value={
                          option.level_code
                        }
                      >
                        {option.level_name}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label>
                <span className="text-[11px] text-muted-foreground">
                  Job Profile
                </span>
                <select
                  value={
                    action.job_profile ?? ""
                  }
                  onChange={(event) =>
                    onUpdate(index, {
                      job_profile:
                        event.target.value ||
                        null,
                    })
                  }
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                >
                  <option value="">
                    All job profiles
                  </option>
                  {profileOptions.map(
                    (option) => (
                      <option
                        key={
                          option.job_profile_code
                        }
                        value={
                          option.job_profile_code
                        }
                      >
                        {
                          option.job_profile_name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
              <label>
                <span className="text-[11px] text-muted-foreground">
                  {action.action_type ===
                  "fill_vacancies"
                    ? "Fill %"
                    : "Positions"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={
                    action.action_type ===
                    "fill_vacancies"
                      ? 100
                      : undefined
                  }
                  step={
                    action.action_type ===
                    "fill_vacancies"
                      ? 5
                      : 1
                  }
                  value={
                    action.action_type ===
                    "fill_vacancies"
                      ? action.fill_pct ?? 0
                      : action.amount ?? 0
                  }
                  onChange={(event) =>
                    onUpdate(
                      index,
                      action.action_type ===
                        "fill_vacancies"
                        ? {
                            fill_pct: Number(
                              event.target.value
                            ),
                          }
                        : {
                            amount: Number(
                              event.target.value
                            ),
                          }
                    )
                  }
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={actions.length === 1}
                className="self-end rounded-md border px-2 py-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
                title="Remove action"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Actions run top-to-bottom. Cost basis comes from the stored Baseline Dec 2027 labor cost per planned position for the matching BU × level × job-profile mix.
      </div>
      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </>
  );
}
