# Workforce market explorer — October 29, 2026

The Labor Market page now has one market explorer. The US view starts with zero-based pay and employed-workforce charts across the United States, New York State and the New York–Newark–Jersey City metro, for Software Developers, Data Scientists and Registered Nurses. It reuses the reviewed May 2025 OEWS extract. The New York software reference is reconciled to the same canonical 121,000 employed jobs and USD 166,830 median annual wage; Boston remains unreviewed and unavailable. Overlapping geographies are not additive and employment is not candidate availability.

Canada and UK remain distinct native-unit references: Toronto economic-region software-engineering vacancies and offered hourly CAD wages, Q2 2026; and UK national software annual GBP pay, ASHE 2026 provisional. No exchange-rate, hourly-to-annual conversion or geography ratio is introduced. Source-market selection now persists in the existing goal workspace alongside the existing US role/location selection, with old saves defaulting to US.

A bounded training comparison adds Computer Systems Analysts → Software Developers, an officially listed related occupation. The reviewed O*NET OnLine profiles supply transferable skill names, grouped by exact common/different names. These are qualitative occupation descriptions, not weighted similarity, employee readiness, training duration/cost or a course recommendation. Profile URLs, taxonomy, check date, licence and modification disclosure are retained in Details. The independent source extract is `source/tests/fixtures/external-workforce-evidence/onet-software-systems-source-extract.json`.

Use in plan retains the existing canonical market-reference transaction and historical goal evidence. Including the training comparison is explicit and optional; only its reviewed ID and compatible SOC are accepted. Forged values and mismatched roles are rejected. Planning retains source/period/native units and optional skills Details. The decision brief distinguishes BLS plus O*NET references. Model assumptions, saved plan versions, tracking/results and backup semantics are unchanged.

## Evidence limits

- New Canada regional/occupation rows and comparable-quarter trends are deferred: the official Statistics Canada archive request returned HTTP 403 in this environment, and the browser reader cannot ingest ZIP archives. The existing reviewed two-row Toronto extract is preserved without substitution. Its economic region is not the Toronto CMA; no vacancy ratio is calculated.
- O*NET bulk CSV retrieval also returned HTTP 403. The bounded qualitative comparison uses directly reviewed official profile sections rather than claiming a bulk database import. No numeric skill ratings are imported.
- No BLS download or Canadian Job Bank retry was attempted. No paid subscription, new credentials or provider calls were used.

## Validation

32 focused market/source/carry/attribution tests pass. The new tests cover all nine reviewed US selections, bar selection, role changes, repeated explicit carries, canonical optional skills, forged IDs, persistence/reload, duplicate history and preservation of model fields. Independent review found no numeric or save-compatibility blocker; its attribution and controlled-source-state findings were addressed.

The root aggregate passes 3,093 tests; root generated-artifact checks and TypeScript pass. An exploratory all-runtime glob has the same 16 failure names as untouched main: excluded private inputs and historical relative paths are unavailable in this public source layout. This is not reported as a passing full-runtime suite. The required selected runtime contracts and exact-head CI are checked separately. Browser and deployment results will be recorded after release verification.

Browser acceptance used the actual React components in an isolated local harness (1440px and 390px). Fourteen assertions per viewport passed: exact New York values, optional skill inclusion, source links, repeated carries, reload, occupation changes excluding incompatible skills, US location persistence, Canada/UK native-unit carries, source selection persistence and no errors/overflow. This is component-flow evidence; public application navigation and publication are checked separately.

Standalone hosted-source TypeScript also reports five existing errors from excluded `experiments/swp-headcount` inputs. The new chart nullability errors identified during implementation were fixed. Root TypeScript passes; the exact production-package build will verify the complete runtime.
