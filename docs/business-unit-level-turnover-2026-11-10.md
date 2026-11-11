# Business-unit turnover by level

Status: source candidate only. No runtime release or fresh paid-provider acceptance is claimed.

## Supported question

“Which levels drive Managed Services turnover, and what does it cost?” now has a bounded deterministic answer path. An exact published business-unit name or code selects a current-YTD level breakdown. Unqualified turnover means total exits; voluntary exits are used only when explicitly requested. Other periods and unsupported exit classifications are not silently substituted.

The answer leads with the largest contributions to recorded exits, followed by all twelve levels. Counts, shares of business-unit exits, average monthly closing headcount and turnover rates are distinct. The current dataset's period is January–October 2026. “Drive” means descriptive contribution, not causation or a prediction. Rates are exits divided by the mean of the ten month-end stocks, not sums of monthly rates or annualized figures. Small-group rates require caution; no arbitrary suppression threshold is introduced into the fictional aggregate contract.

Country scope stays selected. The named business unit and all-level comparison are stated explicitly, including when they differ from current dashboard filters. The read changes neither filters nor saved planning state.

## Verification contract

The reader uses the existing server-owned `turnoverHistory` binding, not model-supplied counts or values inferred from rounded percentages. Every dashboard receipt and history response must retain the current public dataset identity, digest, cutoff and exact requested/effective scope. The level catalogue must contain the complete unique L1–L12 partition.

Each monthly stock, total-exit count and voluntary-exit count reconciles across all levels to the business-unit row before calculations are shown. Complete month ordering, safe nonnegative counts and voluntary≤total are checked. Unknown, suppressed, conflicting, stale, incomplete or duplicate evidence is rejected. Current dashboard stocks and historical closing stocks must also agree.

Zero exits with positive average headcount give a zero rate. A zero average headcount makes the rate unavailable, while preserving any verified exit count. No business-unit exits makes contribution shares unavailable, not a meaningful ranking of zeros. Display rounding occurs only after calculation and reconciliation.

## Mixed questions and saved work

The supported level answer is retained when cost or tenure is also requested. There is no verified business-unit-by-tenure join or turnover-cost calculation here. Cost needs explicit replacement counts, per-exit costs, currency, period and downtime assumptions. Finance amounts and policy base-pay figures are not reinterpreted as turnover losses; no salary multiplier is invented.

PR582's detached evidence request is extended only to this bounded question family. Repeated questions and narrow immediate follow-ups preserve the selected plan, goal, catalog, constraints and evidence recipes. Only validated answer turns return. Actual plan edits, active scenario discussions and unrecognized mixed requests retain strict planning provenance checks.

## Source validation and release limits

`node --test tests/release-level-turnover.test.mjs tests/release-quarterly-turnover.test.mjs releases/2026-10-21/source/tests/home-independent-workforce-question.test.mjs`

The tests cover independent arithmetic, complete partitions, positive controls before every corruption rejection, exact scope and identity, mixed cost/tenure limits, and actual public-route adapter execution through saved demo, repetition, follow-ups and serialized reload. Provider dispatch and projection calls are hard-denied. Fixtures are invented test aggregates, not reconstructions of private runtime data.

The complete verified runtime was restored locally. Full production build, standalone TypeScript and 31 focused tests passed. Twelve actual-data route responses and all 144 displayed level rows were independently reconciled to monthly source sums and means. Desktop/mobile browser and hosted acceptance remain unrun. No incomplete runtime may be deployed. No paid AI calls were made.
