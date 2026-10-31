# Conditional non-pay role references

Status: live and verified on October 31, 2026 (PR512).

## Scope and identity

A separate non-pay mapping registry adds two conditional mappings using existing verified source rows. It does not edit the pay registry or grant pay adoption.

- Stable role `OPS-BUS` resolves to the inventory's **Business Operations Specialist** (one US vacancy). A separate Lab reference labels the same identifier Business Operations Analyst; no title alias or Lab change is introduced. Use Management Analysts (O*NET 13-1111.00, BLS 13-1111) only for organizational/process analysis and improvement, not routine administration.
- Stable role `HR-PA`, **People Analytics Analyst** (two US vacancies), may use the broader Data Scientists reference (15-2051.00 / 15-2051) only for statistical workforce analysis and development/evaluation of statistical or predictive models. Reporting/dashboard-only and routine HR administration are excluded.

Existing reference tasks support crosswalk review; they do not verify actual vacancy duties. Explicit source and duty consent remains required before attaching to a saved allocation revision. These national occupational figures are not role-specific estimates. General chat may describe the conditional references but cannot confirm duties, attach evidence or change assumptions.

## Existing source evidence

No new download or new numeric evidence is introduced. O*NET 31.0 software file SHA256 `6aabb96b464288db849580e6510530efff3f80e25dde2bb23f1fc36bb526b016` remains unchanged, CC BY4.0 attribution and categorical flag semantics retained. BLS 2025-2035 workbook SHA256 `08ee182f992d972593e64559ce467bad75967d2228f11ad5e2f86d4ec0ee6c00` remains unchanged; US national projections, original thousands normalized to persons/jobs and published rounding preserved.

Management Analysts: annual projected openings 94,100, exits 35,900, transfers 47,400; projected employment change 10.1%. Data Scientists: openings 24,800, exits 5,600, transfers 9,700; change 34.6%. Openings, exits and transfers are annual averages for 2025-2035; the percentages are total employment change across the full decade. None measures current vacancies, available applicants, hires or local demand. Software flags do not assess employee proficiency or determine training duration. Shared occupational figures must not be summed across mapped internal roles.

## Compatibility and acceptance

All 50 canonical references from deployed PR510 are pinned by independent immutable-archive hashes. New references append without changing existing IDs, versions, facts or saved attachments. Pay coverage remains 59/197. Verified conditional non-pay eligibility is 46/197 (software 43, outlook 42, UK difficulty 3; overlapping).

Required checks include stable role identity, exact country/source, conditional duty wording, mixed-scope rejection, no pay expansion, all prior reference hashes, explicit consent/cancel/stale/reopen, exact canonical explanation payload, original saved work and backups, desktop/mobile stage and public acceptance. Provider calls remain mocked; no fresh provider acceptance is claimed. Release results follow.


## Verified release

PR512 runtime `63236723363e885414937737b5819b0e6836ad75`, merge `dfcfb86f277b794bfbadab451449b61f8c322079`, deployment `dpl_9xzGmqTvJEBbN3y8e15GPBiFGDjD`. Exact CI `41250772389` passed. Independent review included 16 focused tests; 144 affected aggregate tests, type graph, full production build/TypeScript and generated checks passed. The duty consent was tightened during review to require statistical analysis and model development/evaluation, rather than sampling or reporting alone.

Package SHA256 `62818bdf46a6b7d856d5582307cf50b594c4cf5597ab793d78689857a069761d`, 1,209 runtime inputs and 1,064 manifest files; private inputs unchanged. Isolated production stage `people-analytics-bvssdltfv-ed-56dc.vercel.app` was promoted unchanged after acceptance. Canonical www.ed-ai.app deployment identity was confirmed.

Staged and direct public desktop 1440/mobile 390 each passed ten workflow groups and eight intercepted explanation requests: actual PR510 backup, explicit goal copy, source/duty consent and cancellation, stale allocation rejection, immutable context/reopen/clear, reload isolation, Overview shared planner, both conditional roles with no pay adoption, unsupported countries/mixed roles, and backup restoration. Public navigation returned HTTP 200; page, blocked, mock and bridge errors were zero; teardown drained. Desktop/mobile screenshots were inspected. All 50 prior reference hashes and versions remain identical; source fixtures and pay eligibility are unchanged.

Two initial protected-stage attempts failed before workflow completion: the CLI bridge delayed JavaScript chunks, then source API loading. Failed reports were retained. The accepted stage run prefetched 40 exact authenticated responses (18 read-only source API URLs plus documents/assets), required HTTP 200 and valid public-source metadata, and replayed unchanged bytes/status/end-to-end headers. Independent transport review passed. This is behavioral acceptance, not a stage latency result. Direct public document/source GETs were not replayed and passed. Readiness and all chat POSTs were locally fulfilled in both modes: neither live readiness nor fresh provider answer/tool-choice acceptance is claimed. No paid model calls, new access, spending/security changes, Lab work or overlay promotion.

Executor evidence: `integration-evidence/CONDITIONAL-NONPAY-CONTEXT-RELEASE.json`, `CONDITIONAL-NONPAY-CONTEXT-PACKAGE.json`, `conditional-nonpay-aggregate.log`, `position-market-conditional-context-stage-6323672-exact-{1440,390}.json` and `position-market-conditional-context-public-6323672-{1440,390}.json`.

## Next evidence under review

Verified exact BLS 15-1241 and 13-1161 plus O*NET 15-1241.00 and 13-1161.00 extracts arrived from the previously hashed originals. They are candidate evidence, not added app mappings. Computer Network Architects requires actual planned network design/implementation and architecture/capacity-analysis duties; generic cloud/server operations do not qualify. Market Research Analysts requires substantive customer/market research and demand/trend analysis; CRM/pipeline/order/commission administration alone does not qualify. Existing Lab reference tasks support crosswalk review, not actual vacancy-duty proof. No source extraction remains awaited for those two candidates. The bounded O*NET handoff contains only In Demand=Y rows; full-occupation totals must not be replaced by the extracted row count, and excluded N is not zero demand.
