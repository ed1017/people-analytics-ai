# Workforce overnight review — local checkpoint, 2026-10-03

## What exists and what remains gated

The current UI supports AI clarification of a planning statement, explicit review/save of inputs, and a deterministic single-role/BU comparison against hiring-only. Home contains the saved comparison and readable Skills, L&D and hiring evidence. Optional inspection pages and Decision Brief refer to the same selected saved calculation. This is not freeform autonomous optimization.

The new agent protocol is an **offline implementation**, not an enabled product feature. It has no SDK client, API route, database read or automatic storage write. A supplied model adapter chooses calculation order, may select one of at most two explicitly reviewed alternative input sets, and chooses whether to stop or evaluate that alternative. The engine evaluates both original options before accepting a finish, permits at most one revision evaluation, limits the run to four model turns/30 seconds, and validates every tool invocation and final conclusion against actual calculator results. It cannot invent numeric inputs or relax the reviewed demand, horizon, constraints or common hiring basis. The model may stop before trying a permitted revision; “no evaluated option meets constraints” does not imply all possible alternatives were tested.

The Responses request/response contract and SDK test adapter are implemented and fixture-tested. A product API route and agent UI invocation are not wired. Existing production model transmission remains unchanged. Actual-model behavior, changed-source production build, and deployment are unverified. The reported fresh PR98 build/catalog success in a separate task does not validate these new commits.

Local commits after `72fe763b0f4d8d3ad7912bcd03b388a3094fa14a`:

- `4d9eb13677a48c434e5e9fc6bf0bcec6ef391977`: recognize the selected workforce comparison in Decision Brief; Home/notes roundtrip preserves the version, historical status, writing and approvals.
- `9126dbc19882c799e50043b6bf2828e97e9a3015`: separate OpenAI SDK environment-proxy compatibility patch. Uses the documented matching Undici fetch/dispatcher mechanism, scoped to three server clients. Inert when no proxy is configured; existing proxy exclusions and lowercase precedence are honored. No direct retry after proxy denial. A 401 remains a 401.
- `92a391f5cb3657c423cd29b9ab70e4b9133bd45a`: bounded offline workforce agent runner, model contract and 17 focused regressions. Result retention is explicit, goal/solution/version-bound and stored separately from the existing single-role result schema. No production caller is wired.

## Approved synthetic test envelope — product activation remains gated

Recipient: the existing OpenAI Responses API at `https://api.openai.com/v1/responses`, using the repository's existing `CHAT_MODEL`. The proposed request uses `store: false`, one required function call, no parallel calls and a 1,200-output-token cap. These are prepared local parameters, not an executed request.

Already familiar planning content would be sent as the selected `goal` plus `options[]`, each with an internal option `id` and an explicitly reviewed `input` containing only:

`businessUnit`, `jobProfile`, `intent`, `roles`, `build`, `move`, `buy`, `backfills`, `planningMonth`, `months`, `recruitingStart`, `arrivalMode`, `arrivalDate`, `buildMonth`, `moveMonth`, `backfillDate`, `annualHireCost`, `hireFee`, `annualBackfillCost`, `backfillFee`, `internalAnnualCostChange`, `trainingCash`, `trainingHours`, `loadedHourlyCost`, `budget`, `maxAddedEmployees`, `deadlineMonth`.

**Calculated-result fields now approved for bounded synthetic testing** are `evaluations[].optionId`, `status`, `cash`, `employeeTimeValue`, `addedEmployees`, `arrivalDate`, and `checks[].name`/`status`. They are deterministic option outcomes derived from the reviewed inputs and, only when selected, the existing historical timing assumption. Option arrays/revisions and tool schemas also extend the current clarification-only protocol. No broader envelope is authorized by the fact that these fields are implemented locally.

Excluded: employee records/identifiers, individual rankings, raw requisitions, internal candidate/readiness aggregates, skill bundles, source catalogs beyond the reviewed role/BU codes, owner/approval notes, unrelated conversations, goal/solution storage identifiers, credentials, proxy configuration, reasoning content and freeform model benefit claims. The local binding and full calculator snapshots are retained locally and are not in the proposed model request.

