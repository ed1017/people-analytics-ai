import type { CandidateSchedulingAssumptions, WorkforceResponsePlanAllocation } from "@/lib/types";

export const emptyCandidateSchedulingAssumptions = (): CandidateSchedulingAssumptions => ({
  start_month: null,
  earliest_effective_months: { build: null, move: null, buy: null },
  monthly_capacity: { build: null, move: null, buy: null },
});

export function CandidateSchedulingInputs({ value, allocation, onChange }: {
  value: CandidateSchedulingAssumptions;
  allocation: WorkforceResponsePlanAllocation;
  onChange: (value: CandidateSchedulingAssumptions) => void;
}) {
  return <fieldset className="my-3 space-y-3 rounded-md border p-3 text-xs">
    <legend className="px-1 font-medium">Conditional scheduling assumptions</legend>
    <p>Limits do not establish delivery capacity. Enter assumed effective capacity and earliest months for each active path. Blank values remain unknown; no dates are generated until these assumptions are complete. Staffing readiness and actual availability remain unassessed.</p>
    <label className="block">Assumed scheduling start
      <input className="ml-2 rounded border p-1" type="month" min="2026-10" max="2029-09" value={value.start_month ?? ""} onChange={e => onChange({ ...value, start_month: e.target.value || null })} />
    </label>
    {(["build", "move", "buy"] as const).filter(path => allocation[path] > 0).map(path => <div key={path} className="grid gap-2 sm:grid-cols-2">
      <label>Assumed earliest {path} month
        <input className="mt-1 block rounded border p-1" type="month" min="2026-10" max="2029-09" value={value.earliest_effective_months[path] ?? ""} onChange={e => onChange({ ...value, earliest_effective_months: { ...value.earliest_effective_months, [path]: e.target.value || null } })} />
      </label>
      <label>Assumed monthly {path} capacity
        <input className="mt-1 block rounded border p-1" type="number" min={0} max={200000} step="any" placeholder="Unknown" value={value.monthly_capacity[path] ?? ""} onChange={e => onChange({ ...value, monthly_capacity: { ...value.monthly_capacity, [path]: e.target.value === "" ? null : Number(e.target.value) } })} />
      </label>
    </div>)}
  </fieldset>;
}
