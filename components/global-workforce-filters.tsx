"use client";
import {useState} from "react";
import {usePhoneLayout} from "@/components/use-phone-layout";
import type { ReactNode } from "react";
import type { AppPage, DashboardFilterOptions } from "@/lib/types";

type Props = { page?: AppPage; focusedIssue?: ReactNode; options: DashboardFilterOptions; country: string; org: string; level: string; loading: boolean; onCountry: (value: string) => void; onOrg: (value: string) => void; onLevel: (value: string) => void; onReset: () => void };
export function GlobalWorkforceFilters({ page, options, country, org, level, loading, onCountry, onOrg, onLevel, onReset, focusedIssue }: Props) {
  const filtersApply = !page || ["home", "overview", "workforce", "career-growth-mobility", "compensation"].includes(page);
  const scopeNote = page === "home" || page === "overview"
    ? "Filters select the workforce snapshot; other evidence keeps its own scope."
    : page === "workforce"
    ? "Filters select the workforce snapshot; workforce detail below stays company-wide."
    : page === "career-growth-mobility"
    ? "Filters select the performance scope; unsupported selections are unavailable and movement history stays company-wide."
    : page === "compensation"
    ? "Filters select catalog assumptions; filtered pay results are unavailable and cost context stays company-wide."
    : ["planning-overview", "workforce-planning", "scenario-modeling", "position-workforce-design", "workforce-response", "execution-feasibility"].includes(page ?? "")
    ? "Workforce filters do not narrow planning calculations. The selected goal guides advice; capacity figures come from the scenario's own scope and entered assumptions."
    : "Workforce filters are not applied here. This page's main evidence keeps its own scope.";
  const phone=usePhoneLayout();const [expanded,setExpanded]=useState(false);
  const fields=<>
      {([{label: "Country", value:country, options:options.countries, onChange:onCountry, all:"All countries"}, {label:"Business Unit",value:org,options:options.business_units,onChange:onOrg,all:"All business units"}, {label:"Level",value:level,options:options.levels,onChange:onLevel,all:"All levels"}]).map(field=><label key={field.label} className="min-w-0 text-xs text-muted-foreground lg:flex lg:shrink-0 lg:items-center lg:gap-1.5"><span className="block">{field.label}</span><select aria-label={field.label} title={field.options.find(option=>option.value===field.value)?.label ?? field.all} value={field.value} onChange={e=>field.onChange(e.target.value)} className={`h-9 w-full min-w-0 rounded-md border border-input bg-card px-1.5 text-sm text-foreground ${field.label === "Country" ? "lg:w-36" : field.label === "Level" ? "lg:w-80" : "lg:w-64"}`}><option value="all">{field.all}</option>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
      <button type="button" onClick={onReset} disabled={country==="all"&&org==="all"&&level==="all"} className="h-9 rounded-md border px-3 text-sm font-medium disabled:opacity-50">Reset</button>
      <span role="status" className="col-span-2 text-xs text-muted-foreground lg:sr-only">{loading ? "Refreshing selected workforce snapshot" : "Filters stay selected across pages"}</span>
  </>;
  return <div className="global-workforce-filters border-t px-3 py-1 sm:px-5" role="region" aria-label="Shared workforce filters">
    <div className="workforce-toolbar grid grid-cols-3 items-end gap-x-2 gap-y-1 lg:flex lg:flex-wrap lg:items-start lg:justify-end">
      <div className="workforce-goal col-span-3 min-w-0 lg:mr-auto lg:flex-1">{focusedIssue}</div>
      {!filtersApply?<details key={page} className="col-span-3 min-w-0 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">Workforce filters — not applied here</summary><p className="pb-2">Selections are retained for pages that support them. Change them on Overview or Workforce.</p><fieldset disabled className="flex flex-col gap-2 opacity-60 lg:flex-row lg:flex-wrap lg:items-end">{fields}</fieldset></details>:phone?<details className="workforce-filter-disclosure" open={expanded} onToggle={event=>{if(phone)setExpanded(event.currentTarget.open)}}><summary className="min-h-11 cursor-pointer py-3 text-sm">Filters</summary><div className="workforce-filter-fields">
{fields}
    </div></details>:fields}</div>
    {page && <p aria-label="Filter applicability" className="py-1 text-xs leading-relaxed text-muted-foreground">{scopeNote}</p>}
  </div>;
}
