# Compact solution cards, local what-ifs and saved-solution pins

Implementation contract established after local goal-copy checkpoint `d31dd15c8bcadceb3d00a7e161e47ee099bd7eba`. The user explicitly requested this direction. It supersedes the old standalone priority-3 Decision Brief summary plan; the local implementation is now described in `workforce-solution-cards.md`. Parent owns source review/publication and separate live preview validation.

## Existing architecture and concrete gaps

- `WorkforceSolutionPanel` owns the current goal/version/calculation and shared sidebar edits. `WorkforceAlternatives` stores up to two reviewed revisions in the existing `workforceAlternativeReviews` field. Each review also calculates saved-mix and hiring-only core options, so its internal comparison array can contain four entries.
- Three visible cards need no expansion of that two-revision cap: show the saved mix plus up to two reviewed alternatives; retain hiring-only as an expandable benchmark. With no reviewed alternatives, saved mix and hiring-only already provide two honest options. Do not invent alternatives to fill three slots or conceal an omitted benchmark.
- `previewWorkforceAlternatives` deliberately forbids revisions to budget, employee cap, demand/horizon or common hiring cost/timing. Simply adding editable fields to those cards would violate that contract. A bounded local what-if adapter is necessary.
- `reviseWorkforceSolution` already appends immutable versions and retains history/evidence IDs. An explicit local calculation/save path can reuse this lifecycle, but must distinguish recalculation on retained evidence from a fresh service-backed result. Prior v1/v2 reviews and search origins must remain intact.
- Goal pins today are goal records selected by `FocusedIssue`; `LocalGoal` parsing does not retain arbitrary extra properties. Solution pins must not be smuggled into goal text/context or treated as approval.

## Minimal user-facing flow

1. One compact card list within the existing workspace, not a split-screen mode. Show 2–3 real options. Each closed card contains mix, incremental cash, separate employee-time value, added employees, conditional coverage, constraint status and a short preference basis. Native expandable sections hold exact assumptions, evidence references/dates, costs, hiring/training timing, trade-offs and unknowns. Keep keyboard/mobile focus and existing sidebar inspection links.
2. Ask the user to choose the ranking basis: e.g. lower incremental cash, fewer added employees or earlier conditional coverage. No hidden composite score, weights or universally-best label. Rank only eligible shown options that meet the entered constraints and have the required comparison metrics. Label Option 1 **Preferred under [selected priority] among these compared options**. Before a priority exists, when none qualifies, or when tied, disclose that there is no unique preferred option; do not manufacture one. Show failed/unknown alternatives with reasons rather than hiding them.
3. Expand **Tailor this option**. A user edit starts a temporary what-if and triggers bounded, cancellable local worker recalculation after valid input; show before/after values and explicit stale/calculating/error states. Invalid or incomplete inputs cannot leave old metrics displayed as current. No call to AI, API or source refresh is needed.
4. **Save revised solution to this goal** is separate from editing/recalculation. It revalidates the exact current goal/version/evidence and latest draft, then appends the reviewed inputs and deterministic result through the existing solution lifecycle. Cancel discards only the temporary what-if. Original versions, calculations, approvals, existing alternative reviews and their lineage are retained. Saving is not approval and does not automatically pin or execute the solution.
5. **Pin saved solution** bookmarks an exact saved version/result. Unsaved cards show **Save revised solution first** instead of silently saving or promoting a draft. A compact **Pinned solutions** list allows explicit return; Unpin removes only the bookmark.

## What-if boundary for the first coding slice

Keep role, BU, additional-role demand and horizon fixed to the reviewed saved evidence. Interpret the editable headcount control precisely as **Maximum additional employees, including backfills**, the existing employee-growth constraint. It is not total-company headcount or a change to role demand.

Allow the existing budget/employee-limit/deadline controls as shared comparison constraints, applying the same changes to every displayed option. Allow existing training cash/hours/hourly-rate, Build/Move readiness and hiring cost/date/fee assumptions through the existing calculator contract. Common hiring assumptions remain common across options so the comparison is not biased. Counts/backfills remain explicit and must satisfy existing integer/sum rules; candidate pools never supply defaults. Training spending and dates remain assumptions, not course-completion-to-role conversions.

