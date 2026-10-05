# Local Action Plan application preview

The pure mapper in `lib/action-plan-application-preview.ts` now supports an explicit application panel in `HomeBundlePlans`, coordinated by `lib/action-plan-application.ts`. Existing attachment, Development and workforce formats remain unchanged; a bounded `actionPlanApplicationsV1` goal field records application history. There are no source dataset/catalogue writes, new options, model calls, vendor contact or operational approvals.

## Contract

`previewActionPlanApplication(context, choices)` returns current, proposed and policy-selected `after` values, units, original provenance, conflicts and reasons for every supported row. `after` describes a potential edit; it is not saved state. Each field defaults to `preserve`. Explicit `fill-empty` only fills null/blank fields; numeric zero is occupied. Explicit `replace` affects only the named editable field. Missing source values never clear existing values. There is no additive mode.

The caller supplies the current ActionBinding, saved bundle workspace, chosen attachment ID, current working draft, destination snapshot and explicit destination selections. The destination revision is the existing `DecisionData.revision`; Development has no independent version counter. A SHA-256 context fingerprint binds the full inputs, review selections and field choices, including quote snapshots and workforce history. The visible binding also includes exact goal text/ID, attachment ID, binding key, draft revision, input key, source evidence IDs, solution ID and solution version. Current evidence/planning digests must be supplied by the existing binding producer; the mapper does not fetch evidence.

`actionPlanApplicationPreviewIsCurrent(preview, freshContext, choices)` rebuilds and compares the entire preview. It rejects changed destinations even when a revision counter was not advanced, changed policies/reviews, tampered rows, changed goal/evidence/planning bindings, edited or newer saved drafts, superseded attachments and invalid saved results. Inputs and output do not share mutable references. The existing attachment reader recomputes deterministic arithmetic solely to verify the saved attachment; no calculation is saved or adopted as a destination result.

## Exact field map

Paths below are review addresses. `workforceSolution.<section>.<field>` refers to the current version's `inputs[section][field]`. It never addresses or edits a historical version.

| Source | Destination | Gate / behavior |
| --- | --- | --- |
| `draft.binding.goal` | `development.goal` | Existing session in same goal workspace; may fill blank, cannot replace another goal. |
| Explicitly selected existing quote | `development.selected`, `development.options[i].quote` | Read-only retained identity and full provider/terms/provenance snapshot. Never derive a vendor from component text. |
| Selected quote `sessions`, `hours`, `fee` | `development.options[i].inputs.sessions`, `.hours`, `.fee` | Exact current quote, same currency and fee basis, reviewed component/population/horizon compatibility. Sessions per participant, hours per participant per session, and quote currency per person/cohort per session respectively. |
| Selected component's membership group counts | `development.options[i].inputs.participants` | Complete reviewed membership, reviewed non-illustrative counts/population, explicitly reviewed disjoint groups, 1–10,000 unique participants. Does not use bundle-wide totals or headcount. |
| `draft.inputs.capacity.input.loadedHourlyCost` | `development.options[i].inputs.hourlyCost` | Explicit same population/loaded USD per hour review, same selected quote currency, matching Build flow component/group, supported numeric bounds. Preserve original illustrative/adopted/user-entered basis. |
| None | `development.options[i].inputs.additionalFees` | Missing. Ledger totals, shared allocations and training cash are not quote-specific additional fees or per-session fees. |
| `draft.binding.goal` | `workforceSolution.scope.goalStatement` | Read-only exact existing goal match. |
| Capacity input `businessUnit`, `jobProfile`, `intent`, `planningMonth`, `months` | `workforceSolution.scope.<same field>` | Existing `workforceInputGroups` adapter mapping; nonempty scope/horizon fields must match exactly. |
| Capacity input `roles` | `workforceSolution.demand.roles` | Additional role demand; never source headcount. |
| Capacity input `build`, `move`, `buy`, `backfills` | `workforceSolution.response.<same field>` | Exact counts, without addition. Internal Build/Move are existing employees; Buy/backfills are planned external additions. Unresolved internal group overlap blocks capacity mapping. |
| Capacity input `recruitingStart`, `arrivalMode`, `arrivalDate`, `buildMonth`, `moveMonth`, `backfillDate` | `workforceSolution.timing.<same field>` | Exact explicit dates/months/mode; no historical arrival inference. |
| Capacity input `annualHireCost`, `hireFee`, `annualBackfillCost`, `backfillFee`, `internalAnnualCostChange` | `workforceSolution.costs.<same field>` | USD annual loaded cost per hire/backfill; one-time fee per hire/backfill; total annual internal cohort uplift. No basis conversions. |
| Capacity input `trainingCash`, `trainingHours`, `loadedHourlyCost` | `workforceSolution.training.<same field>` | Total USD training cash, total employee training hours, USD per loaded employee hour. Aggregate hours never become attendance or sessions. |
| Capacity input `budget`, `maxAddedEmployees`, `deadlineMonth` | `workforceSolution.constraints.<same field>` | USD incremental horizon budget, maximum additional employees including backfills, required coverage month. |
| None | `selectedPlanningScenario` | Read-only. A/B/C are Action Plan option identities, not catalogue scenario identities. |
| None | `headcount` | Read-only API-backed source evidence. |

