# Independent holdout-boundary review

Reviewed `a9a8866190fb58f0162b9ec16278cb79aca7d4d0` against the independently reviewed ridge base `735c6f888430519cb86b1b4751bdc06e7333ae64`, on local branch `review/hiring-holdout-independent`. PR100 and its branch remain separate and unchanged at `99b653d2e9de3142f24387437cc6a7307d0abae7`. No push, PR mutation, merge or deployment was performed.

## Finding and fix

**P2 — reentrant settings-lock issuance could create two usable locks for one selection.** `Object.getOwnPropertyDescriptors` invokes Proxy traps. While validating caller-supplied settings or provenance, a trap could recursively call `lockHiringRidgeSettings` with the same issued selection. The original function removed that selection only after validation, allowing both invocations to issue distinct locks. A local reproduction against the author candidate invoked two outcome loaders from one selection. This violates the documented in-process one-lock guarantee; it does not create a product, authentication or database exposure.

The fix reserves the selection identity before inspecting caller-owned settings/provenance. Reentrant issuance rejects. A `finally` releases the reservation when validation throws; successful issuance still permanently removes the selection. This preserves correction of invalid declarations before any holdout access. Six independent tests cover settings and provenance reentrancy, reservation cleanup, loader/accessor/malformed-result failures consuming locks, serialized/cloned identity rejection and caller mutation between selection and locking.

## Reviewed boundaries

- Development partitions by opening metadata before reading outcomes. Existing instrumented tests use throwing getters on every reserved outcome across evaluation, all nine fits, selection and locking. Metadata-only reserved rows produce identical development selection. Development metrics and fold memberships match the legacy evaluator's three development folds.
- Fixed penalties and mean development-fold MAE determine selection; exact ties reject. Holdout eligibility, metrics and outcomes do not enter development selection. Reserved opening metadata remains visible and binds the cohort.
- Actual issued object identity is required for selections and locks. Nested settings/provenance and saved observations are immutable snapshots; serialization does not establish identity or resumability. Final entry consumes the lock before invoking a valid loader, including failures or reentrant final calls.
- Final outcomes are read once into a snapshot. Exact reserved-cohort alignment and all legacy final eligibility and acceptance gates remain enforced, including later unscored opening label-history checks. A failed synthetic acceptance remains a retain-baselines result.
- Legacy evaluator, acceptance gate, fixture preflight, product app/components, dependencies and held eNPS files are unchanged against the review base. Reviewed new source has no service calls, credential/environment access or browser storage. No company data was accessed or fitted.

These are ordinary in-process JavaScript controls, not a sandbox for hostile caller code. Another selection or process can create another experiment; provenance hashes are declarations. Durable custody, verified source/code identity, globally untouched holdout history and real-company predictive performance remain unestablished. Readiness, provenance verification and deployment flags remain false. No additional release-blocking defect was found within this scope after the fix.

## Validation and acceptance script

All **529 unit tests** (523 author tests plus six review tests), full lint, standalone TypeScript, genuine optimized production build and whitespace checks pass. Logs: `/tmp/holdout-independent-{unit,lint,ts,build}.log`; focused test log: `/tmp/holdout-independent-targeted.log`.

To repeat the review, run `node --test tests/hiring-holdout-boundary.test.mjs tests/hiring-holdout-review.test.mjs`, then the full `node --test tests/*.test.mjs`, `npm run lint`, `NEXT_TELEMETRY_DISABLED=1 npm run build`, `npx tsc --noEmit` and `git diff --check`. Confirm the reentrant issuance cases reject the nested lock; a valid outer lock permits one loader invocation; subsequent reuse rejects without another invocation. Confirm all six readiness/provenance flags remain false in final synthetic results.

This is source and local synthetic Node validation. No browser behavior changed, and no browser, hosted, physical Windows/Android or company-model validation is claimed. Build-time public font retrieval was allowed; no live API, authentication, model or database call and no denied GitHub status API retry was made.
