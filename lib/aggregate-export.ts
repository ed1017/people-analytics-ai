import type { HeadcountTrendPoint, OverviewData, SkillsResponse, WorkforceResponse } from "./types";

type Row = Record<string, unknown>;
type Table = { source: string; scope: string; date: string; filters: string; rows: Row[]; fields: string[]; recordFields?: string[] };
const workforceFields = ["headcount","fte","people_managers","avg_span_of_control","full_time_headcount","non_full_time_headcount","remote_headcount","hybrid_headcount","onsite_headcount","avg_tenure_years","movements"];
const skillFields = ["employees_in_roles_requiring_skill","employees_with_observed_proficiency","employees_meeting_requirement","employees_below_or_missing_requirement","avg_required_proficiency","avg_observed_proficiency","avg_proficiency_gap","profile_coverage_pct","requirement_met_pct","avg_requirement_weight"];
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "Unavailable" : String(value);
  const safe = typeof value === "string" && /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"','""') + '"';
}
function unit(field: string) {
  if (field.startsWith("skills_below") || field === "active_skills" || field === "skills_with_demand") return "skills";
  if (field.endsWith("_pct")) return "percent";
  if (field.includes("usd")) return "USD";
  if (field === "fte") return "FTE";
  if (field.endsWith("years")) return "years";
  if (field.includes("proficiency")) return "source proficiency scale";
  if (field === "avg_span_of_control") return "direct reports per manager";
  if (field.includes("headcount") || field.startsWith("employees_") || field === "current_workforce" || field === "people_managers") return "people";
  return "count";
}
export function buildAggregateExport(input: { page: string; filters: string; snapshot: OverviewData | null; trend: HeadcountTrendPoint[]; workforce: WorkforceResponse | null; skills: SkillsResponse | null }): string | null {
  const tables: Table[] = [];
  if (input.page === "workforce" && input.snapshot) {
    tables.push({source:"Selected workforce snapshot",scope:"Selected country / business unit / level",date:input.snapshot.snapshot_date,filters:input.filters,rows:[input.snapshot],fields:["headcount","fte","voluntary_turnover_ytd_pct","labor_cost_usd","open_positions"]});
    tables.push({source:"Selected workforce trend",scope:"Selected country / business unit / level",date:input.snapshot.snapshot_date,filters:input.filters,rows:input.trend,fields:["headcount","fte"],recordFields:["snapshot_date"]});
    if (input.workforce) {
      const w=input.workforce, base={scope:"Company-wide; selected filters not applied",date:w.as_of,filters:"Not applied"};
      tables.push({...base,source:"Company workforce summary",rows:[w.summary],fields:workforceFields});
      for (const [source,rows,labels] of [["Company workforce trend",w.trend,["snapshot_date"]],["Company business units",w.business_units,["org_name"]],["Company countries",w.countries,["country_name"]],["Company career levels",w.levels,["level_name"]],["Company tenure",w.tenure,["tenure_band"]],["Company movements",w.movements,["movement_type"]]] as const) tables.push({...base,source,rows:[...rows],fields:workforceFields,recordFields:[...labels]});
    }
  } else if(input.page === "skills" && input.skills) {
    const s=input.skills,base={scope:"Company-wide skill requirements; filters not applied",date:s.as_of,filters:"Not applied"};
    tables.push({...base,source:"Skills summary",rows:[s.summary],fields:["active_skills","current_workforce","skills_with_demand","skills_below_60_pct","skills_below_75_pct","weighted_requirement_met_pct","average_profile_coverage_pct","onet_mapped_job_profiles","total_job_profiles"]});
    for(const [source,rows] of [["Largest skill gaps",s.largest_gaps],["Highest skill demand",s.highest_demand],["Strongest skill coverage",s.strongest_coverage]] as const) tables.push({...base,source,rows:[...rows],fields:skillFields,recordFields:["skill_name","skill_category"]});
  }
  if(!tables.length) return null;
  const output: unknown[][]=[["source","scope","filters","as_of","record","metric","value","unit","assumptions"]];
  for(const table of tables) for(const row of table.rows) for(const field of table.fields) {
    if(!Object.hasOwn(row,field)) continue;
    const value=row[field];
    if(value !== null && typeof value !== "number" && typeof value !== "boolean") continue;
    output.push([table.source,table.scope,table.filters,table.date,(table.recordFields??[]).map(key=>row[key]??"Unavailable").join(" / ")||"Summary",field,value,unit(field),"Observed synthetic aggregates; no scenario assumptions"]);
  }
  return output.map(row=>row.map(csvCell).join(",")).join("\r\n");
}
export function downloadAggregateCsv(csv: string, page: string) {
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=`${page}-aggregates.csv`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
