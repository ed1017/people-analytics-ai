import artifact from '@/lib/data/analysis-demo-display-v1.json';
import report from '@/lib/data/aggregate-exit-demo-v1.json';
import {resolveAnalysisDisplay} from '@/lib/analysis-demo-display';

const decimal = (n: number) => n.toFixed(4);
const signed = (n: number) => `${n > 0 ? '+' : ''}${Number(n.toFixed(1))}`;
const date = (value: string) => new Date(value).toLocaleDateString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
const scenario = (value: string) => value.replaceAll('-', ' ');

/** Reuses the parent methods disclosure; no independent panel or adoption action. */
export function AnalysisDemoComparison({evidence = artifact}: {evidence?: unknown}) {
  const view = resolveAnalysisDisplay(evidence, artifact, report);
  if (view.status !== 'ready') return <p role="status" className="text-xs">{view.message} Operational forecasts remain unavailable.</p>;
  const {hiring, satisfaction} = view.data;
  const losses = hiring.cases.filter(c => c.selectedBrier > c.logisticBrier).length;
  return <section aria-label="Experimental synthetic comparisons" className="min-w-0 space-y-3 text-xs">
    <h3 className="font-semibold">Experimental methods · fixed synthetic examples</h3>
    <p>Operational forecasts remain unavailable for all three domains. The tested analysis result retains the recent three-month mean for turnover above. Hiring and satisfaction use separate constructed fixtures; selected goals and workforce filters do not narrow these examples.</p>
    <p><strong>Hiring · aggregate cohort benchmark.</strong> Brier loss scores predicted 90-day start probabilities against start/non-start outcomes, aggregated across openings; lower is better. Each case tests Jul–Sep 2025 opening cohorts, scored through Jan 2026. Selection uses earlier validation only; these retrospective synthetic comparisons do not establish real-world accuracy.</p>
    <div role="region" aria-label="Synthetic hiring method comparisons" tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <caption className="mb-2 text-left">All nine cases · Brier loss · * selects logistic trend; otherwise recent baseline</caption>
        <thead><tr className="border-b text-left"><th scope="col" className="py-2 pr-3">Scenario / seed</th><th scope="col" className="p-2 text-right">Recent baseline</th><th scope="col" className="p-2 text-right">Logistic trend</th><th scope="col" className="p-2 text-right">Selected</th></tr></thead>
        <tbody>{hiring.cases.map(c => <tr key={c.id} className="border-b"><th scope="row" className="py-2 pr-3 text-left font-normal">{scenario(c.scenario)} / {c.seed}</th><td className="p-2 text-right tabular-nums">{decimal(c.recentBrier)}</td><td className="p-2 text-right tabular-nums">{decimal(c.logisticBrier)}</td><td className="p-2 text-right tabular-nums">{decimal(c.selectedBrier)}{c.selectedMethod === 'logistic-trend' ? '*' : ''}</td></tr>)}</tbody>
      </table>
    </div>
    <p>The recent baseline uses the latest three mature cohorts. The selected rule loses to fixed logistic trend in {losses} of {hiring.cases.length} cases. No calibrated prediction interval is available. All {hiring.abstentions.length} support checks abstain: {hiring.abstentions.map(a => scenario(a.id)).join(', ')}.</p>
    <p><strong>Satisfaction · descriptive wave changes.</strong> Three irregular constructed waves are repeated cross-sections. Changes below compare respondent scores and response coverage; they do not establish employee improvement or an intervention effect. Predictive baseline comparison is not applicable.</p>
    <ul className="list-disc space-y-1 pl-5">{satisfaction.waves.map(w => <li key={w.date}>{date(w.date)}: score {w.scorePct}%; {w.respondents} respondents / {w.eligible} eligible ({w.participationPct}% response coverage).</li>)}</ul>
    <ul className="list-disc space-y-1 pl-5">{satisfaction.changes.map(c => <li key={c.toDate}>{date(c.fromDate)}–{date(c.toDate)}: score {signed(c.respondentScoreChangePp)} percentage points; coverage {signed(c.responseRateChangePp)} points. Nonresponse sensitivity range for eligible-population score change: {signed(c.nonresponseChangeBounds.lowerPp)} to {signed(c.nonresponseChangeBounds.upperPp)} points.</li>)}</ul>
    <p>Ranges assume comparable latent favorable-answer shares in [0, 1] and allow nonrespondent means to differ across waves. They are assumption-dependent sensitivity bounds, not confidence intervals. No satisfaction forecast, annualization or causal effect is estimated.</p>
    <p className="break-words text-muted-foreground">Fixed reviewed evidence; no live refresh. Methods: {hiring.protocolVersion} · {satisfaction.methodVersion}. Analysis version: {view.data.analysisIdentity.slice(0, 12)}.</p>
  </section>;
}