Changing role/BU/demand/horizon is outside this first local adapter because the saved structural/reference payload may no longer match. Keep the current governed-input workflow for those changes; do not clone old source-derived structural totals into a different scope. Broader demand changes need a separately verified local derivation/source contract, not an invented data dependency or automatic service call.

## Persistence and lineage proposal

- Preserve the current decision-store key and solution/review history caps. No database, account, synchronization or new backend.
- The revised-solution save needs one atomic local write of the validated next `workforceSolution`: new version, run/result and a bounded origin reference in the new result payload. Proposed origin records the prior goal/solution/version/result, optional saved alternative review/slot, original search-origin reference/fingerprint, calculator method, retained-evidence fingerprint, changed input keys and explicit ranking basis. The exact schema must be specified and replay-validated before implementation; do not reuse the strict v2 search-review shape for a what-if that changes its locked common assumptions.
- Preserve prior review/search records verbatim. An old selected-search match is not inherited as the new what-if's feasibility or preference. Retained source dates stay retained source dates; local recalculation time is not a source refresh.
- Pin storage: propose a new bounded goal-local `fields.workforceSolutionPins` list inside existing `DecisionStore`, rather than a new localStorage key or extending `LocalGoal`. Each versioned record contains an ID/time and exact goal/solution/version/result references plus evidence IDs/content fingerprint; it stores no duplicate raw evidence or owner/approval notes. Propose a ten-pin cap with explicit refusal when full, consistent with the existing bounded-review pattern; never evict history automatically.
- Pin only a readable, already saved calculation whose references and content can be verified locally. Historical saved calculations may be pinned as historical. Opening resolves the exact goal and `workforceInspection` result ID, never “latest.” Missing/tampered/unsupported references show unavailable and retain the bookmark; no silent repair. If current work has unsaved edits or a pending operation, require those to be resolved before navigation, preserving drafts.
- Pin/unpin and preference are distinct from version-specific approval. The goal remains a question/decision context; the pin is a bookmark to a particular saved answer. Goal removal follows its existing explicit deletion behavior; no cross-goal orphan references are invented.

## Ordered implementation and acceptance

1. Implement the compact presentation and deterministic explicit-priority ranking over existing verified calculations. Unit tests for met/failed/unknown/ties and browser checks for 2/3-card rendering, disclosures, keyboard/mobile fit and no new calls/writes.
2. Implement the pure local what-if adapter and reviewed-save codec with unchanged arithmetic. Test every allowed field category, shared constraint fairness, unknowns, exact deltas, stale/cancelled worker replies, corrupted source/origin, explicit-save atomicity, original/history/approval preservation and storage limits. Validate save/reload on synthetic fixtures before presenting revised solutions as saved.
3. Implement exact-result pin/unpin/return using the existing goal-selection and inspection mechanisms. Test historical return after newer results, renamed goals, unavailable references, unsaved-draft refusal, duplicate pins, limits, reload and unchanged approval state. No automatic pinning.

These are one coherent requested scope delivered in reviewable increments. Existing calculators and browser workers suffice; live model testing is not a dependency. Actual target-browser/hosting acceptance remains separate from Linux Chromium emulation.

## Published `aae644b` UI entry for parent validation

There is no separate workforce-solution page URL. Open `/` → **Home** → choose a saved **Selected goal**, or **New goal → Problem statement → Pin Focused issue**. General exploration has no active goal and intentionally renders no workforce panel. Home then shows **Plan one workforce decision → Start guided workforce plan** above its other content.

Within **Your workforce decision**: **Planning statement → Clarify statement with AI → Review proposed changes → Save reviewed inputs → Calculate saved assumptions and compare hiring-only**. A readable completed calculation reveals **Review local alternatives → Compare bounded Build, Move and Buy mixes**. Search requires a current saved result, no unsaved/pending edits, explicit six bounds and confirmation. No goal-copy/readiness button from later commits should be expected on `aae644b`.

An existing solution panel is allowed on Home, Skills, L&D, Talent Acquisition, Scenario Modeling, Workforce Response, Decision Brief and Development Planning. It does not render on Workforce, Planning Overview or Position Design. An unreadable saved solution shows a retained-record warning instead of editing controls. This source-derived path does not authorize or perform any extra live calls.