Synthetic test use of the precise envelope above is now approved. Before activating a product agent run, retain the explicit alternative-review UI, add separate per-run revision permission, validate authenticated model behavior, and invoke only from the selected saved solution; preserve cancellation/version checks; show a reviewable outcome and require a separate deliberate save. Retain agent history in a separate goal-owned field rather than inserting a different payload into the existing single-role calculation list. It must not imply a plan has been implemented or organizationally approved.

## Joint validation checklist

### Environment and authentication

- Confirm the exact source commit and a fresh environment publication. This writer's original configuration does not refresh automatically.
- Verify only configuration names/presence for `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY`; never display or transfer values/placeholders.
- Run the previously authorized bounded synthetic catalog read through the app adapter, and one minimal non-sensitive OpenAI request through the app SDK transport. Stop at missing configuration, 401 or policy denial. Connector access is not app runtime authentication.
- Validate the proxy patch in the deployed Node runtime. The pinned existing Undici 7.30.0 package requires Node >=20.18.1; this cloud task is Node 24.19.0. Check the target runtime before release. The patch changes transport compatibility, not credentials or a server's authentication decision.
- Do not change proxy exclusions, TLS verification, domains or access to force a pass. No credential or policy changes are included in these commits.

### Actual-model cases, after the relevant envelope is approved

- Existing clarification: complete and incomplete statements, omitted costs, replacement-demand conflict, irrelevant employee/approval requests, exact evidence quotes, cancellation and changed-goal late responses. Proposals must not silently save or run a calculation.
- New agent: original options pass/fail; one user-reviewed alternative changes a failing comparison to passing; optional revision not selected; all evaluated options fail; costs/timing unknown; extra tools/arguments; duplicate evaluations; premature finish; failed or uncalculated preferred option; changed solution mid-run; cancellation and timeout. Compare every accepted response to stored calculator results.
- Confirm selected strategy is actually model-directed. Do not claim an automatic revision is guaranteed, or that arbitrary numeric search/optimization is implemented.
- Verify no unapproved fields are transmitted and no model rationale is substituted for evidence. An HTTP success alone does not establish semantic correctness.

### Integrated headcount, cash and timing semantics

- Additional positions are demand; only external Buy and explicit external backfills add company employees. Build/Move do not create employees. Replacement-only demand remains unsupported.
- Counts sum to the selected role requirement. Backfills are explicitly supplied, including zero, and cannot be silently omitted from the employee cap/cash plan.
- USD annual rates use monthly division and arrival-month calendar-day proration. Employee time value is separate from cash; the cash-budget check excludes it. Structural annual budget is a separate reference and is never added to incremental cash.
- Blank costs/dates remain unknown. Historical opening-to-start timing requires adequate paired samples and an explicit choice of assumption; accepted-offer time, requisition closure and actual start are distinct.
- Hiring-only uses the same common cost and hiring-timing basis. Every proposed alternative is explicitly reviewed; it cannot solve infeasibility by quietly increasing a constraint or changing demand/horizon.
- Internal readiness, active courses and completed hiring history do not establish availability, course success, employee release, simultaneous hiring capacity, benefits or arrival guarantees.

### Home, sidebar, notes and persistence

- Complete clarification → review → save → calculate on Home without needing another module. Verify current scope, constraint status, unknowns and conditional limitations.
- Inspect Skills/L&D/TA and return: the selected calculation and its evidence remain identical. Focused editing uses current inputs even while an older result is selected, with that distinction visible.
- Saving edits makes dependent results historical; explicit calculation creates a new snapshot. Unsaved edits and historical results block version-specific approval in the workspace.
- Decision Brief recognizes workforce-only results and does not show the empty-calculation message. Editable notes/general approvals remain distinct from version-specific workforce review notes.
- Reload, switch goals, inspect an old calculation, and return. Preserve owner, notes, earlier approvals and other goals. No late/cancelled response may replace the selected solution.
- Future agent retention must use the tested separate field, explicit save and current-version check. Existing single-role results/brief notes must not be overwritten by the agent payload.

