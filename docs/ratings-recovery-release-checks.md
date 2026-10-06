# Recovery review checks and base reconciliation

The recovery includes current main `119c3eead413d815dbc373a84683060ca12bd012`, freshly fetched 2026-10-06. GitHub PR159 metadata confirms this is its merge commit and its validated head is `3a97a756f70987558a800c6726d1db5b362accbb`. Both commits have identical tree `14a896e87155cdf2a61fddf96dceca4539867517`; the validated PR159 head is an ancestor of recovery. Thus recovery is not based on pre-PR159 code. Original checkpoint `8afdb5cb90f3db77fa403e82061792fbd9d88f02` remains preserved.

## Correction to the earlier test-count report

The earlier “full repository” command `node --test tests/*.test.mjs` was **top-level only**. It excluded eight unchanged files under `tests/synthetic-workforce/`, containing exactly 59 tests. That report overstated the selection's completeness; it did not indicate a regression or an older base.

A clean detached worktree at exact main/PR159 merge was tested:

- Top-level tests: **1,348 passed**.
- Eight nested synthetic-workforce test files: **59 passed**.
- Combined base: **1,407**, exactly matching PR159's report.

Checkpoint 8afdb5c added 16 top-level tests, explaining **1,364 = 1,348 + 16**; with nested tests it is 1,423. The temporal SQL fix adds 12 more counted cases (one parent plus eleven subtests), yielding **1,435** tests in the final recursive selection. The complete command is:

`PGLITE_MODULE=/tmp/ratings-sql-test/node_modules/@electric-sql/pglite/dist/index.js sh -c 'rg --files tests -g "*.test.mjs" -0 | xargs -0 node --test'`

PGlite was installed locally outside package manifests. Without PGLITE_MODULE, its two test groups skip; such a run must not be reported as the same count/coverage.

No preexisting `.test.mjs` file was deleted or reduced. The old standalone synthetic-career browser script was deliberately replaced by the original-workforce ratings-page browser script when that panel was removed. It is outside both unit selections. Other Home/PR159 code remains present; the only subsequent Home change is requested instruction copy: step 4 “Share Action Plan (TBD) - Directly share action plan with other owners” and step 5 “Track results (TBD) - Track, monitor, and adjust action plans in real time”, preserving steps 1–3 and layout. This does not implement sharing/tracking.

## SQL audit correction

The proposed private SQL now respects a known post-opening prior-level re-entry rather than generating an earlier date. It checks the entire candidate spell through promotion against later snapshots and movements. Conflicting/unknown levels, ambiguous same-day reset history and unresolved promotion-day event ordering withhold duration. Unchanged-level transfers do not reset an otherwise valid entry date.

Eleven PostgreSQL regressions cover the two originally confirmed counterexamples and related ambiguity/valid-reuse cases. Private source-preservation, deterministic generation, rollback, inactive/null output and no app access checks remain. This is still an unexecuted, owner-only preparation proposal; source column types, index plans, complete outcome coverage, survivor bias and joint release scope remain parent review concerns.

## Release boundaries

Ratings server integration uses only the exact aggregate RPC and keeps null/error/unsupported scopes unavailable. Promotion rate/time remain unavailable; there is no October projection. No live database validation or activation was performed. Proposed SQL defaults to ROLLBACK and is not in an automatic migrations path.

The user authorized a new isolated branch and draft PR for preview acceptance. Original PR158 and both recovery checkpoints remain unchanged. No merge, production deployment, remote SQL, access change or database activation is authorized by this step. Hosted preview acceptance must be reported against the exact final SHA; local/browser fixture success is not hosted acceptance.

## Final local results before branch publication

- All recursively selected tests: **1,435 passed, 0 failed, 0 skipped** (including 13 local PostgreSQL cases).
- Production build (including TypeScript/prebuild checks), full ESLint and diff checks: pass.
- Built ratings page: **30 browser checks** pass at desktop/mobile/narrow viewport widths, with intercepted APIs and zero external/model calls.
- Actual built dashboard endpoint: **11 loopback-only fake-Supabase cases** pass.
- Requested Home instructions: exact five-step text and unchanged steps 1–3 checked and screenshots visually reviewed at 1440px and 375px; no external requests or sharing actions.

Local evidence is retained under `/workspace/ratings-review-evidence/`. Hosted preview receipt and acceptance belong in the parent handoff after the exact reviewed commit is pushed; they are not claimed by these local checks.
