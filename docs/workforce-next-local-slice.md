# Next useful workforce slice after the local-search checkpoint

Assessment at published checkpoint `aae644b2340dd14cd22c813272ec3cb90d191f21`. This is a proposed implementation order within the agreed conversation-first single-role/BU direction, not a new roadmap or implemented product work.

Update: priority 1 was subsequently authorized and implemented locally after `b93e42f`; see `workforce-input-readiness.md`. Review that slice before starting priorities 2/3. The assessment below records the reasoning at the earlier checkpoint.

## What is already done

The later entries in `build-decision-log.md` supersede the older broad architecture roadmap. PR97 established training timing; the subsequent workforce direction explicitly requested Home-led planning with optional sidebar inspection/customization. The current source already provides reviewed inputs, deterministic monthly cash/employee-time/headcount/coverage, hiring-only comparison, explicit hiring timing assumptions, same-result Skills/L&D/TA evidence, shared sidebar edits, version-specific approvals, Decision Brief linkage, two local alternatives, bounded search and saved lineage. Do not rebuild those or treat their previously passed unit/build/browser checks as new progress.

The conversation-first journey remains incomplete: `app/page.tsx` mounts `WorkforceSolutionPanel` alongside the Home experience; `Workspace` owns a separate initially empty `statement` and calls the existing clarification endpoint only on explicit action. General Home action-plan prose (`lib/home-decision-journey.ts`) is not a reviewed workforce input proposal or saved calculation. The current goal is retained in solution scope, but arbitrary conversation text is not deterministically converted into governed roles, counts, costs or dates.

## Prioritized gaps that do not need live services

| Priority | Concrete gap and user value | Small bounded work / acceptance | Dependency |
| --- | --- | --- | --- |
| 1 | Users must inspect a large input form or trigger validation to discover the next missing assumption. Blank optional costs/timing and malformed required inputs are different problems. | Add a local input-readiness summary using existing validator/calculator semantics: required corrections separately from calculable-but-unknown cash/timing/constraints; each item focuses the existing editor section. Example: active Build with no readiness month shows unknown timing, not invented course-based readiness. Do not block calculations merely because optional assumptions are unknown. | Existing draft/saved input only; no data/API/model calls. |
| 2 | A current focused goal and the separate Planning statement require manual context re-entry. | Explicit “use current goal as planning statement” action, copying only exact goal text into the temporary statement, with goal-change and dirty-draft guards. It does not extract inputs, invoke AI, save, calculate or transmit history. This is a small bridge into the existing reviewed workflow, not completed conversational planning. | Existing local goal text; no new disclosure. |
| 3 | Decision Brief summarizes the selected base mix and hiring-only; saved alternative reviews are inspectable inside the workforce panel, but are not summarized beside that base comparison in `components/decision-brief.tsx`. | Add read-only current/historical saved-alternative summaries and links to explicit local verification where required. Preserve source version, edited-origin status, unknowns, cash versus employee time and independent approval notes; do not silently choose or adopt an alternative. | Existing `workforceAlternativeReviews` and verifier; no new storage schema, ranking or calls. |

These are proposed user-value slices grounded in the agreed flow, not permission to implement all three now. The **smallest meaningful next coding slice is priority 1**, restricted initially to the workforce input editor. It helps the user complete a reviewable solution even when AI is unavailable, without adding another planner, source or service.

For that slice: expose an ordered deterministic list of actionable missing/invalid fields and consequential unknowns; reuse the current editor/focus mechanism; keep draft versus saved status explicit; retain all entered values. Test representative branches (internal path inactive/active, explicit versus historical hiring, unknown cost, non-summing counts, changed goal), one keyboard/mobile focus flow, and no storage/model calls from the summary. Avoid duplicating numeric rules in a second validator. Full release checks are warranted only when that product change is implemented, not for this assessment.

## Training timing: useful distinction, not a free integration

`lib/training-timing.ts` already models quote-based training duration, lag, ramp, completion and capability-unit assumptions over 36 months. The workforce increment deliberately uses one entered Build readiness month and first-month training cash/time. These are different contracts. Catalog course duration is not readiness; capability units/successful completers are not assignable role capacity.

An explicit read-only link to the existing training timing inspection can be evaluated later, but automatically carrying its completion/full-impact month into Build readiness or replacing the workforce cost schedule would require a reviewed mapping and versioned arithmetic/storage semantics. That is not an independent quick fix and is not implemented here. Real suitability, completion, employee release and batch capacity need evidence beyond current aggregates.

## Separate gates and lower-value work

- **Actual-device/hosting validation:** Windows Chrome and physical Android Chrome still require an executable approved test path. See `workforce-device-acceptance.md`; test packaging is now reproducible, but a blocked file provider cannot be solved by changing device security. Blob-based standalone testing does not establish hosted Next worker/CSP support.
- **Live AI:** the existing clarification route and isolated workforce SDK adapter have different envelopes and activation states. A real model-directed run still needs separately verified semantics, explicit run/revision permission, current-source cancellation, review and deliberate save. Do not widen Home context with stored evidence/results or invoke/retry services to close local UI gaps.
- **Data-dependent:** valid actual hiring/training costs, readiness/release/capacity and benefits remain user assumptions or unavailable. Existing paired hiring history is conditional evidence, not a promise. Missing values must remain unknown.
- **ML:** synthetic temporal-baseline evaluation is already implemented. Authorized historical rows, label-first-observed history, opening-time feature provenance, representative samples and later candidate/holdout validation remain prerequisites. More synthetic fitting does not close those gaps.
- **Separate roadmap items:** compensation/location modeling, role-based access, protected filters, employee-level decisions and expanded execution/scorecards are not this continuation. The historical V2/V3/V4 copy is not authorization to implement security/data features now.
- **Optional refactoring:** formatting dense components, extracting hooks, reorganizing calculators or replacing the already working worker transport is lower priority than the user-visible gaps above. Do not present cleanup or another unchanged full-test loop as core progress.

Only acceptance documentation/test tooling was implemented during this assessment. No product/API/schema/dependency/security changes, live requests, desktop interaction, push, PR or merge were made.
