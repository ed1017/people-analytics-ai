# Capacity alternative adoption: local acceptance checkpoint

## Implemented contract

Home offers one bundle-adoption handoff after the user selects up to two deterministic search candidates. The standalone workforce planner retains its separate temporary-alternative editor.

`lib/home-capacity-adoption.ts` replays the selected search against the current saved source calculation and exact goal. The selected candidate must be emitted, distinct from the saved mix, and meet the existing entered-constraint and metric requirements. Only Build, Move and external-hire counts may change. Other staffing inputs remain fixed under the existing search policy.

Each active path needs an existing component/participant flow mapping. Internal counts must fit known, reviewed group counts and complete component memberships. Multiple internal paths need reviewed disjoint groups. Missing mappings, illustrative or insufficient group counts, unresolved overlap, incompatible dates, changed goals, stale calculations and modified reports are rejected before creating a new draft.

The preview reconciles the entire bundle before and after selection. It shows count changes, distinct participants versus added company employees, dependency-gated timing, the shared ledger and remaining unknowns. Inactive flow mappings are removed explicitly. Component wording, dependencies, dates, group counts, expense entries and allocations are preserved. If a staffing cost line changes, affected component cost reviews and the distinct-cost confirmation become unknown: removing a path must not silently declare its still-present activities fully funded. The user must review whether retained activities remain appropriate, as well as their costs.

Acceptance repeats verification in the local worker and compares the exact preview. It creates a new working revision, invalidates comparison confirmation and stales the former calculation. Changed count origins retain the candidate, search fingerprint, source version, bounds, caps/filter and method. No model request, storage write or destination update occurs at acceptance.

Save and Calculate remain explicit. The previous attachment stays intact until a reviewed replacement. Linked destination fields update only through the existing receipt-bound atomic transaction: manual differences default to Preserve, unowned nonempty fields require explicit Replace, quota/stale failures publish no partial attachment or destination changes, and earlier attachments/versions remain available.

## Local recruiter checklist

| Journey / step | Local result and evidence boundary |
| --- | --- |
| Reduce turnover → response → Pin | Exact user goal preserved. Discovery and plan text come from intercepted structured fixtures. |
| Retention plan review | No staffing search, fabricated search count or predicted retention optimum appears without supported capacity inputs. |
| Everyday edit → diff → accept | Common participant wording, zero/unknown/illustrative provenance, ambiguous budgets and negation exercised. Unsupported clauses produce no partial edit. |
| Retention Save → Calculate → Attach → edit/update | Explicit versioned replacement keeps the first attachment and saves the new participant count. |
| Plan, goal, scope and evidence changes | Old edit reviews are disabled; returning to the former scope does not revive them. |
| Capacity discovery → Pin | Exact “Add three engineering roles” goal preserved; one explicit Pin preparation. |
| Reviewed capacity source setup | The adoption journey supplies a normalized saved calculation, complete mappings, dependency dates and shared-cost assumptions as browser-owned synthetic fixtures. It explicitly prepares again after that context changes. This is not evidence that a model supplied those values. |
| Guided capacity input path | The existing built Home capacity-flow suite separately exercises scope review, missing inputs, explicit Save/Calculate and unchanged calculator payloads with intercepted service responses. |
| Search → alternatives A/B | Actual local worker enumerates bounded mixes. Both alternatives receive separate full-bundle reconciliation previews; selection position is not a quality rank. |
| Adoption → Save → Calculate | Acceptance changes only the working revision; stored attachment and destinations remain intact. Calculation is explicitly rerun. |
| Manual destination conflict | A receipt-owned Development participant value is manually changed. The replacement review preserves it by default while explicitly chosen capacity fields update. |
| Worker failure | No new working adoption, attachment or destination subset is published. |
| Attachment quota failure | Whole linked transaction remains unsaved. Reload retains the saved draft/old attachment; explicit recalculation and review allow retry. |
| Replacement and reload | Prior attachment remains byte-for-byte intact, new attachment/version persists, manual edits survive and stale workforce results cannot drive another search. |
| Desktop / mobile / 200% reflow | Both recruiter journeys exercised through their actual controls with no horizontal overflow or unexpected requests. |

## Still requiring real-model or hosted verification

- Actual discovery/model responses: valid metadata, exact-goal preservation with real responses, useful and distinct multi-method proposals, complete prose and honest uncertainty. Fixtures cannot prove these qualities.
- Hosted browser behavior on the exact eventual preview SHA, including the new worker asset, browser storage, cancellation and reload in the hosted environment. Local production builds are not hosted acceptance.
- A permitted real aggregate evidence/calculator integration: the saved capacity inputs and source evidence must match the intended reviewed role and business unit. The local service responses were fixtures, not live backend validation.
- Human review of proposed methods, retained activities after an inactive path, operational group availability, cost coverage, dates and outcome measures. Deterministic constraint matches do not prove operational feasibility or retention effectiveness.
- Full release checks and authorization remain held. No live model calls, push, PR mutation, merge or deployment was performed.

## Remaining bounded limitations

Newly active paths without existing mappings require manual preparation and a fresh matching calculation/search; the adoption step does not invent mappings or resize groups. Staffing selection does not rewrite intervention wording, assign people or approve execution. Changed path costs can leave the full budget unknown until reviewed. The working form remains available. No validated retention response model, global intervention optimizer or forced third option is added.

## Verification result

- 936 unit tests passed, including both selected alternatives, participant/mapping rejection, modified search reports, changed goal/source calculation, invalid dates, retained non-staffing data, cost-review invalidation and saved adoption provenance.
- 325 browser assertions passed: capacity-adoption recruiter journey 36; Reduce turnover recruiter journey 81; existing guided capacity flow 72; receipt-bound attachment/update flow 45; integrated plan/search flow 27; standalone search worker and lifecycle checks 64.
- Lint, TypeScript and production build passed. The worktree is committed locally; held eNPS files are excluded.

Commands used the repository unit suite (`node --test tests/*.test.mjs`), production `next start`, the six browser scripts named above, and intercepted synthetic endpoints. Local browser workers executed the deterministic search and reconciliation; no service fallback or live model request was used.
