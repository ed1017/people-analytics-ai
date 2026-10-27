"use client";
import {EvidenceTableRegion} from '@/components/evidence-table-region';
import { exitSurveyEvidence } from "@/lib/employee-listening";
import type { SurveySentimentResponse } from "@/lib/types";
const display = (v: unknown, decimals=0) => typeof v === "number" ? v.toLocaleString("en-US",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}) : "Unavailable";
export function ExitSurveyFeedback({data,loading,error}:{data:SurveySentimentResponse|null;loading:boolean;error:string|null}) {
 const evidence=exitSurveyEvidence(!loading&&!error?data:null);
 if(!loading&&!error&&data&&evidence.respondents===null&&!evidence.reasons.length&&!evidence.dimensions.length)return <details aria-label="Exit survey feedback" className="mt-6 text-sm text-muted-foreground">
  <summary className="min-h-11 w-fit cursor-pointer py-2 font-medium">Exit survey · unavailable</summary>
  <p role="status">Exit-survey responses are unavailable for this dataset.</p>
  <p>{evidence.as_of?`As of ${evidence.as_of}.`:'Date not supplied.'}</p>
 </details>;
 return <section aria-label="Exit survey feedback" className="mt-6 space-y-4 rounded-lg border p-4">
  <h3 className="text-xl font-semibold">Exit Survey Feedback</h3>
  <p className="text-sm text-muted-foreground">Company-wide exit-survey responses.{!loading&&!error&&data&&<> {evidence.as_of?`As of ${evidence.as_of}.`:'Date not supplied.'}</>}</p>
  {loading?<p role="status">Loading exit-survey feedback…</p>:error?<p role="alert">Could not load exit-survey feedback.</p>:!data?<p role="status">No exit-survey feedback was returned.</p>:<>
   <p className="text-sm">{display(evidence.respondents)} exit-survey respondents.</p>
   <div className="min-w-0 rounded border p-4"><h4 className="font-semibold">Exit Reasons</h4><p className="my-2 text-sm">Primary reason reported by exit-survey respondents.</p>
    {!evidence.reasons.length?<p role="status">No exit-survey reason breakdown is supplied.</p>:<EvidenceTableRegion label="Exit survey reasons"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b text-left"><th>Reason</th><th className="text-right">Responses</th><th className="text-right">Share of exit responses</th></tr></thead><tbody>{evidence.reasons.map((r,i)=><tr key={i} className="border-b"><td className="py-2">{String(r.primary_reason ?? "Unavailable")}</td><td className="text-right">{display(r.exits)}</td><td className="text-right">{display(r.pct_of_exit_responses,1)}{typeof r.pct_of_exit_responses === "number"?"%":""}</td></tr>)}</tbody></table></EvidenceTableRegion>}
   </div>
   <div className="rounded border p-4"><h4 className="font-semibold">Exit Experience</h4><p className="my-2 text-sm">Favorable means 4 or 5 on the 1–5 scale; each question retains its own respondent count.</p>
    {!evidence.dimensions.length&&<p role="status">No exit-experience question results are supplied.</p>}<div className="evidence-panel-grid grid gap-3">{evidence.dimensions.map((r,i)=><article key={i} className="min-w-0 rounded border p-3"><h5 className="font-medium">{String(r.dimension ?? "Unavailable")}</h5><p className="mt-1 text-sm">{String(r.question_text ?? "Question text unavailable")}</p><p className="mt-2 text-sm">{display(r.avg_score,2)} / 5 average; {display(r.favorable_pct,1)}{typeof r.favorable_pct === "number"?"%":""} favorable</p><p className="text-xs text-muted-foreground">{display(r.separation_respondents)} exit-survey respondents · {String(r.survey_name ?? r.survey_code ?? "Survey unavailable")}</p>{typeof r.favorable_pct === "number"&&<div className="mt-2 h-2 overflow-hidden rounded bg-muted" aria-label={`${r.favorable_pct}% favorable`}><div className="h-full bg-foreground" style={{width:`${Math.max(0,Math.min(100,r.favorable_pct))}%`}} /></div>}</article>)}</div>
   </div>
  </>}
  <details className="text-sm text-muted-foreground"><summary className="min-h-11 w-fit cursor-pointer py-2 font-medium">Details</summary><p>Company-wide recorded responses; workforce filters do not narrow this evidence. Exit-survey fieldwork period and monthly trend are not supplied. Respondents are not current employees or all recorded separations; response shares are not workforce attrition rates or proven causes.</p><p>Suppression metadata is not supplied by the source. Unavailable or explicitly suppressed fields are not reconstructed. Associations are not causal findings. No raw comments or eNPS are available.</p></details>
 </section>;
}
