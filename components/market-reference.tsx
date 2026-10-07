"use client";

import type { ReactNode } from "react";
import { marketComparisons, marketCarryEvidence, oewsOccupations, oewsAreas, oewsProvenance, defaultMarketSelection } from "@/lib/oews-reference.mjs";
import { nationalOutlookComparisons, nationalOutlookEvidence, outlookProvenance } from "@/lib/labor-outlook.mjs";

export type MarketSelection = { soc: string; area: string };
export type MarketCarry = MarketSelection & { goal: string };
const money = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value)
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value) : "Unavailable";
const count = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "Unavailable";
const thousands = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const areaLabel = (code: string) => oewsAreas.find(area => area.value === code)?.label ?? "Unavailable";
const sourceLink = "inline-block min-h-11 py-2 text-primary underline underline-offset-4";
const cell = "px-3 py-3 text-right tabular-nums";

function ReferenceTable({ label, children }: { label: string; children: ReactNode }) {
  return <div role="region" aria-label={label} tabIndex={0} className="max-w-full overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{children}</div>;
}

export function MarketComparison({ selection, onChange, goal, onCarry }: {
  selection: MarketSelection; onChange: (value: MarketSelection) => void; goal: string; onCarry: (value: MarketCarry) => void;
}) {
  const comparisons = marketComparisons(selection);
  const evidence = comparisons?.selected;
  const outlook = nationalOutlookEvidence(selection.soc);
  return <section aria-label="Occupation and location comparison" className="min-w-0 space-y-6">
    <div>
      <h2 className="text-xl font-semibold">Occupation pay, employment and outlook</h2>
      <p className="mt-2 text-sm text-muted-foreground">3 occupations · 3 U.S. geographies · Public BLS reference snapshots</p>
      <p className="mt-2 text-sm">Explore the available occupations and locations. These external populations are separate from your workforce and internal pay ranges.</p>
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium">Occupation<select aria-label="Market occupation" className="mt-1 min-h-11 w-full min-w-0 rounded border bg-background p-2" value={selection.soc} onChange={event => onChange({ ...selection, soc: event.target.value })}>{oewsOccupations.map(occupation => <option key={occupation.value} value={occupation.value}>{occupation.label}</option>)}</select></label>
      <label className="min-w-0 text-sm font-medium">Location<select aria-label="Market location" className="mt-1 min-h-11 w-full min-w-0 rounded border bg-background p-2" value={selection.area} onChange={event => onChange({ ...selection, area: event.target.value })}>{oewsAreas.map(area => <option key={area.value} value={area.value}>{area.label}</option>)}</select></label>
    </div>
    {!evidence || !comparisons ? <div className="rounded-lg border p-4"><p role="alert">This occupation/location is not in the reference extract. Available coverage is limited to the choices above.</p><button onClick={() => onChange(defaultMarketSelection())} className="mt-3 min-h-11 rounded border px-3">Reset market selection</button></div> : <>
      <article className="min-w-0 space-y-3" aria-label="Wages and employment by occupation">
        <div><h3 className="font-semibold">Compare occupations in {areaLabel(selection.area)}</h3><p className="mt-1 text-sm text-muted-foreground">BLS OEWS · May 2025 · Annual USD wages · All industries</p></div>
        <ReferenceTable label="Occupation comparison">
          <table className="w-full min-w-[570px] text-left text-sm">
            <caption className="sr-only">May 2025 occupation wage and employment estimates in {areaLabel(selection.area)}. Select an occupation for its location comparison.</caption>
            <thead className="bg-muted/40"><tr><th scope="col" className="px-3 py-3">Occupation</th><th scope="col" className={cell}>Employment</th><th scope="col" className={cell}>Median pay</th><th scope="col" className={cell}>25th–75th percentile</th></tr></thead>
            <tbody>{comparisons.occupations.map(item => item && <tr key={item.selected.OCC_CODE} className={`border-t ${item.selected.OCC_CODE === selection.soc ? "bg-primary/5" : ""}`}><th scope="row" className="px-3 py-2 font-medium"><button aria-label={`Select ${item.selected.OCC_TITLE}`} aria-pressed={item.selected.OCC_CODE === selection.soc} onClick={() => onChange({ ...selection, soc: item.selected.OCC_CODE })} className="min-h-11 text-left text-primary underline underline-offset-4">{item.selected.OCC_TITLE}</button>{item.selected.OCC_CODE === selection.soc && <span className="ml-2 text-xs text-muted-foreground">Selected</span>}</th><td className={cell}>{count(item.selected.TOT_EMP)}</td><td className={cell}>{money(item.selected.A_MEDIAN)}</td><td className={`${cell} whitespace-nowrap`}>{money(item.selected.A_PCT25)}–{money(item.selected.A_PCT75)}</td></tr>)}</tbody>
          </table>
        </ReferenceTable>
        <p className="text-sm text-muted-foreground">Employment estimates describe covered wage-and-salary jobs, not available candidates or job vacancies. The middle 50% wage range is not a recommended salary band or a seniority scale.</p>
      </article>

      <article className="min-w-0 space-y-3" aria-label="Wages and employment by location">
        <h3 className="font-semibold">{evidence.selected.OCC_TITLE} across locations</h3>
        <ReferenceTable label="Location comparison">
          <table className="w-full min-w-[570px] text-left text-sm">
            <caption className="sr-only">{evidence.selected.OCC_TITLE}, May 2025, annual wages in USD and employment estimates by geography</caption>
            <thead className="bg-muted/40"><tr><th scope="col" className="px-3 py-3">Location</th><th scope="col" className={cell}>Employment</th><th scope="col" className={cell}>Median pay</th><th scope="col" className={cell}>25th–75th percentile</th></tr></thead>
            <tbody>{comparisons.locations.map(item => item && <tr key={item.selected.AREA} className={`border-t ${item.selected.AREA === selection.area ? "bg-primary/5" : ""}`}><th scope="row" className="max-w-64 px-3 py-2 font-medium"><button aria-label={`Select ${areaLabel(item.selected.AREA)}`} aria-pressed={item.selected.AREA === selection.area} onClick={() => onChange({ ...selection, area: item.selected.AREA })} className="min-h-11 text-left text-primary underline underline-offset-4">{areaLabel(item.selected.AREA)}</button>{item.selected.AREA === selection.area && <span className="ml-2 text-xs text-muted-foreground">Selected</span>}</th><td className={cell}>{count(item.selected.TOT_EMP)}</td><td className={cell}>{money(item.selected.A_MEDIAN)}</td><td className={`${cell} whitespace-nowrap`}>{money(item.selected.A_PCT25)}–{money(item.selected.A_PCT75)}</td></tr>)}</tbody>
          </table>
        </ReferenceTable>
        {selection.area !== "99" && <p className="text-sm">The {areaLabel(selection.area)} median is {evidence.medianDifferencePct === null ? "unavailable" : `${Math.abs(evidence.medianDifferencePct)}% ${evidence.medianDifferencePct >= 0 ? "above" : "below"} the U.S. median`} for {evidence.selected.OCC_TITLE.toLowerCase()} in the same May 2025 release. This descriptive difference is not adjusted for cost of living or worker and employer mix.</p>}
        <p className="text-sm text-muted-foreground">The NY-NJ metro is broader than New York City and crosses state lines. These geographies overlap; do not add their employment estimates. Wages exclude benefits and some compensation components and are not total employer costs.</p>
        <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className={sourceLink}>Official BLS source workbook</a>
      </article>

      <article aria-label="National occupation outlook" className="min-w-0 space-y-3 border-t pt-5">
        <div><h3 className="font-semibold">National outlook, {outlookProvenance.period}</h3><p className="mt-1 text-sm text-muted-foreground">United States only · BLS Employment Projections · Released August 27, 2026</p></div>
        <p className="text-sm">Location selection applies to OEWS pay and employment above. The outlook below stays national; state and metro projections are not included.</p>
        <ReferenceTable label="National outlook comparison">
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="px-3 py-2 text-left text-sm text-muted-foreground">Employment and annual openings in thousands. Growth covers the full 2025–2035 decade.</caption>
            <thead className="bg-muted/40"><tr><th scope="col" className="px-3 py-3">Occupation</th><th scope="col" className={cell}>2025 jobs</th><th scope="col" className={cell}>2035 projected jobs</th><th scope="col" className={cell}>10-year growth</th><th scope="col" className={cell}>Annual average openings</th></tr></thead>
            <tbody>{nationalOutlookComparisons().map(item => item && <tr key={item.selected.soc} className={`border-t ${item.selected.soc === selection.soc ? "bg-primary/5" : ""}`}><th scope="row" className="px-3 py-3 font-medium">{item.selected.title}{item.selected.soc === selection.soc && <span className="ml-2 text-xs text-muted-foreground">Selected</span>}</th><td className={cell}>{thousands(item.selected.employment_base_thousands)}</td><td className={cell}>{thousands(item.selected.employment_projected_thousands)}</td><td className={cell}>{item.selected.employment_change_percent.toFixed(1)}%</td><td className={cell}>{thousands(item.selected.annual_openings_thousands)}</td></tr>)}</tbody>
          </table>
        </ReferenceTable>
        {outlook && <p className="text-sm">For {outlook.selected.title.toLowerCase()}, BLS projects a net increase of {thousands(outlook.selected.employment_change_thousands)} thousand jobs over the decade. Annual openings also include workers leaving an occupation; they are not only new jobs or current vacancies.</p>}
        <p className="text-sm text-muted-foreground">This is the National Employment Matrix population, including self-employment. Its base employment differs from OEWS: do not apply this growth rate to the local counts above. Published values are rounded; projections are not guarantees or company hiring targets.</p>
        <div className="flex flex-wrap gap-x-5"><a href={outlookProvenance.sourceUrl} target="_blank" rel="noreferrer" className={sourceLink}>BLS projection table 1.2</a><a href={outlookProvenance.definitionsUrl} target="_blank" rel="noreferrer" className={sourceLink}>Projection definitions</a></div>
      </article>

      <div className="rounded-lg border bg-muted/20 p-4"><button disabled={!goal.trim()} onClick={() => onCarry({ ...selection, goal })} className="min-h-11 rounded bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Carry reference to Planning</button><p className="mt-2 text-sm text-muted-foreground">{goal.trim() ? `Carry the selected ${evidence.selected.OCC_TITLE} / ${areaLabel(selection.area)} wage and employment snapshot. National projections stay here; model assumptions remain unchanged.` : "Pin a goal above to carry this reference."}</p></div>
      <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">Data details</summary>
        <p className="mt-3">OEWS May 2025, released May 15, 2026. Three occupations across the U.S., New York State and the full New York–Newark–Jersey City, NY-NJ metro. SOC {selection.soc}; geography code {selection.area}. Both reference datasets are frozen public-domain BLS extracts; they do not refresh automatically.</p>
        <p className="mt-2">Selected location&apos;s 10th percentile: {money(evidence.selected.A_PCT10)}; 90th percentile: {money(evidence.selected.A_PCT90)}. Employment sampling error (percent relative standard error): {evidence.selected.EMP_PRSE === null ? "Unavailable" : `${evidence.selected.EMP_PRSE}%`}. This error measure does not describe uncertainty in wage percentiles.</p>
        <p className="mt-2">Location quotient: {evidence.selected.LOC_QUOTIENT ?? "Not applicable nationally"}. This measures occupational employment concentration relative to the U.S., not recruiting ease or worker skill.</p>
        <p className="mt-2">Missing or suppressed values remain unavailable. No annual pay trend or internal pay competitiveness is inferred. O*NET descriptions, company job mappings and employee skills are separate evidence; this selection does not establish a company role match or a company pay midpoint.</p>
        <div className="mt-2 flex flex-wrap gap-x-5"><a href={oewsProvenance.sourceUrl} target="_blank" rel="noreferrer" className={sourceLink}>OEWS source tables</a><a href={oewsProvenance.technicalNotesUrl} target="_blank" rel="noreferrer" className={sourceLink}>May 2025 wage definitions</a><a href={outlookProvenance.releaseUrl} target="_blank" rel="noreferrer" className={sourceLink}>2025–2035 projections release</a></div>
      </details>
    </>}
  </section>;
}

export function CarriedMarketReference({ carry, onClear }: { carry: MarketCarry; onClear: () => void }) {
  const evidence = marketCarryEvidence(carry);
  if (!evidence) return null;
  return <section aria-label="Carried market reference" className="mx-6 mt-5 border-b pb-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Market reference for your goal</h2><button onClick={onClear} className="min-h-11 rounded border px-2 py-1">Remove market reference</button></div><p className="mt-2">{evidence.selected.OCC_TITLE} · {evidence.selected.AREA_TITLE} · Median annual pay {money(evidence.selected.A_MEDIAN)} · BLS OEWS May 2025</p><p className="mt-1 text-xs text-muted-foreground">Reference only. Model assumptions are unchanged; wages exclude other employer costs.</p><details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 text-primary">Reference details</summary><p className="mt-2">Carried goal: {evidence.goal}</p><p className="mt-1">25th–75th percentile: {money(evidence.selected.A_PCT25)}–{money(evidence.selected.A_PCT75)}. Employment: {count(evidence.selected.TOT_EMP)}, not available candidates. {evidence.selected.AREA === "35620" ? "Metro coverage extends beyond New York City." : ""}</p><a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className={sourceLink}>Official source · released May 15, 2026</a></details></section>;
}