### Release gates

- Re-run unit/type checks and focused lint on the exact integrated head. Full-repo lint currently has 8 existing errors/11 warnings; distinguish these from introduced diagnostics.
- Run a genuine production build in the fresh permitted environment. Development font fixtures are UI test aids only and do not validate Geist downloads or production readiness. Stop at a network denial.
- Run actual-model and integrated app checks only after authentication and envelope approval. No fixture result counts as an actual-model pass.
- Resolve the publication/authorization gate explicitly before any push, PR, merge or deploy. Preserve independent transport/feature commits for review; transfer code only, never environment credentials.

## Conditional hiring-time prediction feasibility

No training prototype was fit. This checkout contains hand-built timing unit-test fixtures and one aggregate timing fixture, not an authorized historical training/evaluation dataset. No CSV/Parquet/recruiting dataset is present. The old runtime cannot read Supabase, and no broader data read/export was attempted. Fitting those few hand-built examples would fabricate evidence of predictive ability.

Source inspection identifies `ta_requisition_metrics` and the existing selected-role timing contract. In that contract `time_to_fill_days` describes opening to earliest accepted offer, while the TA dashboard's closure-based duration differs. The useful proposed target is **opening-to-actual-start elapsed calendar days**, computed from valid `opened_date` and `start_date` pairs. If only completed external fills are available, any result is conditional on a completed fill and cannot predict whether an open/unsuccessful requisition will ever be filled. Open/cancelled records need explicit censoring treatment before an unconditional hiring-time claim is possible.

A concrete future evaluation plan, using only an authorized existing scope:

1. Inventory actual distinct requisition counts, opening/start date span, external/filled eligibility, duplicate joins, missing/invalid dates, future starts and target availability. Keep identifiers only for local deduplication/grouping; never use employee attributes. Do not export the dataset.
2. Establish which features were genuinely known at the forecast's opening date. End-state `applicants`, `advanced_candidates`, `interviews`, `offers`, `accepted_offers`, `time_to_fill_days`, `closed_date` and `start_date` are outcomes/post-opening information and must not become predictors. A current role assignment is not automatically a historical opening-time feature without provenance.
3. Split chronologically by opening date, keeping each requisition entirely in one split. At every training cutoff, use only labels already observable then (including actual starts by that cutoff). Score a later, matured holdout and report excluded/right-censored cases explicitly. Do not shuffle the synthetic time series or leak future starts through preprocessing.
4. Start with the existing historical-median baseline calculated strictly from each training window. Only if actual coverage supports it, compare a small regularized elapsed-time model using approved, opening-known features. For a single role with only one year of history, seasonality may be unidentifiable; do not fit month effects merely because month is available.
5. Report fold dates, eligible/distinct/train/test counts, feature/missingness coverage, MAE and median absolute error in days, large-error quantiles and the same metrics for the median baseline. Report failures and unstable folds. Avoid percentage error when zero-day durations exist. Select/tune without looking at the final holdout; require repeatable improvement rather than a lucky split.
6. Label all synthetic performance as a demonstration of the evaluation method, never real-world predictive accuracy, confidence, staffing availability or a promised arrival. Do not replace the planner's explicit timing assumptions or release an ML feature without validated evidence and review.

Stopping condition for ML now: no suitable authorized local historical dataset and no verified opening-time feature history. Useful code work remains in the bounded agent integration once the stated envelope and live-auth gates are resolved; synthetic fixture fitting is not a substitute.

## Implementable ML experiment contract (held; no model trained)

This section specifies a future local evaluation, not an authorization to read additional data. The existing source adapter is `lib/role-buy-feasibility.ts`; the timing definition and completed-cohort exclusions are in `lib/recruiting-timing.ts`. Neither the aggregate response nor the hand-built test fixtures supplies independent training examples. No new schema, service, dataset, feature endpoint or model artifact was created.

### Minimum authorized input and availability

One row per distinct requisition in the already-approved role/population, with an extract manifest containing source, synthetic provenance, approved scope, extraction/as-of date and source-definition version. Keep raw requisition keys local for deduplication and split auditing only. Do not send them to a model API or store them in prediction outputs.

