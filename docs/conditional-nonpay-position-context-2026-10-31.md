# Conditional non-pay role references

Status: implementation and verification in progress; not yet published.

## Scope and identity

A separate non-pay mapping registry adds two conditional mappings using existing verified source rows. It does not edit the pay registry or grant pay adoption.

- Stable role `OPS-BUS` resolves to the inventory's **Business Operations Specialist** (one US vacancy). A separate Lab reference labels the same identifier Business Operations Analyst; no title alias or Lab change is introduced. Use Management Analysts (O*NET 13-1111.00, BLS 13-1111) only for organizational/process analysis and improvement, not routine administration.
- Stable role `HR-PA`, **People Analytics Analyst** (two US vacancies), may use the broader Data Scientists reference (15-2051.00 / 15-2051) only for statistical workforce analysis and development/evaluation of statistical or predictive models. Reporting/dashboard-only and routine HR administration are excluded.

Existing reference tasks support crosswalk review; they do not verify actual vacancy duties. Explicit source and duty consent remains required before attaching to a saved allocation revision. These national occupational figures are not role-specific estimates. General chat may describe the conditional references but cannot confirm duties, attach evidence or change assumptions.

## Existing source evidence

No new download or new numeric evidence is introduced. O*NET 31.0 software file SHA256 `6aabb96b464288db849580e6510530efff3f80e25dde2bb23f1fc36bb526b016` remains unchanged, CC BY4.0 attribution and categorical flag semantics retained. BLS 2025-2035 workbook SHA256 `08ee182f992d972593e64559ce467bad75967d2228f11ad5e2f86d4ec0ee6c00` remains unchanged; US national projections, original thousands normalized to persons/jobs and published rounding preserved.

Management Analysts: annual projected openings 94,100, exits 35,900, transfers 47,400; projected employment change 10.1%. Data Scientists: openings 24,800, exits 5,600, transfers 9,700; change 34.6%. Openings, exits and transfers are annual averages for 2025-2035; the percentages are total employment change across the full decade. None measures current vacancies, available applicants, hires or local demand. Software flags do not assess employee proficiency or determine training duration. Shared occupational figures must not be summed across mapped internal roles.

## Compatibility and acceptance

All 50 canonical references from deployed PR510 are pinned by independent immutable-archive hashes. New references append without changing existing IDs, versions, facts or saved attachments. Pay coverage remains 59/197. Candidate non-pay eligibility is 46/197 (software 43, outlook 42, UK difficulty 3; overlapping).

Required checks include stable role identity, exact country/source, conditional duty wording, mixed-scope rejection, no pay expansion, all prior reference hashes, explicit consent/cancel/stale/reopen, exact canonical explanation payload, original saved work and backups, desktop/mobile stage and public acceptance. Provider calls remain mocked; no fresh provider acceptance is claimed. Release results will follow after verification.