Quote review is a local attestation referencing the exact attachment/binding/input key, component ID, destination option index, quote fingerprint and shared scope fingerprint. Quote records lack component/population metadata, so the caller must explicitly obtain compatibility review rather than infer it. A current option must already contain the explicitly selected quote, with its complete snapshot unchanged. Switching components/options or changing quote terms, currencies or fee bases invalidates the review. `simulated` means fictional provider/simulated quote; `user-provided` remains unverified. No quote is manufactured or substituted.

Capacity review separately confirms additional capacity against the exact attachment and destination solution ID/version. Missing destinations, cross-goal/scope mismatches, pending calculations and the 50-version limit block it. Each source field retains its original assumption kind/basis. The final selected combination is validated with existing workforce input and arrival validators; a partial replacement that breaks the mix blocks all selected capacity changes. Development selections similarly block when their resulting numeric fields violate existing input bounds. These validators do not calculate outcomes.

`missing` lists rows without usable proposed values, `conflicts` lists occupied fields with different proposed values, and `blockers` lists invalid attempted selections. Row status/reason also reports unresolved restrictions when no changes were selected. Attachment issues and limitations remain visible; acknowledging unknowns during attachment does not resolve those missing fields.

## Explicit application and storage boundary

The current attached Action Plan exposes **Preview application**. The user chooses an existing Development option/component and explicitly reviews quote compatibility or additional capacity as applicable. Every field defaults to Preserve. Changing choices requires updating the preview; **Apply selected fields** remains disabled until the preview is current, contains actual changes and has no selected-field blockers. Existing `useGoalWorkspace` subscriptions update planning fields after persistence. Receipt/history remains visible when applying workforce inputs makes the original source planning binding stale; no preparation or calculation runs automatically.

`applyActionPlanPreview` re-reads saved source/destinations, checks the exact preview, and rechecks the live source/working-draft guard after asynchronous fingerprinting and immediately before commit. A per-store in-flight gate, UI ref and destination-revision check prevent double-click/replay writes. All changed fields use allowlisted mappings. Workforce changes append via `reviseWorkforceSolution` without replacing previous versions/results/evidence/approvals. Development changes record complete before/after session snapshots. Receipts include source binding, selected changes/provenance, skipped-field reasons, store revisions and workforce version references. History allows at most 20 receipts and 192 KiB; history and existing 512 KiB goal/3 MiB envelope limits block the transaction without pruning.

`DecisionStore.commitGoalFields` builds and validates one complete goal-store envelope containing both selected destinations and the receipt. It compares the expected persisted bytes before and after candidate validation, checks the active goal/exact statement/revision, then calls `setItem` once. It publishes candidate memory state only after successful persistence. Stale state, invalid history, unsupported mappings, quota/write failures and capacity limits save neither destination. Ordinary existing `setField` edit semantics remain unchanged.

The panel listens for actual `storage` events and invalidates application when persisted bytes differ, preserving this tab's state and requiring reload. These are **optimistic conflict checks**, not strict cross-tab CAS: localStorage has no native compare-and-swap and simultaneous writes in the remaining read/write window cannot be strictly serialized. No global lock or storage backend migration is introduced. No partial receipt is necessary because supported destination changes and their receipt use one envelope write.

New quote/options or workforce-solution creation are outside this milestone. Missing destinations or source values remain explicit blockers/missing fields. No total-to-fee, aggregate-hours-to-sessions, source-headcount or Action-Plan-ID-to-catalogue mapping is added.

Existing Home finding-followup prompts, `app/page.tsx`, source datasets, database/schema/access/security/billing/domain settings, model request envelopes and held eNPS files are outside this change.

## Checks

Focused: `node --test tests/action-plan-application-preview.test.mjs tests/action-plan-application.test.mjs`

Related: `node --test tests/home-bundle-foundation.test.mjs tests/home-bundle-delivery.test.mjs tests/home-action-plan-pilot.test.mjs tests/development-costs.test.mjs tests/workforce-solution.test.mjs tests/workforce-solution-review.test.mjs tests/workforce-increment.test.mjs tests/local-decisions.test.mjs`

Browser: `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/action-plan-application.mjs`. Uses the real `HomeBundlePlans`, application panel, store and planning hook with synthetic fixtures, intercepted network requests, desktop/mobile viewports, write-failure injection and a second browser tab.

Static: TypeScript, ESLint on changed code, and production Next build with the existing local font fixture.