| Field | Availability in inspected source code | Experiment role / rule |
| --- | --- | --- |
| `requisition_id` | Selected from `ta_requisition_metrics` | Local grouping only. Conflicting duplicate rows are excluded and counted, not arbitrarily chosen. |
| `opened_date` | Selected | Forecast origin and chronological split key; valid ISO date required. Elapsed target uses UTC calendar days. Opening-known calendar features are possible but optional. |
| `start_date` | Selected | Label only: `start_date - opened_date`, integer days >= 0. Future/missing starts are never zero. The first-observed date of this label is **not** established by the current adapter. |
| `requisition_status`, `external_internal`, `closed_date` | Selected | Population/observation checks only. Present-day filled status and closure cannot be used as opening-time predictors. Current completed-fill view cannot establish cancellation/open-state history at past cutoffs. |
| `time_to_fill_days` | Selected; definition is opening to earliest accepted offer | Label-integrity check only. Start must not precede derived accepted-offer date. Never a predictor of opening-to-start time. |
| `job_profile_code` | Source query filters by governed role | Constant in a single-role experiment. Cross-role pooling is outside current scope; historical opening-time role membership is not established. |
| BU, country, opening-time job/market attributes | Not present in this timing contract | Unavailable predictors; do not infer from current employee/dimension tables or expand scope to obtain them. |
| Applicants, advanced candidates, interviews, offers, accepted offers | Selected as current/end-state aggregates | Excluded from features: no timestamped opening-time snapshots. |
| `first_observed_at` for labels; valid-time history for predictors/status | Not exposed by the inspected adapter | Missing. Needed to prove what was observable at each historical cutoff. Without it, any backtest must be explicitly retrospective under an unverified observation-lag assumption, not a validated deployment simulation. |

The estimand is **elapsed opening-to-actual-start days conditional on a completed external fill in the approved synthetic role cohort**. It is not time-to-fill probability, capacity, time remaining for an already-open search, employee suitability or a promised start date. An unconditional model needs open/cancelled requisitions, status dates and censoring-aware evaluation under separate approval. No arbitrary zero/median imputation of missing targets is allowed.

### Frozen split and baseline procedure

Before looking at target distributions or fitting anything, validate the manifest and distinct IDs, publish missing/invalid/duplicate/future/unresolved counts, then freeze the following split configuration in a local experiment manifest. These thresholds are proposed review gates, not measured dataset properties or statistical guarantees.

1. Require at least 24 complete calendar months of opening-date coverage for this small initial evaluation. Let `T` be the extract as-of date and `C` the first day of the month six complete months before the month containing `T`. Freeze final holdout openings in `[C, C + 3 calendar months)`; this leaves at least three complete months for observation. Later/unresolved starts remain counted as censored/unscored; this lag does **not** guarantee maturity. Do not move the boundary after seeing performance.
2. Use three rolling development cutoffs `C - 9`, `C - 6`, and `C - 3` calendar months. At each cutoff `c`, form the eligible training pool from openings before `c` and labels actually observable by `c`. Use its full history for the candidate and expanding baseline; use the subset within the preceding 12 months of closure dates for the rolling baseline, matching the existing historical-median convention. Validate on openings in `[c, c + 3 months)`, observed by `c + 6 months` (no later than `T`). A requisition belongs to one opening cohort; joining or preprocessing cannot duplicate it into train and validation. Report that later folds may legitimately train on earlier, then-observed validation cohorts.
3. Freeze final training at `C` using the same eligibility, baseline-window and label-availability rules; never train on labels first seen later than `C`. Final scoring uses only holdout labels observed by `T`. Count every holdout opening and its disposition. If label availability timestamps are absent, stop short of a validated forecast claim; record the retrospective assumption explicitly before running even an exploratory score.
4. Require at least 60 eligible training labels and 20 scored validation labels in **each** development fold, and at least 30 scored final holdout labels. Require >= 90% target observation in each scored opening cohort; if unknown status history prevents computing this denominator, this gate fails. The source's five-pair median display threshold is not enough for model evaluation. If the gates fail, retain descriptive timing summaries only; do not broaden the role/population automatically.
5. Baseline A is the exact prior-window paired opening-to-start median from the same eligible training rows, repeated for all validation cases. Baseline B is the expanding-history median from all eligible pre-cutoff rows in the approved scope. Compare on identical scored IDs. Neither baseline may include the test cohort or a median copied from a later aggregate snapshot. Report if the rolling baseline cannot be computed; never silently substitute a full-extract median.
6. Only after feature provenance and counts pass, try a small ridge model for `log1p(elapsed_days)` using opening-known features. With only the current single-role contract, the only nonconstant candidates are opening calendar terms; year trend is omitted, and month sine/cosine are eligible only with >= 24 months of training coverage in every fold. If no eligible nonconstant predictor remains, **do not fit a model**: the historical baselines are the complete feasible result. Fix candidate penalties to `{0.1, 1, 10}`; fit scaling/encoding on training rows only, choose by mean development-fold MAE, then lock all settings. Predictions use `max(0, expm1(prediction))`; no post-hoc clipping using holdout outcomes. A wider feature/model search needs a revised reviewed protocol.

