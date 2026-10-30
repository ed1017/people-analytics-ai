# Talent Inventory and vacancy scenarios

This change is prepared for review, not published. Production aliases and settings remain unchanged.

## Inventory scope and provenance

Talent Inventory defaults to a company-scale **modeled position register**: 9,234 positions, 9,037 filled and 197 vacant. Every generated row reconciles to one of the 2,889 business-unit × job-profile × level cohorts in the existing approved public aggregate projection. All 197 vacancies are recruiting; the source reports zero frozen or on-hold vacancies. This is a complete model of those reviewed position counts, not a recovered HRIS register or a claim that each employee equals one position.

The reviewed snapshot came from `https://www.ed-ai.app/api/position-structure`, as of 2026-09-30, dataset `workforce-demo-9037-public-aggregates-v4:5`. Its response SHA-256 is `4f8d55dad402e59b4b33844cff6b4fa25334c698d1557cecbc5b9bec946ec381`; bundle digest is `2ffb177d4343276608d06ae320b8c0c5891ebd39f64c3b4a59e14b0eb416f94b`. `lib/data/position-inventory-constraints-v1.json` stores only the reviewed aggregate constraints and provenance. No privacy allowlist, raw employee projection, database schema, or access controls were changed.

`company-position-model-v1` generates deterministic MODEL IDs from organization, role, level and ordinal. These are synthetic identifiers, not source IDs. Actual location and position FTE are unknown. Business unit is the available team grouping; budgeted status is explicitly assumed. Scenario FTE per unknown slot and source capacity are editable assumptions. A genuine position register remains an evidence gap.

A separate `position-register-demo-v1` worked example has 76 illustrative positions: 60 filled, 12 active vacancies and four frozen vacancies. Its roles, teams, locations, FTE and budget flags are modeled demonstration values. The explicit example action selects the 12 active vacancies and allocates hire 3, repurpose 6, train 3. Browsing another inventory never rebases an existing scenario.

## Planning semantics

Search, filters, chart counts, rows and selection share one inventory scope. Existing filled positions provide context; only selected vacancies can be allocated. Frozen vacancies require explicit thaw. More than 500 selected positions is blocked to bound saved plans; the full 197-vacancy company scope fits.

Allocation records intended pathways, not actual filling. Redesigning a vacant position changes its proposed role without creating staffed capacity. Redeploying capacity explicitly releases FTE from a donor team. Training readiness is conditional on the editable readiness date and effort assumptions. The baseline register never changes. Headcount, positions and modeled FTE remain separate.

Cash estimates are incremental USD over the chosen horizon, with editable fees, payroll, redesign, training and temporary backfill assumptions. Employee training time value is shown separately. Unknown costs remain unknown, not zero. Training effort cannot exceed the time available before readiness. Internal transfers do not manufacture net company capacity; donor-team loss and optional backfill are visible.

## Persistence and compatibility

Drafts and immutable named-by-number scenario revisions are scoped to dataset and goal, including General exploration. Captures retain inventory version/checksum, selected IDs, budget basis, assumptions and calculated results. Reopening restores that revision; corrupt or obsolete records block save instead of silently rebasing. Duplicate saves do not create history noise. The existing atomic decision store handles quota, stale-goal and cross-tab failures.

The new optional fields participate in existing backup/restore. Old plans and backups remain valid. Company captures retain a compact versioned inventory reference rather than thousands of manufactured rows.

## Validation

- Independent review completed; training-effort conservation and comparison/scope issues found during review were corrected and rechecked.
- Focused inventory, model, storage, dashboard and backup run: 41 passed.
- Required hosted workflow tests: 341 passed, one skipped, zero failed.
- Root aggregate suite: 3,093 passed; prebuild and root TypeScript check passed.
- Scoped hosted feature TypeScript graph passed, including storage, backup, UI and navigation. Whole hosted-source TypeScript still has five pre-existing missing `experiments/swp-headcount` module errors; the feature graph has none.
- ESLint passed for changed TypeScript/TSX files.
- Local browser verification used the actual new components and DecisionStore in an isolated harness: 30 checks at 1440px and 390px, no browser errors or page overflow. Coverage includes company inventory and selection, 12=3+6+3, budget/backfill/unknown costs, invalid training timing, actual-status preservation, immutable revisions, comparison, reopen/reload, real goal switching, source-scope retention, old-plan preservation, text-free General exploration and explicit thaw.

Authenticated production-like staging remains a separate deployment prerequisite following the earlier runtime-configuration incident. These checks do not prove production runtime settings are configured. This feature must not be described as live.
