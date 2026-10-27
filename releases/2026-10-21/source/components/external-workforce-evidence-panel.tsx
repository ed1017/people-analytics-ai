"use client"

import { useId, useState } from "react"
import { EXTERNAL_ROLE_SKILL_SOURCES, EXTERNAL_WORKFORCE_EVIDENCE, UK_SOFTWARE_PAY_REFERENCE, TORONTO_SOFTWARE_VACANCY_REFERENCE } from "@/lib/external-workforce-evidence"

const control = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
const link = "font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"

export function ExternalWorkforceEvidencePanel({ initialRole = "15-1252" }: { initialRole?: "15-1252" | "ca-21231" } = {}) {
  const id = useId()
  const [role, setRole] = useState<string>(initialRole)
  const [recordId, setRecordId] = useState(EXTERNAL_WORKFORCE_EVIDENCE[0].id)
  const record = EXTERNAL_WORKFORCE_EVIDENCE.find((item) => item.id === recordId) ?? EXTERNAL_WORKFORCE_EVIDENCE[0]
  const skills = EXTERNAL_ROLE_SKILL_SOURCES[0]
  const skillsOnly = role === skills.occupationCode
  const ukPay = UK_SOFTWARE_PAY_REFERENCE
  const ukOnly = role === "uk-2134"
  const toronto = TORONTO_SOFTWARE_VACANCY_REFERENCE
  const torontoOnly = role === "ca-21231"
  const payLabel = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value)

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <h2 id={`${id}-title`} className="text-lg font-bold text-[#04342C]">External workforce evidence</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-role`} className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Role</span>
          <select aria-label="Role" id={`${id}-role`} className={control} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="15-1252">Software Developers</option>
            <option value={skills.occupationCode}>{skills.occupationTitle}</option>
            <option value="uk-2134">Programmers and software development professionals (UK)</option>
            <option value="ca-21231">Software engineers and designers (Toronto)</option>
          </select>
        </label>
        <label htmlFor={`${id}-location`} className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Location</span>
          <select aria-label="Location" id={`${id}-location`} className={control} value={torontoOnly ? "CA-3530" : ukOnly ? "GB" : recordId} disabled={ukOnly || torontoOnly} onChange={(event) => setRecordId(event.target.value)}>
            {torontoOnly ? <option value="CA-3530">Toronto, Ontario (economic region)</option> : ukOnly ? <option value="GB">United Kingdom (national)</option> : EXTERNAL_WORKFORCE_EVIDENCE.map((item) => <option key={item.id} value={item.id}>{item.geography.name}</option>)}
          </select>
        </label>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="space-y-1 text-sm">
        <p className="font-semibold">{torontoOnly ? "Toronto vacancies and offered pay · survey estimates" : ukOnly ? "UK annual gross pay · provisional survey estimates" : skillsOnly ? "Role skills reference available" : "Local employment and pay estimates pending"}</p>
        {torontoOnly && <p>{toronto.occupation.title} · {toronto.occupation.taxonomy} {toronto.occupation.code}</p>}
        {ukOnly && <p>{ukPay.occupation.title} · {ukPay.occupation.taxonomy} {ukPay.occupation.code}</p>}
        <p>{torontoOnly ? "Toronto, Ontario economic region · Q2 2026 (April–June) · not seasonally adjusted. This is not Toronto city or its census metropolitan area." : ukOnly ? "United Kingdom · full-time employee jobs · tax year 6 April 2025–5 April 2026. Employees on adult rates in the same job for more than a year." : skillsOnly ? `For ${record.geography.name}, local estimates are unavailable. Explore the US-wide role requirements below.` : `${record.geography.name}: the source is identified; verified figures are not loaded yet.`}</p>
      </div>
      {torontoOnly && <div className="space-y-2 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt>Estimated job vacancies</dt><dd className="text-xl font-semibold">{toronto.vacancies.value === null ? "Unavailable" : toronto.vacancies.value.toLocaleString("en-CA")}</dd><dd>Quality {toronto.vacancies.quality}: {toronto.vacancies.qualityLabel}</dd></div>
          <div><dt>Average offered hourly wage (CAD)</dt><dd className="text-xl font-semibold">{toronto.averageOfferedHourlyWage.value === null ? "Unavailable" : `CAD ${toronto.averageOfferedHourlyWage.value.toFixed(2)}/hour`}</dd><dd>Quality {toronto.averageOfferedHourlyWage.quality}: {toronto.averageOfferedHourlyWage.qualityLabel}</dd></div>
        </dl>
        <p>Vacancies measure employer demand, not available candidates. Applicant availability and time to fill are not measured. Offered pay is not actual pay or total employer cost.</p>
      </div>}
      {ukOnly && <div className="space-y-2 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt>Median annual gross pay (GBP)</dt><dd className="text-xl font-semibold">{payLabel(ukPay.estimates.median)}</dd></div>
          <div><dt>Mean annual gross pay (GBP)</dt><dd className="text-xl font-semibold">{payLabel(ukPay.estimates.mean)}</dd></div>
        </dl>
        <p>National occupation reference, not a local hiring offer or total employer cost. Available candidates and time to fill are not measured. No automatic mapping to internal roles.</p>
      </div>}
      {torontoOnly ? (
        <a className={link} href={toronto.source.url} target="_blank" rel="noopener noreferrer">View Statistics Canada vacancy data <span className="sr-only">(opens a new tab)</span></a>
      ) : ukOnly ? (
        <a className={link} href={ukPay.source.url} target="_blank" rel="noopener noreferrer">View ONS occupational pay data <span className="sr-only">(opens a new tab)</span></a>
      ) : skillsOnly ? (
        <a className={link} href={skills.url} target="_blank" rel="noopener noreferrer">Explore Business Intelligence Analyst skills <span className="sr-only">(opens a new tab)</span></a>
      ) : (
        <a className={link} href={record.source.url} target="_blank" rel="noopener noreferrer">View BLS area sources <span className="sr-only">(opens a new tab)</span></a>
      )}
      <details className="text-sm text-slate-600">
        <summary className="w-fit cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Sources and definitions</summary>
        <div className="space-y-2 pt-1">
          {torontoOnly ? <>
            <p>{toronto.source.attribution}</p>
            <p>Released {toronto.releasedAt}; retrieved {toronto.retrievedAt}. Geography: {toronto.geography.taxonomy} {toronto.geography.code}. Quarterly estimates, not a sum of hires or current job listings.</p>
            <p>{toronto.limitation}</p>
            <p>Quality ratings include sampling variation, non-response, imputation and subject-matter assessment. Missing or suppressed values remain unavailable.</p>
            <a className={link} href={toronto.source.guideUrl} target="_blank" rel="noopener noreferrer">Survey definitions and quality guide <span className="sr-only">(opens a new tab)</span></a>
            <p><a className={link} href={toronto.source.licenseUrl} target="_blank" rel="noopener noreferrer">Statistics Canada Open Licence <span className="sr-only">(opens a new tab)</span></a></p>
          </> : ukOnly ? <>
            <p>{ukPay.source.publisher}, ASHE Table 14.7a, Full-Time sheet. Occupation {ukPay.occupation.code} ({ukPay.occupation.taxonomy}). Released {ukPay.releasedAt}; retrieved {ukPay.retrievedAt}. Provisional figures may be revised.</p>
            <p>Median coefficient of variation: {ukPay.estimates.medianCvPercent}%; mean: {ukPay.estimates.meanCvPercent}%. This describes sampling precision, not a pay range.</p>
            <p>{ukPay.limitation}</p>
            <p>{ukPay.source.license}.</p>
            <a className={link} href={ukPay.source.downloadUrl} target="_blank" rel="noopener noreferrer">Download the ONS source workbook archive <span className="sr-only">(opens a new tab)</span></a>
            <p><a className={link} href={ukPay.source.licenseUrl} target="_blank" rel="noopener noreferrer">Open Government Licence <span className="sr-only">(opens a new tab)</span></a></p>
          </> : skillsOnly ? <>
            <p>{skills.publisher}. Profile updated {skills.profileUpdatedYear}; checked {skills.verifiedAt}. Geography: {skills.geography}.</p>
            <p>{skills.limitation}</p>
          </> : <>
            <p>{record.source.publisher}. May 2025 reference period; released May 15, 2026. Source catalog checked {record.retrievedAt}. Occupation: {record.occupation.code} ({record.occupation.taxonomy}).</p>
            <p>{record.limitation}</p>
            <p>Mean and median annual wages are distinct USD measures. Missing or suppressed estimates remain unavailable.</p>
            <a className={link} href={record.source.licenseUrl} target="_blank" rel="noopener noreferrer">BLS reuse terms <span className="sr-only">(opens a new tab)</span></a>
          </>}
        </div>
      </details>
    </section>
  )
}