### Scoring, acceptance and reproducible outputs

Report exact scope, cutoffs, as-of date, observation assumptions, training/validation/holdout counts, exclusion counts, feature availability and per-fold MAE, median absolute error, 90th-percentile absolute error and signed mean error, all in calendar days. Report both baselines beside the candidate on identical rows. Do not use MAPE with possible zero-day targets; do not label historical quantiles as prediction confidence intervals.

Proposed acceptance for continuing model review: candidate MAE improves by **at least 10% and 2 days** versus **each** baseline on the untouched holdout and on at least two of three development folds; no development fold MAE worsens by more than 5%, and holdout p90 absolute error worsens by no more than 5%, versus either baseline. All population, provenance, coverage and observation gates must also pass. Otherwise keep the historical baseline, report the failed gate and stop; do not tune on the holdout or manufacture additional examples. Passing these gates on synthetic company history demonstrates that evaluation only, never real-world hiring accuracy or readiness to deploy.

A future authorized run must retain the frozen manifest, source-definition/code hashes, exclusion audit counts, split membership audit kept local, baseline/candidate aggregate metrics, fixed hyperparameters and a limitations report. It must reproduce without network model calls. Raw data/keys stay in the approved execution boundary; no employee features, exports, API transmission or planner integration are authorized here. Exact experiment dates, counts and metrics remain **unavailable**, because no authorized historical row dataset, timestamped label-availability history or opening-time feature history is available in this checkout. No training run occurred.

## Adversarial acceptance matrix — final local checkpoint

| Area | Verified result | Remaining limit |
| --- | --- | --- |
| Tool/argument allowlists, forged option IDs, premature/contradictory finish, duplicate evaluations | Pass: deterministic runner rejects outside the currently offered tools; both original comparisons required | Controlled adapters, not an actual-model pass |
| Execution/cancellation | Pass: <= 4 model turns, one revision, 30-second maximum; error/timeout/abort/stale state cannot save partial results; A→B→A requires the caller's abort signal | Future UI must abort on goal change/unmount; no agent UI caller exists yet |
| Timing and retained agent results | Pass: current saved single-role evidence reference required; timing content bound to the review; retention/reload recomputes option math and validates constraints, reviewed options and limits | Browser storage is unsigned. This validates deterministic consistency, not proof that a model ran or that an organization approved anything |
| Saved state, edits and approvals | Pass: lifecycle graph and goal ownership checked; payload inputs must match their saved version; invalid graph/payload retained without enabling approval; old rounding snapshots not recomputed | No migration or automatic recovery of unreadable records; user-authored records are not an authentication boundary |
| Cash, timing and headcount | Pass: annual/monthly periods, calendar-day proration, explicit backfills, one-time fees, cash/time separation, unknown values, Build/Move cohort rounding invariance | Availability, benefits and batch hiring capacity remain unverified |
| Home/sidebar/notes and reload | Pass: **80 fixture browser checks**, desktop 1366/mobile 390, zero page errors; includes broken history, malformed result, forged role and wrong-goal reloads | All API calls mocked; nonlocal requests blocked; font fixture is not a production build |
| Regression/type/lint | **276/276 unit tests**, TypeScript and focused lint pass; whitespace check clean | Full-repo lint's previously documented 8 errors/11 warnings remains outside this fix |
| ML feasibility | Target/source contract, exact split algorithm, two baselines, leakage controls, metrics and stop thresholds specified above | No authorized training rows, label first-observed history or opening-time feature history; no model trained |

