# Scenario outcomes and auditable calculation steps

Local refinement of cards checkpoint `5b73b5071b5c4cc73d803b362185ba78518b730c`, on `local-workforce-outcomes-review`. The original checkpoint and the separately published intake-only branch are preserved. No cards/outcomes code has been pushed or deployed.

## Concrete review defects and fixes

1. **Parent approval bypassed failed lineage verification.** Replacing a local result's `sourceHash` with 64 zeroes caused the card worker to reject it, but the synchronous payload reader still returned a structurally readable result and the parent approval action remained enabled. Fixed by gating local-result approval on the worker-verified source/result/history identity. A changed source or alternative history immediately invalidates that identity. Historical snapshots remain retained; unavailable verification never grants approval.
2. **Alternative lineage was recorded but not checked against history.** A valid-shaped nonexistent review ID, wrong slot/hash or invented search fingerprint could survive card loading and new pin creation. Fixed by resolving one exact retained review, replaying its v1/v2 validation, checking the source binding, slot, review fingerprint and search fingerprint, and validating the complete ancestor chain. Display, what-if saves, pin creation and pin opening share this verification. Missing/corrupt history is retained and reported unavailable; no lineage is repaired silently.
3. **Switching editing surfaces silently discarded temporary alternatives.** A browser reproduction entered training cash `7777` in an alternative, opened and cancelled a card what-if, and found the alternative reset to `3000`. Fixed by reporting alternative draft state to the parent and requiring explicit save or cancel before tailoring another option or changing current inputs. The existing source/goal transition guards remain intact.

All three fixes have regression coverage. The v2 search-origin → revised solution → pin path is tested alongside tampered and missing origin records. No ranking arithmetic, hidden weights, caps, saved schemas or historical records were changed.

## Expected outcomes: truthful scope

Closed cards now say **Scenario estimate under user assumptions — not a validated forecast**. They show existing incremental cash, separate employee-time value, added employees including backfills, conditional full-coverage timing, and the target-role coverage/gap at the user's deadline. Unknown inputs remain unknown and explicit zero remains zero. A changed deadline displays date-labelled coverage before/after, alongside the existing cash/time/headcount/timing deltas.

The presentation helper reads the deterministic result's existing rows and totals. It introduces no new forecasting engine or data source. Its forecast metadata is explicitly `unavailable`: no validated forecasting model or out-of-sample performance evidence is attached. It does not produce completion probabilities, confidence intervals, causal training effects, ROI or a guarantee of future capacity. Historical recruiting median/sample/period are labelled a comparison baseline, separate from the scenario and from a validated prediction. Candidate pools remain evidence, not assignable capacity.

## One collapsible calculation breakdown

The existing expandable justification is now **How this was calculated**, not a second panel. Five numbered steps explain the actual method:

1. Reviewed role/BU/demand/horizon and dated evidence; a link opens the existing governed input editor. Scope remains fixed inside the what-if adapter.
2. Build + Move + Buy demand allocation; company growth comes only from Buy plus explicit external backfills.
3. User-entered readiness/arrival timing and the bounded historical-median assumption. Backfills do not count toward additional target-role coverage.
4. Calendar-prorated hire/backfill cash, one-time fees, active-cohort salary uplift, first-month training cash and separate training-time value. Inactive Build training contributes zero. Component totals come from the saved calculator rows, with unknowns preserved.
5. Conditional coverage/gap, budget/employee/deadline checks, explicit-priority ranking basis, unavailable ML forecast status, and review/save semantics.

Edit buttons focus the corresponding existing what-if control and recalculate locally. Opening another step keeps current draft values. Cancel restores focus to the invoking control and retains saved history. Explicit **Save revised solution to this goal** remains separate from edits, ranking, pinning and approval. This is an auditable calculation explanation, not model-private reasoning.

## Acceptance and validation

- 443 full unit tests pass, including scenario projection/unknown/zero/cost reconciliation, alternative lineage corruption and v2 search lineage through pin/reload.
- 479 browser assertions pass: 88 cards/outcomes, 54 isolated-intake behavior, 98 built workspace, 48 readiness, 44 goal-copy, 62 local search, 50 handoff, 11 selection and 24 lifecycle. Tests use synthetic fixtures and mocked API requests, including the actual built Next worker. Expanded mobile layout, focus links/return, draft preservation, stale async completion, quota errors and unsupported-worker behavior are covered.
- Full lint, standalone TypeScript, genuine production build and diff whitespace checks pass. Engine coverage is Linux Chromium 151 with desktop and Pixel 7 emulation; actual Windows Chrome/Android Chrome and hosted acceptance remain separate.
- The isolated intake branch `cloud-intake-month-fix` was pushed and verified at `f770cbdb70ebc9bacd574642c3ed02a7c4cbabdf`. That branch contains none of this refinement. The parent owns its one bounded hosted retest. The same intake hardening is included in this local refinement's ancestry.

User acceptance: open a synthetic saved option, expand **How this was calculated**, inspect the five steps, click **Edit training cash**, change the amount, then click **Edit coverage deadline**. Check the cash delta and date-labelled coverage/gap. Cancel and confirm focus/history preservation. Repeat with explicit save, pin the saved result and return to the older pinned version. Ranking must still require a chosen priority; no forecast probability or implicit approval should appear.

Remaining: parent source review/publication decision, target-device acceptance and separately authorized validation of any future live agent/ML model. No API/model calls, new sources, credentials, database/settings changes or held eNPS work were performed.
