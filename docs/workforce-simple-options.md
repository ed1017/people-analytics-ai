# Concise workforce options

Based on main `514651a97ba8e431d13d43fa8f0399202a0250af`. PR101's copy-cleanup branch remains separate and unchanged at `31240dfa1ea798fc4ffece42344faf51d450b4c0`.

## Calculated summaries and navigation

Only existing calculated options appear, numbered by their actual displayed count. One mounted card is visible at a time. Previous/Next arrows wrap; accessible tabs support Arrow keys, Home and End, with inactive panels outside the accessibility tree. A single option disables arrows. Selection follows option identity; source/goal changes reset the verified comparison context.

Each card has five concise bullets: expected result, cash and separate employee-time value, conditional timing, staffing counts, and entered-limit status. A sixth bullet covers external backfills when present. Actual quantities and their units are bold. Unknowns stay unknown, and conditional timing, unmet limits, skills availability and unverified hiring starts stay visible. No ML forecast, operational feasibility or global best ranking is claimed.

Per-option Details contains its own calculation, assumptions, source evidence and lineage. Details and temporary inputs survive browsing. Adjust this option opens the selected option's existing reviewable adjustment flow, with six common fields and expandable advanced assumptions. A draft remains tied to its originating option; review Save is disabled while browsing another option. Save on the saved result bookmarks that exact calculation; Save on an alternative first opens its review. Explicit review Save appends the governed version/result and does not record approval. Existing cancellation, stale-response guards, historical restrictions and storage handling remain intact.

For a verified original search with at least 100 calculated candidates (enumerated minus invalid), the lead reports that actual count and the actual displayed option count. Partial enumeration is labeled partial; small counts remain in search methodology. Temporary what-if edits do not inherit the original search's count lead.

## Working actions

Compare options, beside navigation, toggles a local table of the existing options' result, cost, timing, staffing and limit checks. It neither recalculates nor persists anything. The table scrolls within its container on narrow screens.

Adjust this option is the primary per-card action. Explore more options is secondary and opens the existing bounded local search/review flow on current saved results. Users must enter and confirm bounds and explicitly run the search; selection, replacement, calculation and saving retain their separate review steps. Historical results instead expose Saved alternative reviews. No selectable results produces guidance to review Build/Move/Buy bounds or the saved budget, employee cap, deadline and readiness assumptions. The UI never promises more feasible options or relabels the current options as new ones.

The Home composer has no verified option-snapshot adapter: its `/api/chat` request uses overview context, and the solution panel has no goal-owned composer callback. Accordingly these are functioning local controls, not chat suggestions. A future explicit-Send adapter must bind goal/result/option identities and preserve existing drafts. No nonfunctional prompt or unconstrained backend was added.

## Validation

All 497 unit tests and 262 browser assertions passed: 120 option-card checks, 62 journey checks, 16 focused navigation checks and 64 bounded-search checks. Full ESLint, standalone TypeScript, optimized Next production build and whitespace checks passed. Browser suites use synthetic fixtures and intercepted requests at desktop and 390px mobile widths; no live service/model request was made.

Checks cover one/two/three options, keyboard/focus/scroll behavior, retained drafts/disclosures, exact-option Save, existing-result comparison without persistence, bold actual values, original/partial counts, cancellation, goal/source changes, historical records, failed storage and search exhaustion guidance. Desktop and mobile screenshots were visually inspected.

Logs: `/tmp/options-recovered-*.log`.

Evidence: `/tmp/workforce-solution-cards-tdGqGr/`, `/tmp/workforce-journey-SuIQhT/`, `/tmp/option-switcher-q2WDHJ/`, `/tmp/workforce-local-search-0z52wl/`.

Hosted preview and physical-device acceptance remain separate. This recovery pass makes no remote API, authentication or security changes.
