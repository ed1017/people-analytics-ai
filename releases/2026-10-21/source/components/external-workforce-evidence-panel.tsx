"use client"

import { useId, useState, type ReactNode } from "react"
import { UK_SOFTWARE_PAY_REFERENCE, TORONTO_SOFTWARE_VACANCY_REFERENCE } from "@/lib/external-workforce-evidence"

import {MarketComparison} from "@/components/market-reference"
import {defaultMarketSelection} from "@/lib/oews-reference.mjs"
import type {MarketCarry} from '@/lib/market-reference-carry'

const control = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
const link = "font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"

export function ExternalWorkforceEvidencePanel({ initialRole = "15-1252", goal="", onCarry, usMarket, marketSource, onMarketChange }: { initialRole?: "15-1252" | "ca-21231"; goal?:string; onCarry?:(carry:MarketCarry)=>void; usMarket?:ReactNode; marketSource?:string; onMarketChange?:(source:string)=>void } = {}) {
  const [carryError,setCarryError]=useState("")
  const [selection,setSelection]=useState(()=>({...defaultMarketSelection(),area:"35620"}))
  const id = useId()
  const [role, setRole] = useState<string>(initialRole)
  const selectedRole=marketSource??role
  const ukPay = UK_SOFTWARE_PAY_REFERENCE
  const ukOnly = selectedRole === "uk-2134"
  const toronto = TORONTO_SOFTWARE_VACANCY_REFERENCE
  const torontoOnly = selectedRole === "ca-21231"
  const payLabel = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value)

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <h2 id={`${id}-title`} className="text-lg font-bold text-[#04342C]">Workforce market explorer</h2>
      <label htmlFor={`${id}-market`} className="block max-w-xl space-y-1 text-sm font-semibold">
        <span>Market</span>
        <select aria-label="Market" id={`${id}-market`} className={control} value={selectedRole} onChange={event=>{setRole(event.target.value);onMarketChange?.(event.target.value);setCarryError('')}}>
          <option value="15-1252">United States · workforce and pay</option>
          <option value="ca-21231">Canada · vacancies and offered pay</option>
          <option value="uk-2134">United Kingdom · annual pay</option>
        </select>
      </label>
      {!ukOnly&&!torontoOnly ? (usMarket??<MarketComparison selection={selection} onChange={setSelection} goal={goal} onCarry={onCarry??(()=>{})}/>) : <>
      <div role="status" aria-live="polite" aria-atomic="true" className="space-y-1 text-sm">
        <p className="font-semibold">{torontoOnly ? "Toronto vacancies and offered pay · survey estimates" : ukOnly ? "UK annual gross pay · provisional survey estimates" : ""}</p>
        {torontoOnly && <p>{toronto.occupation.title} · {toronto.occupation.taxonomy} {toronto.occupation.code}</p>}
        {ukOnly && <p>{ukPay.occupation.title} · {ukPay.occupation.taxonomy} {ukPay.occupation.code}</p>}
        <p>{torontoOnly ? "Toronto economic region · Q2 2026 · not seasonally adjusted" : ukOnly ? "United Kingdom · full-time employee jobs · 6 April 2025-5 April 2026" : ""}</p>
      </div>
      {torontoOnly && <div className="space-y-2 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt>Estimated job vacancies</dt><dd className="text-xl font-semibold">{toronto.vacancies.value === null ? "Unavailable" : toronto.vacancies.value.toLocaleString("en-CA")}</dd><dd>Quality {toronto.vacancies.quality}: {toronto.vacancies.qualityLabel}</dd></div>
          <div><dt>Average offered hourly wage (CAD)</dt><dd className="text-xl font-semibold">{toronto.averageOfferedHourlyWage.value === null ? "Unavailable" : `CAD ${toronto.averageOfferedHourlyWage.value.toFixed(2)}/hour`}</dd><dd>Quality {toronto.averageOfferedHourlyWage.quality}: {toronto.averageOfferedHourlyWage.qualityLabel}</dd></div>
        </dl>
<p>Employer demand estimate.</p><p>Vacancy trend unavailable: one reviewed quarter. Workforce size is not loaded for this economic region.</p>
      </div>}
      {ukOnly && <div className="space-y-2 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt>Median annual gross pay (GBP)</dt><dd className="text-xl font-semibold">{payLabel(ukPay.estimates.median)}</dd></div>
          <div><dt>Mean annual gross pay (GBP)</dt><dd className="text-xl font-semibold">{payLabel(ukPay.estimates.mean)}</dd></div>
        </dl>
<p>National pay estimate.</p><p>Regional workforce size and vacancy trends are unavailable in this release.</p>
      </div>}
      <a className={link} href={torontoOnly?toronto.source.url:ukPay.source.url} target="_blank" rel="noopener noreferrer">Official source <span className="sr-only">(opens a new tab)</span></a>
      {onCarry&&<div><button type="button" disabled={!goal.trim()} className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" onClick={()=>{try{onCarry({version:1,kind:'external-workforce-reference',referenceId:ukOnly?ukPay.id:toronto.id,goal});setCarryError('');}catch(error){setCarryError(error instanceof Error?error.message:'Reference could not be saved.');}}}>Use in plan</button><p className="mt-1 text-xs">{goal.trim()?'Carry the reference with your goal.':'Select a goal to carry this reference.'}</p><p role="alert">{carryError}</p></div>}
      <details className="text-sm text-slate-600">
        <summary className="w-fit cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Details</summary>
        <div className="space-y-2 pt-1">
          {torontoOnly ? <>
            <p>{toronto.source.attribution}</p>
            <p>Released {toronto.releasedAt}; retrieved {toronto.retrievedAt}. Geography: {toronto.geography.taxonomy} {toronto.geography.code}. Quarterly estimates, not a sum of hires or current job listings.</p>
            <p>{toronto.limitation}</p><p>Applicant availability and time to fill are not measured. Offered pay is not actual pay.</p>
            <p>Quality ratings include sampling variation, non-response, imputation and subject-matter assessment. Missing or suppressed values remain unavailable.</p>
            <a className={link} href={toronto.source.guideUrl} target="_blank" rel="noopener noreferrer">Survey definitions and quality guide <span className="sr-only">(opens a new tab)</span></a>
            <p><a className={link} href={toronto.source.licenseUrl} target="_blank" rel="noopener noreferrer">Statistics Canada Open Licence <span className="sr-only">(opens a new tab)</span></a></p>
          </> : ukOnly ? <>
            <p>{ukPay.source.publisher}, ASHE Table 14.7a, Full-Time sheet. Occupation {ukPay.occupation.code} ({ukPay.occupation.taxonomy}). Released {ukPay.releasedAt}; retrieved {ukPay.retrievedAt}. Provisional figures may be revised.</p>
            <p>Median coefficient of variation: {ukPay.estimates.medianCvPercent}%; mean: {ukPay.estimates.meanCvPercent}%. This describes sampling precision, not a pay range.</p>
            <p>{ukPay.limitation}</p><p>Full-time employee jobs on adult rates, in the same job for more than a year.</p>
            <p>{ukPay.source.license}.</p>
            <a className={link} href={ukPay.source.downloadUrl} target="_blank" rel="noopener noreferrer">Download the ONS source workbook archive <span className="sr-only">(opens a new tab)</span></a>
            <p><a className={link} href={ukPay.source.licenseUrl} target="_blank" rel="noopener noreferrer">Open Government Licence <span className="sr-only">(opens a new tab)</span></a></p>
          </> : null}
        </div>
      </details>
      </>}
    </section>
  )
}
