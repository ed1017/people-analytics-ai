"use client"

import { useId, useState } from "react"
import { EXTERNAL_ROLE_SKILL_SOURCES, EXTERNAL_WORKFORCE_EVIDENCE } from "@/lib/external-workforce-evidence"

const control = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
const link = "font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"

export function ExternalWorkforceEvidencePanel() {
  const id = useId()
  const [role, setRole] = useState("15-1252")
  const [recordId, setRecordId] = useState(EXTERNAL_WORKFORCE_EVIDENCE[0].id)
  const record = EXTERNAL_WORKFORCE_EVIDENCE.find((item) => item.id === recordId) ?? EXTERNAL_WORKFORCE_EVIDENCE[0]
  const skills = EXTERNAL_ROLE_SKILL_SOURCES[0]
  const skillsOnly = role === skills.occupationCode

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <h2 id={`${id}-title`} className="text-lg font-bold text-[#04342C]">External workforce evidence</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-role`} className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Role</span>
          <select aria-label="Role" id={`${id}-role`} className={control} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="15-1252">Software Developers</option>
            <option value={skills.occupationCode}>{skills.occupationTitle}</option>
          </select>
        </label>
        <label htmlFor={`${id}-location`} className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Location</span>
          <select aria-label="Location" id={`${id}-location`} className={control} value={recordId} onChange={(event) => setRecordId(event.target.value)}>
            {EXTERNAL_WORKFORCE_EVIDENCE.map((item) => <option key={item.id} value={item.id}>{item.geography.name}</option>)}
          </select>
        </label>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="space-y-1 text-sm">
        <p className="font-semibold">{skillsOnly ? "Role skills reference available" : "Local employment and pay estimates pending"}</p>
        <p>{skillsOnly ? `For ${record.geography.name}, local estimates are unavailable. Explore the US-wide role requirements below.` : `${record.geography.name}: the source is identified; verified figures are not loaded yet.`}</p>
      </div>
      {skillsOnly ? (
        <a className={link} href={skills.url} target="_blank" rel="noopener noreferrer">Explore Business Intelligence Analyst skills <span className="sr-only">(opens a new tab)</span></a>
      ) : (
        <a className={link} href={record.source.url} target="_blank" rel="noopener noreferrer">View BLS area sources <span className="sr-only">(opens a new tab)</span></a>
      )}
      <details className="text-sm text-slate-600">
        <summary className="w-fit cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Sources and definitions</summary>
        <div className="space-y-2 pt-1">
          {skillsOnly ? <>
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
