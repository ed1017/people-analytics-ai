const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === "string" ? v.slice(0,300) : null;
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
const rows = (v: unknown) => Array.isArray(v) ? v.slice(0,40).map(record) : [];
function select(v: unknown, numeric: string, labels: string) {
 const source=record(v), result: Record<string, unknown>={};
 const suppressed=source.suppressed===true;
 for(const key of numeric.split(" ").filter(Boolean))result[key]=suppressed?null:number(source[key]);
 for(const key of labels.split(" ").filter(Boolean))result[key]=text(source[key]);
 result.suppressed=typeof source.suppressed==="boolean"?source.suppressed:null;
 return result;
}
export function exitSurveyEvidence(input: unknown) {
 const data=record(input), summary=record(data.summary);
 return { source:"Existing exit-survey aggregates", as_of:text(data.as_of), scope:"Company-wide; workforce filters not applied", population:"Exit-survey respondents, not current employees or all recorded separations", period:"Exit-survey fieldwork period and monthly trend not supplied", suppression:"Source suppression metadata not supplied; preserve any unavailable or explicitly suppressed fields", respondents:number(summary.exit_respondents ?? data.respondents),
 reasons:rows(data.exit_reasons ?? data.reasons).map(r=>select(r,"exits pct_of_exit_responses","primary_reason")),
 dimensions:rows(data.exit_dimensions ?? data.dimensions).filter(r=>r.survey_code==="EXIT").map(r=>select(r,"separation_respondents avg_score favorable_pct","survey_code survey_name question_code question_text dimension")),
 limitation:"1–5 scale; favorable means 4 or 5. Reported reasons and associations are not causes. Reason shares are not employee attrition rates. Do not combine respondent and workforce denominators. No raw comments or eNPS. API numeric normalization may obscure missing source values; do not infer completeness." };
}
export function employeeListeningEvidence(input: unknown) {
 const data=record(input), summary=record(data.summary), cleanSummary:Record<string,unknown>={};
 for(const prefix of ["engagement","pulse","manager","onboarding_90"])for(const suffix of ["respondents","eligible_population","participation_pct","avg_score","favorable_pct"]) {const key=prefix+"_"+suffix; if(key in summary)cleanSummary[key]=number(summary[key]);}
 const dimensions = (key: string, codes: string[]) => rows(data[key] ?? data.dimensions).filter(r=>codes.includes(String(r.survey_code))).map(r=>select(r,"employee_respondents candidate_respondents avg_score favorable_pct","survey_code survey_name question_code question_text dimension"));
 return { source:"Employee Listening",as_of:text(data.as_of),scope:"Company-wide; survey-specific populations; workforce filters not applied",summary:cleanSummary,
 engagement_trend:rows(data.engagement_trend).map(r=>select(r,"respondents eligible_population participation_pct avg_score favorable_pct","survey_code survey_name launch_date close_date denominator_snapshot_date")),
 engagement_dimensions:dimensions("engagement_dimensions",["ENG-2026"]),pulse_dimensions:dimensions("pulse_dimensions",["PULSE-2026-Q2"]),manager_dimensions:dimensions("manager_dimensions",["MGR-2026"]),onboarding_dimensions:dimensions("onboarding_dimensions",["ONB-30","ONB-60","ONB-90"]),
 business_units:rows(data.business_units).map(r=>select(r,"respondents avg_score favorable_pct","org_code org_name")),
 limitation:"Survey-specific respondents and periods; favorable is 4 or 5 on a 1–5 item. Participation uses its supplied denominator snapshot. No causal claims, raw comments, eNPS or exit feedback; exit-survey evidence belongs to Attrition." };
}
