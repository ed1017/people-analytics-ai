import type { ReactNode } from "react";
import type { DashboardFilterOptions } from "@/lib/types";

type Props = { focusedIssue?: ReactNode; options: DashboardFilterOptions; country: string; org: string; level: string; loading: boolean; onCountry: (value: string) => void; onOrg: (value: string) => void; onLevel: (value: string) => void; onReset: () => void };
export function GlobalWorkforceFilters({ options, country, org, level, loading, onCountry, onOrg, onLevel, onReset, focusedIssue }: Props) {
  return <div className="global-workforce-filters border-t px-3 py-1 sm:px-5" role="region" aria-label="Shared workforce filters">
    <div className="grid grid-cols-3 items-end gap-x-2 gap-y-1 lg:flex lg:items-start lg:justify-end">
      <div className="col-span-3 min-w-0 lg:mr-auto lg:flex-1">{focusedIssue}</div>
      {([{label: "Country", value:country, options:options.countries, onChange:onCountry, all:"All countries"}, {label:"Business Unit",value:org,options:options.business_units,onChange:onOrg,all:"All business units"}, {label:"Level",value:level,options:options.levels,onChange:onLevel,all:"All levels"}]).map(field=><label key={field.label} className="min-w-0 text-xs text-muted-foreground lg:flex lg:items-center lg:gap-1.5"><span className="block">{field.label}</span><select aria-label={field.label} title={field.options.find(option=>option.value===field.value)?.label ?? field.all} value={field.value} onChange={e=>field.onChange(e.target.value)} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-1.5 text-sm text-foreground lg:w-36"><option value="all">{field.all}</option>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
      <button type="button" onClick={onReset} disabled={country==="all"&&org==="all"&&level==="all"} className="h-9 rounded-md border px-3 text-sm font-medium disabled:opacity-50">Reset</button>
      <span role="status" className="col-span-2 text-xs text-muted-foreground lg:sr-only">{loading ? "Refreshing selected workforce snapshot" : "Filters stay selected across pages"}</span>
    </div>
  </div>;
}