Code fixes: `9cac3ed351bc31929aaceef3e180cbd12f61d0d2` (monthly internal uplift rounding), `7b472a46785d215ebbad59683ed92ccad84663ca` (agent evidence/retention and saved-state/UI guards). The pre-existing five modified files were preserved and completed: their missing integration/tests, not an unrelated worktree change, explained why they had remained uncommitted. A read-only reviewer confirmed the original timing, retention, corruption and rounding defects, then identified the payload-to-version role mismatch; all received focused fixes/regressions.

Evidence: `/tmp/workforce-adversarial-all-tests.log`; `/tmp/workforce-adversarial-qa/results.json` and desktop/mobile screenshots; `/tmp/workforce-adversarial-browser.log`; updated `/tmp/workforce-agent-qa/fixture-review.json` (four turns, original cash 22,500 and hiring-only 51,000 fail a 20,000 budget; reviewed alternative 19,500 passes, separate time value 1,000, reload/retention validated). These are synthetic local fixtures, not live service results.

Prioritized next gates for tomorrow evening:

1. Review/approve the exact model envelope and explicit review/save/cancellation UI behavior before integrating the offline agent. No new model data was transmitted during this work.
2. In a correctly configured fresh task, resolve live authentication and run the minimal already-authorized check without retrying a denial or transferring credentials. Validate the exact integrated source and target Node version, then complete a genuine production build.
3. Run actual-model semantics and end-to-end review of the approved integration, including failing/unknown constraints and delayed responses. Fixture success alone does not satisfy this gate.
4. Review final changes and obtain publication authority before any push, PR, merge or deploy. ML remains a separate data/provenance gate; do not substitute a fixture-trained demonstration.

The scoped local adversarial work is exhausted at this checkpoint. More baseline loops or environment-presence checks would not close the remaining gates. No feature wiring, model-envelope expansion, credentials/access changes, schema/data writes, external calls, push or deployment occurred in this continuation.

## Next core slice completed — local alternative review

`4be8fb55ccf3ff8efcbd31348b6827dba61343e5` implements the independent user-review step before future agent integration. The saved-calculation workspace now offers **Review local alternatives**: enter up to two changes to response counts, internal effective dates, backfill assumptions or training/internal costs; explicitly preview deterministic comparisons on the selected saved timing evidence; then explicitly save a separate goal-owned review history. The fixed role/BU, demand, horizon, constraints and common external-hire cost/timing basis are displayed and cannot be relaxed by an alternative.

No model is invoked. The existing model-envelope approval gate remains unchanged. Local review also does not grant future agent revision permission: that requires a separate explicit run UI after integration is authorized. Both the original mix and hiring-only are recalculated with the current calculator for the local comparison; the original stored result is never rewritten. Historical results and unsaved main-plan edits block new previews/saves. Changing an alternative draft clears its preview. Saved local reviews use `workforceAlternativeReviews`, separate from single-role results, agent reviews, notes and approvals; history is capped at ten reviews/256 KiB and malformed records are retained without accepting new saves. Browser storage can impose the existing stricter combined decision limit.

Validation: 280/280 units, TypeScript, focused lint and whitespace checks pass. 92 fixture browser checks pass at 1366/390, including local-only preview, draft invalidation, two-alternative/four-comparison retention, unchanged original evidence/approvals, historical gating and reload. Zero page errors; exactly the existing one mocked clarification and two mocked source calculations per viewport, with no additional API call for alternatives. Evidence: `/tmp/workforce-alternatives-tests.log`, `/tmp/workforce-alternatives-qa/results.json`, screenshots and `/tmp/workforce-alternatives-browser.log`. A pre-existing preview occupied port 3100; the attempted new listener stopped with EADDRINUSE, and the available preview successfully served the changed source for the fixture checks. No live-service retry or policy change occurred.

