# Workforce overnight review — local checkpoint, 2026-10-03

## What exists and what remains gated

The current UI supports AI clarification of a planning statement, explicit review/save of inputs, and a deterministic single-role/BU comparison against hiring-only. Home contains the saved comparison and readable Skills, L&D and hiring evidence. Optional inspection pages and Decision Brief refer to the same selected saved calculation. This is not freeform autonomous optimization.

The new agent protocol is an **offline implementation**, not an enabled product feature. It has no SDK client, API route, database read or automatic storage write. A supplied model adapter chooses calculation order, may select one of at most two explicitly reviewed alternative input sets, and chooses whether to stop or evaluate that alternative. The engine evaluates both original options before accepting a finish, permits at most one revision evaluation, limits the run to four model turns/30 seconds, and validates every tool invocation and final conclusion against actual calculator results. It cannot invent numeric inputs or relax the reviewed demand, horizon, constraints or common hiring basis. The model may stop before trying a permitted revision; “no evaluated option meets constraints” does not imply all possible alternatives were tested.

The offline Responses request/response contract is prepared and fixture-tested. A production adapter and UI invocation are intentionally not wired. Existing production model transmission remains unchanged. Actual-model behavior, changed-source production build, and deployment are unverified. The reported fresh PR98 build/catalog success in a separate task does not validate these new commits.

Local commits after `72fe763b0f4d8d3ad7912bcd03b388a3094fa14a`:

- `4d9eb13677a48c434e5e9fc6bf0bcec6ef391977`: recognize the selected workforce comparison in Decision Brief; Home/notes roundtrip preserves the version, historical status, writing and approvals.
- `9126dbc19882c799e50043b6bf2828e97e9a3015`: separate OpenAI SDK environment-proxy compatibility patch. Uses the documented matching Undici fetch/dispatcher mechanism, scoped to three server clients. Inert when no proxy is configured; existing proxy exclusions and lowercase precedence are honored. No direct retry after proxy denial. A 401 remains a 401.
- `92a391f5cb3657c423cd29b9ab70e4b9133bd45a`: bounded offline workforce agent runner, model contract and 17 focused regressions. Result retention is explicit, goal/solution/version-bound and stored separately from the existing single-role result schema. No production caller is wired.

## Proposed model envelope — approval required before connecting it

Recipient: the existing OpenAI Responses API at `https://api.openai.com/v1/responses`, using the repository's existing `CHAT_MODEL`. The proposed request uses `store: false`, one required function call, no parallel calls and a 1,200-output-token cap. These are prepared local parameters, not an executed request.

Already familiar planning content would be sent as the selected `goal` plus `options[]`, each with an internal option `id` and an explicitly reviewed `input` containing only:

`businessUnit`, `jobProfile`, `intent`, `roles`, `build`, `move`, `buy`, `backfills`, `planningMonth`, `months`, `recruitingStart`, `arrivalMode`, `arrivalDate`, `buildMonth`, `moveMonth`, `backfillDate`, `annualHireCost`, `hireFee`, `annualBackfillCost`, `backfillFee`, `internalAnnualCostChange`, `trainingCash`, `trainingHours`, `loadedHourlyCost`, `budget`, `maxAddedEmployees`, `deadlineMonth`.

**Additional calculated-result fields requiring approval** are `evaluations[].optionId`, `status`, `cash`, `employeeTimeValue`, `addedEmployees`, `arrivalDate`, and `checks[].name`/`status`. They are deterministic option outcomes derived from the reviewed inputs and, only when selected, the existing historical timing assumption. Option arrays/revisions and tool schemas also extend the current clarification-only protocol. No broader envelope is authorized by the fact that these fields are implemented locally.

Excluded: employee records/identifiers, individual rankings, raw requisitions, internal candidate/readiness aggregates, skill bundles, source catalogs beyond the reviewed role/BU codes, owner/approval notes, unrelated conversations, goal/solution storage identifiers, credentials, proxy configuration, reasoning content and freeform model benefit claims. The local binding and full calculator snapshots are retained locally and are not in the proposed model request.

Before wiring a production adapter: approve the precise envelope above; add an explicit review UI for allowed alternatives/revision permission; invoke only from the selected saved solution; preserve cancellation/version checks; show a reviewable outcome and require a separate deliberate save. Retain agent history in a separate goal-owned field rather than inserting a different payload into the existing single-role calculation list. It must not imply a plan has been implemented or organizationally approved.

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
