# Home cumulative release handoff

## Release state

The owner cleared the publishing hold on 2026-10-05. Exact-head hosted acceptance and release checks are still prerequisites to production. Source fetch on this pass confirms `origin/main` at `4e95ac6a86a788a01d2f00a968463b58772061bb` (PR121). This is the last confirmed production source; fetching a branch does not independently verify the running production deployment.

The release branch is `fix/home-release-handoff`, descended from `297ffe3be0b3c887c449d5ecaeaabf8fbd770b64`. It includes the whole linear stack below plus copy corrections distinguishing planning assumptions from reviewed facts and clarifying the separate local staffing search. Retrieve its exact tested head with `git rev-parse fix/home-release-handoff`.

## Preserved ancestry and validation checkpoints

Each row directly descends from the previous checkpoint, except PR122 includes the intermediate commit `70b35e8fd964a192b9d27282846d7d4b92e32776` after production. Source branches are preserved.

| Checkpoint | Included behavior | Recorded unit / browser assertions |
| --- | --- | --- |
| PR122 · `5eca90c2ce8eb6657549d18ea1ec59e00f09b014` | Exact goal pinning, contextual capacity comparison, compact goal-first review, selected-plan tabs and stacked bullets, visible Unknown/Illustrative assumptions. Preserves existing Home 14px/21px body and explicit scope → Save → Calculate. | 903 / 509 |
| PR123 · `bd7e327a0fab1697a91b58fdaa973f289f8ec55a` | Bounded chat assumption edits with explicit diff acceptance, provenance and goal/plan/revision guards. Save and Calculate remain explicit. | 911 / 581 |
| `bd37c5d1e5be235c2743990b6d997e09035208e2` | Atomic reviewed attachment and compatible destination updates; receipt-bound ownership, manual-edit preservation, immutable old attachments, quota rollback. | 923 / 626 |
| `ef7e7816976949db9ad602bdd522125c4a946e5f` | Bounded everyday dates/durations/count phrases; ambiguity, negation and multi-plan rejection; scope-switch stale-review protection. | 928 / 141 focused |
| `0853b804b3990d3fc39ce79e7cb7173c1e6e9c3a` | Explicit delivery-mix review and goal-bound local added-capacity search; actual executed counts and constraint results. | 932 / 256 |
| `297ffe3be0b3c887c449d5ecaeaabf8fbd770b64` | Explicit selected capacity-alternative adoption, worker re-verification, full-bundle reconciliation, mapping/overlap/date guards and renewed cost review. | 936 / 325 |

All checkpoints recorded passing lint, TypeScript and production build. Browser totals above are checkpoint-specific, not additive. Local API responses are intercepted synthetic fixtures; they establish interaction and boundary behavior, not live model quality.

## Final cumulative local regression

The handoff working tree passed 936 unit tests and 436 browser assertions across nine suites: capacity adoption 36, retention recruiter acceptance 81, supported capacity flow 72, linked attachment 45, plan integration 27, local search 64, action-plan pilot 30, bundle labels 24 and compact layout 57. Desktop/mobile/200% reflow, unsupported scopes, missing inputs, stale transitions, explicit actions and reload are covered. Lint, TypeScript, production build and diff checks passed. Logs are `/tmp/handoff-unit.log`, `/tmp/handoff-{lint,tsc,build}.log` and `/tmp/handoff-<browser-suite>.log` in the saved cloud environment. Six source branches were verified unchanged; separate forecast branches are not ancestors, and held files have no diff.

## Hosted acceptance and release sequence

Use one cumulative PR to current main instead of merging each intermediate branch. Preserve PR122/123 and their branches until their supersession is reconciled; no history rewriting is needed. The fetched main is an ancestor of this stack. If main advances before merge, integrate it in an isolated branch and rerun affected validation.

1. Publish the cumulative tested head and create a draft PR against main.
2. Match the exact hosted deployment SHA to that head, require Ready, and run hosted desktop/mobile/200% reflow acceptance. Exercise supported discovery → exact Pin → scope review → missing assumptions → explicit Save/Calculate → option focus, plus retention-only/replacement-only rejection, stale changes and reload. Exercise reviewed chat editing, attachment/manual-conflict preservation, and capacity adoption against the new worker asset.
3. Parent QA must review real model wording for unsupported promises and complete, relevant planning prose. The earlier PR122 preview at https://people-analytics-h2a54zi44-ed-56dc.vercel.app/ covered that old head and one real Reduce turnover response; it does not accept this cumulative head.
4. Verify required release gates through authorized mechanisms, then merge once with the exact expected head SHA. Do not retry or reroute previously denied GitHub status API routes. Unavailable required evidence blocks merge.
5. Verify production deployment readiness and its merge SHA, then smoke-test the released flow. A preview URL is not production verification.

## Claims and limitations

- Chat editing is a deterministic, bounded assumption parser with review. It does not promise arbitrary plan rewriting. Unrecognized or ambiguous requests require clarification or the working form.
- Local search reports actual executed combinations, invalid candidates and calculator calls separately. Planned preflight counts are labelled planned. Selected alternatives are not a validated global ranking of complete interventions.
- Counts adopted into a bundle are planning assumptions. Distinct participants differ from added company employees. Unknown values stay distinct from zero; illustrative values retain provenance. Changed cost coverage stays unknown pending renewed review.
- Retention-only and replacement-only goals are not added-capacity models. No retention effect, predictive performance, optimum, or guaranteed benefit is established. Real model semantic quality and intervention diversity remain acceptance concerns.
- Newly active staffing paths need compatible existing mappings. Manual destination edits default to Preserve; old attachments remain immutable. Save, Calculate, attachment and linked replacement are explicit actions.
- The separate aggregate-exit forecasting and synthetic-count prototypes are excluded. eNPS remains disabled; held SQL/contract files are untouched. No DB, auth, security, billing, domain, permissions or model-input boundary changes are part of this release.

No additional owner approval is needed for the authorized normal release sequence. Exact-head QA and release evidence remain necessary.