Remaining release blockers are separate from this local feature: approve the expanded model envelope and explicit agent-run controls, resolve live authentication in the authorized environment, run actual-model semantics and a genuine production build on the integrated source, then resolve publication authority. No ML prototype, additional data source, secret/access/database/network-policy change, external upload, denied source-transfer retry, push or deployment was performed. eNPS exclusions remain untouched.

## Synthetic transmission approval and SDK adapter checkpoint

The user explicitly approved bounded OpenAI tests with synthetic goals, reviewed options/inputs, tool schemas and calculated option IDs, constraint results, costs, employee-time values, added headcount, arrival dates and checks. Employee records, raw source data, owner/approval notes, unrelated conversations and secrets remain excluded. This supersedes earlier approval-pending wording **for synthetic testing only**. It does not authorize retrying failed authentication without a relevant configuration fix, changing access, or activating arbitrary product transmissions.

Implemented `lib/workforce-agent-openai.ts`: a test/server adapter joining the actual installed SDK, the approved projected request contract, response decoding and existing bounded runner. It uses the existing `CHAT_MODEL`, `store:false`, one required tool, no parallel calls and the existing 1,200-token per-turn cap. Request-level `maxRetries:0` applies even if an injected client has retry defaults. The configured manual client uses the existing environment-proxy helper, exact `https://api.openai.com/v1` endpoint, 30-second timeout and SDK logging off. It is created only on explicit invocation; importing the module makes no request and reads no credential value through a diagnostic path. The runner's four-turn/30-second aggregate bound remains. Raw errors, response bodies, request IDs and headers are not retained in surfaced errors; only a bounded numeric HTTP status or fixed failure text is returned. No product route/client UI imports the adapter.

`tests/manual/workforce-agent-openai.mjs` prepares one fixed synthetic failing-budget scenario and one reviewed alternative. It refuses by default without constructing a configured client. **Do not run its live mode until a relevant configuration fix is confirmed.** When that prerequisite is met, the opt-in command is `node tests/manual/workforce-agent-openai.mjs --live-synthetic-after-confirmed-config-fix` (this cloud checkout uses Node 24 native TypeScript support). The flag is an operator acknowledgment, not proof that authentication was repaired. One failure ends the scenario without retry. An accepted finish may validly omit the optional revision; output reports actual protocol outcome rather than claiming the model found a passing option. It saves no review or raw model output. The live command was not run here.

Validation: all six new tests pass using the real SDK with an in-memory synthetic `fetch`; no socket or OpenAI service is contacted. They cover four-turn original/revision evaluation and request exclusions, three-turn unknown costs, no-retry HTTP 401/403/429/500, sanitized transport/invalid-tool failures, cancellation and default manual-harness refusal. TypeScript and focused lint pass. The full suite with `node --test --test-isolation=none --test-reporter=tap tests/*.test.mjs` reports **282 passing / 4 failing due to sandbox restrictions**, not a complete-suite pass: the four existing loopback proxy tests fail at `listen EPERM: operation not permitted 127.0.0.1`. No permission escalation or alternate network route was attempted. Disabling test subprocess isolation here only restores detailed test reporting in this hosted runtime; it does not grant network access. Evidence: `/tmp/workforce-openai-adapter-focused.log`, `/tmp/workforce-openai-adapter-all-tests.log`.

Remaining blockers: no relevant authentication/configuration fix has been established, so the previously failed live request was not retried; exact-source live semantics remain unverified. Four local socket tests and a genuine production build also remain blocked/unverified in the restricted environment. Product run controls, authenticated end-to-end review and release authorization remain separate gates. All saved code after a2b8c9b was preserved; no credentials/settings, database changes, new data sources, source uploads, eNPS changes, push or deployment occurred.
