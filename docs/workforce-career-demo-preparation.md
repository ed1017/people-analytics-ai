# Private original-workforce demo history preparation

Prepared locally, not executed remotely. Original recovery commit `a6610895edaf001b15fe0c85518b066bad4546fb` remains intact. This work does not overlap the separate turnover/hiring ML work.

## Exact proposed access and reversible operation

`database/workforce_career_demo_history.proposed.sql` creates **only** a new private `career_demo_preparation_v1` schema with a manifest, an employee-keyed supplement and nine private aggregate candidates. An administrator is the only intended reader/writer. All three tables enable RLS with no policies. PUBLIC, anon, authenticated and service_role receive no schema/table access; existing grants are untouched. No RPC, publication, activation, source update or new rating read exists. Each file ends with ROLLBACK by default. No migration has been applied. A separate rollback artifact drops only these new objects without CASCADE, refusing changed publication/access scope.

Do not execute until the parent confirms old-task quiescence, reviews exact schema/access scope, and separately coordinates execution. CREATE without IF NOT EXISTS intentionally fails if another task already created the schema. Generated employee-keyed history is private; a later aggregate publication needs its own reviewed contract. This preparation grants the existing app no new individual-level access.

## Source reuse and cohort semantics

The repository's existing career endpoint already names `employee_movements` IDs, employee keys, movement dates/types, and from/to levels. Dashboard contracts document Sep30 snapshots and location/org/level dimensions. The SQL joins those existing source keys and dates. It does **not** query protected performance reviews. Actual source column types/cardinality/grants still require parent verification before remote execution; local tests use text-key fixtures.

Population is exactly the 10,000 distinct **September 30, 2026 snapshot employees**, retaining that snapshot's country, BU and level for top filters. This is a survivor-selected retrospective population, not the complete January workforce. Period is January 1–September 30, 2026; no annualization or October mixing. The December 31, 2025 snapshot supplies opening level membership. A missing opening snapshot aborts globally; an employee missing from that snapshot retains eligibility=null. No dropping missing employees from the original cohort.

The history table is one employee×fixed-period row. Source promotions in this window are reused unchanged. Multiple promotions, ambiguous same-date predecessor events or incompatible baseline/prior levels do not become invented exact durations. Promotions after September 30 are excluded. Lateral moves and transfers are not relabeled promotions.

## What is generated, and what is not

- Eligibility is an explicitly invented **demo policy**, assigned from the opening snapshot and a deterministic employee-key hash independent of subsequent outcomes: first byte of MD5(`career-eligibility-v1:` + employee key) < 205 (205/256 expected share). It is not source eligibility, an employment decision or a prediction. Employees absent at opening are unknown, not false.
- When an unambiguous preceding recorded level-change event supplies entry into the promotion's prior level, its actual stored date is reused, including entries after January 1. The entire spell through promotion must agree with all intervening snapshot and movement evidence. An unchanged-level transfer does not reset that date. It remains source demo history, not verified real-world history.
- Otherwise, a prior-level start date is generated only within available observed snapshot bounds: lower bound is the first observed employment snapshot or day after the last differing-level snapshot, whichever is later; upper bound is the earliest subsequent snapshot in the baseline/prior level before January 1. The byte hash `career-level-entry-v1:` selects a deterministic day offset within that bounded interval. This rule is not a uniform duration model and has no calibrated real-world distribution. Unknown or contradictory bounds stay null. Generated candidates are then checked against every snapshot and movement through promotion. A differing/unknown later level, ambiguous prior reset, or multiple events on the promotion date withholds duration. A known reset never falls back to an earlier generated date. Observed month-end membership is never described as proof of an exact effective date.
- No promotion event, outcome-completeness marker, hire/exit date, October projection, rating or source release timestamp is fabricated. Generation time is the actual preparation time, separately recorded; no backdated first-observed timestamp is invented.

## Denominators, duration, missingness and suppression

Eligible denominator is the subset of the original Sep30 workforce assigned demo eligibility at January 1; later hires/missing opening membership remain unknown. This conditioning omits employees who exited before Sep30 and must never be presented as a complete workforce promotion rate. Reused recorded promotions are candidates for a numerator, not evidence that all other eligible employees did not promote. Outcome coverage remains unverified; no censoring/non-promotion status is imputed from absent events.

Prior-level duration is (recorded promotion date − reused/generated prior-level start date) / 30.4375 months. Median is among demo-eligible employees with exactly one recorded promotion and a known duration. It is conditional on observed promotions, not time-to-promotion for everyone, a survival estimate, a median for censored non-promoters, or a future expectation. A missing duration remains null and is counted by coverage comparison.

Private aggregate candidates use company plus the same eight mutually exclusive BUs as ratings. Country/level signatures are not added. All nine candidate payloads are withheld if any BU has an unknown eligibility, conflicting multiple outcome, incomplete promoted-duration coverage, eligible or ineligible count below 10, promoted or eligible non-promoted complement below 10, or fewer than 10 known durations. This is a conservative preparation gate, not a general privacy guarantee. New metrics must also be reviewed jointly against retained ratings outputs before any public release.

**Published promotion rate and median remain null, status unavailable, active=false in every candidate row**, even when the private gate passes. Generated eligibility/dates cannot prove outcome completeness. A real `promotionRate` field cannot be calculated from incomplete outcomes by calling absent events zeros. If the user wants a fully simulated outcome model instead, that is a further explicit data-design decision; this script does not quietly invent promotion outcomes.

## History through September and October projection

`database/workforce_career_history.audit.proposed.sql` prepares aggregate-only inventory queries for snapshot dates/populations, movement month/type counts within the original Sep30 population, missing levels and source min/max dates. It was not run remotely. It distinguishes all recorded movements from Sep30 survivors, does not fill missing months with zeros and does not treat a latest event date as a completeness watermark.

No verified aggregate result for this original population/history has been supplied to this task yet. Therefore an October projection is **not ready**. The separate synthetic-career annual cohorts and unrelated turnover forecast artifacts are not spliced onto original-workforce history. The parent should coordinate any read-only inventory and projection definition after reviewing this audit. No changes were made to the parallel turnover/hiring feature work.

## Local verification

`tests/workforce-career-sql.test.mjs` runs the exact prepared SQL in local PGlite PostgreSQL with 10,000 generated fixture keys. It verifies default rollback, deterministic reuse/generation, source counts unchanged, nine inactive/null-output candidates, October exclusion, no app-role schema access, reversible teardown, and global withholding when one opening membership is missing. Eleven additional regressions cover post-opening re-entry, later conflicting/unknown snapshots, same-day ambiguity, unknown destinations, unchanged transfers, conflicting movement evidence, and a valid later re-entry after an earlier differing-level observation. These fix both counterexamples found at checkpoint 8afdb5c. No remote SQL is involved; PGlite was installed outside the repository under `/tmp/ratings-sql-test`.
