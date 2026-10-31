# Position-market coverage expansion

PR487 is live and direct public desktop/mobile acceptance passed. Runtime `dadc0c19ac1596c2425c839f0c73ad4a0cbd8fa8`, merge `f87749f6a3ed178dc8f6c8ff435d65c245e25ddf`, deployment `dpl_CPTkUfw4NN7TfM7HhBHxkzux3wtL`.

## Inventory coverage

The immutable company-position-model-v2 register contains 197 vacancies: 51 in the United States and 20 in the United Kingdom. This release targets six current vacancies, up from two, without changing the register or manufacturing missing evidence.

| Reviewed planning reference | Vacancies before | Vacancies after |
|---|---:|---:|
| US software roles / Software Developers | 2 | 2 |
| US Business Intelligence Analyst / broader Data Scientists occupation | 0 | 1 |
| UK software roles / Programmers and software development professionals | 0 | 3 |
| Total | 2 | 6 |

The UK slots are one each of Frontend Software Engineer, Backend Software Engineer and Software Engineer. The US addition is one Business Intelligence Analyst. All six current covered slots are modeled 1-FTE recruiting vacancies. Coverage does not establish Finance approval or observed employee attributes. The remaining 191 vacancies do not receive an unsupported pay assumption.

## Source and assumption boundaries

The existing reviewed May 2025 OEWS extract supplies US pay. O*NET identifies Business Intelligence Analysts as occupation 15-2051.01 within the broader Data Scientists wage group; the UI must name that broader reference and require the visitor to confirm the duties match. It must not present a BI-specific wage estimate. Source: https://www.onetonline.org/link/summary/15-2051.01 .

The existing ONS ASHE reference supplies UK SOC 2020 2134 annual gross GBP pay for full-time employee jobs, adult rates, same job more than one year, April 2025 to April 2026. The provisional October 2026 release supplies median GBP 59,862.50 and mean GBP 69,120.60, with recorded quality and archive/workbook/cell provenance. There is no automatic exchange rate. The visitor must supply and confirm a dated USD-per-GBP planning assumption before adoption into the USD scenario. Native pay, statistic, FX direction/rate/date, employer on-cost and rounded USD result remain distinct in saved evidence.

Mixed roles/countries, unsupported mappings, invalid conversion assumptions and regional mismatches cannot silently adopt another source. Broad hiring-difficulty and qualitative skills references do not supply candidate availability, training success or hiring time. Existing software v1 records must remain byte-compatible; new evidence versions retain exact historical interpretation through save, backup and Track/Review.

## Release gates

Independent review; old/new evidence invariants and malformed/stale input tests; exact-head CI; production-equivalent staging without domain assignment; desktop/mobile adoption, cancel, mixed-scope, restore, saved revision and Track/Review acceptance. No paid provider calls, new data credentials, denied-source retries, Lab changes or chart-overlay promotion.

## Completed build and staging checks

- Independent review found no code blockers. Fifteen model and thirteen UI cases passed independently; the 115-test affected regression suite and position type graph passed.
- Exact-head CI `41189286409` succeeded. Full staged build, TypeScript, generated-data and source-manifest checks passed.
- Production-equivalent staging: https://people-analytics-edfk9zt6q-ed-56dc.vercel.app . It was built without public domain assignment, then promoted unchanged after functional acceptance.
- Package SHA-256 `6ff5495476326f788c1653630e7e78cd05beba83437a90f0d36ec79e009c52e7`; 1,192 archive entries, 1,047 manifest files. Four model/UI/test source files changed; private runtime inputs and dependency manifests were unchanged. Installation reported 33 existing dependency audit findings; no automatic upgrades were included.
- Staged desktop (1440px) and mobile (390px) each passed seven functional groups: actual prior-release backup restore; old US software revision reopen; broader BI adoption/cancel; UK native currency and invalid/future/unconfirmed FX rejection; stale review and mixed-role rejection; immutable save/reload; Track/Review and expanded backup restore.
- Both staged reports had zero page, blocked-request or bridge errors before teardown. Protected-bridge shutdown then reached its 15-second bound and reported late route-already-handled errors for dashboard/capabilities. This is recorded as a teardown limitation, not a clean transport claim.
- Evidence prefix: `integration-evidence/position-market-coverage-stage-dadc0c19-{1440,390}`. Actual desktop/mobile images were inspected.

## Public acceptance

The first direct-public run stopped at an overly broad whole-workspace equality assertion after legacy backup restoration. Normal dashboard hydration added existing default fields and refreshed the workspace timestamp; original allocation/market records remained present. Failed reports are retained as `position-market-coverage-public-dadc0c19-{1440,390}.json`. Final checks compare saved relationships and original fields rather than incidental hydration timestamps.

The next desktop attempt raced initial header hydration and incorrectly selected a mobile-only Workspace control. Its failure is retained as `position-market-coverage-public-dadc0c19-verified-1440.json`; the helper now waits for the known desktop Settings control. Neither harness correction changed application code or weakened saved-record assertions.

Final desktop report `position-market-coverage-public-dadc0c19-final-1440.json` and mobile report `position-market-coverage-public-dadc0c19-verified-390.json` each passed all seven functional groups, with zero page errors, blocked requests or bridge errors and clean drained teardown. Native/source values, explicit conversion and Review screenshots were inspected. The real prior-release backup retained every original field, saved allocation/market revision and goal relationship; only four named previously absent default fields and hydration timestamps could change. Expanded v1/v2 backup restore, recorded 0.75 FTE against a 1 FTE target, and the resulting 0.25 FTE shortfall remained correct after reload.

The public hostname resolved to the exact deployment above; runtime identity is established by the verified package/build and unchanged promotion. No paid model calls, new permissions, denied-source retries, Lab changes or chart-overlay promotion. This expands adopted pay-reference coverage to six vacancies; it does not establish applicant supply or role-level hiring-time evidence for the remaining inventory.
