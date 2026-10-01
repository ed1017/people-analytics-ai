# Data, Governance, and Security Handoff

## Synthetic-data baseline

The public portfolio is built on synthetic workforce data. The established demo baseline used:
- 10,000 active global employees;
- 5,000 active U.S. employees;
- 12,880 total employee/history records;
- 33 monthly snapshots, Jan 2024 through Sep 2026;
- one active managerless record representing the CEO.

Do not silently change these reference totals or describe a different denominator without tracing the source and updating dependent tests/copy.

## Core governance principle

Keep these concepts separate:

1. **Selected business context** — what the user currently has selected in the UI, such as country, BU, or level.
2. **Evidence population/scope** — the population the underlying governed view/tool actually represents.

A selected business context must never relabel broader evidence.

This became a formal correctness requirement after PR #62 fixed the reproduced case where a Data & AI selection of 1,200 employees could cause enterprise-only Talent evidence based on the 10,000-person workforce to be described as if it were Data & AI-specific.

## Talent evidence scope

Current enterprise-only rules:
- Skills Intelligence evidence is enterprise-only for the governed gap metrics currently used by the AI/handoff.
- Learning & Development pathway evidence is enterprise-only.
- Career Interests enterprise distributions remain enterprise evidence. Current-organization preference-coverage rows can support their own legitimate BU breakdown where the data actually does.
- Succession Planning is enterprise-only.

When the user requests an unsupported BU/country/level breakdown:
- say the requested cut is unavailable;
- do not fabricate/filter it;
- optionally provide the supported enterprise evidence, explicitly labeled as enterprise and with its source date/denominator.

## Skills → Planning handoff governance

The handoff is explicit, user-controlled context.

Allowed packet content:
- one selected apparent skill gap;
- source page/date;
- evidence scope;
- enterprise denominator;
- skill demand/attainment/gap metrics;
- selected business context stored separately;
- user-stated goal;
- optional user-stated assumptions.

Explicit non-actions:
- no automatic scenario run;
- no automatic Build/Move/Buy allocation;
- no approval;
- no source-data write;
- no employee ranking/recommendation;
- no inference that enterprise Skills evidence is BU/country/level-specific.

Freshness must remain visible as Current / Stale / Unavailable when revalidated.

## Succession public contract

Succession is the tightest public-data boundary in the product.

The public contract is fixed to exactly 13 fields:

1. `as_of_date`
2. `small_cell_threshold`
3. `critical_job_profiles`
4. `filled_critical_positions`
5. `positions_with_recorded_plan`
6. `positions_without_recorded_plan`
7. `recorded_plan_coverage_pct`
8. `plan_coverage_suppressed`
9. `positions_with_ready_now`
10. `positions_without_ready_now`
11. `ready_now_plan_pct`
12. `ready_now_suppressed`
13. `suppression_reason`

Do not expand this contract casually.

Prohibited public Succession content includes:
- employee identity;
- candidate identity;
- position identity;
- plan identity;
- source fingerprint;
- free text;
- profile-level arbitrary breakdowns;
- risk distributions;
- rankings;
- arbitrary filters/dimensions;
- raw succession rows.

## Succession suppression rules

Small-cell threshold: k=10.

Required behavior:
- paired suppression hides both sides of a partition when either side is 1–9;
- readiness detail is suppressed when upstream plan coverage is suppressed;
- suppressed values are never reconstructed, estimated, differenced, or inferred;
- the route fails closed when the governed aggregate is unavailable, invalid, drifting, empty, or multi-row;
- there is no public fixture fallback and no raw-source fallback.

Interpretation is descriptive only:
- recorded plan coverage = source-record coverage;
- ready-now = a recorded source assessment category;
- neither is a prediction, promotion recommendation, transfer recommendation, suitability score, or person ranking.

## Succession access boundary

PR #56's merged validation notes are the current release evidence.

Intended boundary:
- server-side route reads only the governed enterprise summary view;
- fixed response allowlist;
- GET only;
- no query filters/body for arbitrary slicing;
- `service_role` receives only the narrow view access required for the summary;
- no new raw succession SELECT access;
- direct anonymous/authenticated/public view reads remain denied;
- no BYPASSRLS design.

The older `docs/succession-summary-rollout.md` contains a pre-merge warning about a pending role-membership exception. PR #56 later reports that the narrow PostgreSQL membership exception and live governed aggregate were validated before merge. Treat the old warning as historical until the file itself is reconciled.

## Aggregate/no-identity rule for internal Talent

Internal readiness, development pathways, mobility supply, and related planning evidence are aggregate decision-support signals.

Do not turn these into:
- named-candidate lists;
- employee rankings;
- 'best person' recommendations;
- automated promotion/transfer decisions;
- performance/fitness judgments.

The original whole-role readiness design intentionally excluded current incumbents from internal mobility supply and exposed only aggregate ready/near-ready/longer-term counts.

## Deterministic planning rule

Governed engines own planning math.

Examples:
- workforce scenarios;
- BU scenarios;
- position actions;
- structural role changes;
- recruiting-demand linkage;
- skill-demand linkage;
- response coverage;
- portfolio reconciliation;
- BU allocation;
- monthly execution;
- hard constraints;
- auto-scheduling.

The LLM may invoke and explain these engines, but must not recreate their numeric output from prose.

## Borrow and Automate

Historical/current guardrails established during response-planning work:
- Borrow was unavailable when contingent-worker data was empty.
- Automate was unmodeled until governed role/task automation-potential evidence exists.

Do not fabricate support for either response merely because the UI/product concept names them.

## Source-system mutation

The public product has generally modeled downstream implications without mutating source systems.

Examples:
- recruiting-demand modeling can describe ATS actions such as hold/cancel/create/reactivate/close-as-filled;
- it does not automatically change requisitions;
- Planning handoff does not write Skills/source data;
- scenario engines are decision-support models, not transaction execution.

Preserve this read-only modeling posture unless an explicit future feature is designed and approved.

## Security/change-control constraints

Do not make any of the following changes incidentally as part of UI or feature work:
- RLS changes;
- new broad grants;
- credential changes;
- auth changes;
- BYPASSRLS;
- public API expansion;
- schema exposure changes;
- billing changes;
- domain changes.

Those require explicit scope/approval and separate verification.

## Database provenance and versioning

Some key SQL is versioned under `database/`, but the folder is not a complete database migration history.

Before database changes:
- inspect live Supabase state;
- identify view owner/security semantics;
- identify current grants and underlying dependencies;
- preserve least privilege;
- version the intended SQL change in Git;
- verify security-advisor implications;
- test API/UI behavior after the database change.

Never infer that an app page being a demo automatically proves every source table is synthetic. Provenance should be verified when it matters to public exposure.

## Operational desktop safety

During PR #65 release-readiness testing, the user explicitly stopped interactive desktop testing because automated browser/process behavior repeatedly foregrounded or maximized windows while they were working.

Standing rule while the user is active on the PC:
- do not foreground/maximize/resize application windows;
- do not click/type/send keys;
- do not close ordinary user windows/processes;
- do not run a focus/keyboard test loop;
- background/read-only Git, deployment, API, log, and process inspection is acceptable.

Interactive GUI validation should only resume when coordinated.