# Separate synthetic pay demo v1

This is an offline arithmetic demonstration for the Compensation page. It is a new invented workforce, unrelated to the existing workforce-cost view, dashboard filters, selected goal and BLS wage references. No database/schema/access changes or new endpoint are involved. No real salary records, personal attributes or person-level output are used.

## Fixed input contract

`lib/simulation/pay-demo-protocol.json` defines seed 51006, snapshot 30 September 2026, USD annual base pay and eighteen fixed disjoint job × level × location cohorts. Jobs are Software developer, Data analyst and People operations specialist; levels L2/L3; locations Austin, Chicago and Seattle. Job band midpoints and level/location multipliers are explicitly invented. They are not market premiums, BLS medians or observed employer policy.

The generator reuses the repository's seeded `rng`/`integer`/`digest` simulation helpers. Each unique in-memory record represents one synthetic active salaried worker. Contracted annual base pay is paired with its actual FTE (0.5, 0.8 or 1.0) and a full-time annual base-pay band for the same job, level, location, currency and effective date. The fixture uses bounded non-normal draws and occasional larger values; it is not fitted to actual pay. Deliberate missing and incompatible records test exclusion. Row records and identifiers never enter the generated public artifact.

Eligibility requires unique identity, active-salaried status, finite positive annual base pay, finite FTE >0 and <=1, finite normalized pay and a positive matching midpoint. Period, pay basis, currency, range identity and date must match. Missing/mismatched fields are excluded, never coerced to zero or silently assigned FTE=1. Duplicate identities, duplicate range cohorts and unmapped cohorts fail closed.

## Arithmetic

For every eligible record, normalized annual base pay = contracted annual base pay / FTE.

**Aggregate compa-ratio = 100 × sum(normalized annual base pay) / sum(matching full-time annual base-pay midpoint).** Each eligible person contributes one normalized pay and matching midpoint. This is a defined ratio of sums, not an unqualified average of percentages or an FTE-weighted payroll cost. In a fixed cohort the band midpoint is the same for every eligible person; 100% means mean normalized pay equals that midpoint. No BLS median is substituted for a salary-range midpoint.

Mean, median, quartiles and SD use that exact same eligible population with equal person weighting. Quartiles use sorted linear interpolation at `(N-1)*p` (p=.25/.5/.75). SD is the descriptive population standard deviation, dividing squared deviations by N. It is not sample-estimation uncertainty, a normal curve, a confidence interval or a pay-equity test. The display rounds monetary amounts to whole USD and compa-ratios to one decimal; the artifact retains two decimals. The plot shows only Q1–Q3, median and mean, not individual observations or min/max.

## Disclosure contract

- All metrics, midpoint, eligible counts and coverage are suppressed for eligible N<5.
- If a job-level partition contains exactly one suppressed location, also suppress the smallest remaining eligible cell (stable cohort-key tie break). Primary and complementary cells use the same public status and null payload.
- Suppression is applied once at build time, before selection. The UI can select only one released fixed cell; it cannot create arbitrary cohorts, marginals, bins or subtotals.
- No overall workforce counts/pay totals, overlapping job/level/location totals, row outputs or time comparisons are published. No aggregate containing a hidden cell is exposed, so ordinary subtotal differencing cannot recover its count or pay statistics.
- Excluded counts of 1–4 and their reconstructing cohort totals are withheld even in a published cell. A visible partial-coverage label remains. Zero exclusions or at least five exclusions can be reported with a denominator. No overall excluded total is exposed.
- This is a demonstrative disclosure rule on reproducible invented data, not a general privacy guarantee against auxiliary information. A future real-data or longitudinal release would need a separately reviewed aggregate/access and disclosure contract.

No rankings, pay recommendations, claims of fairness/discrimination, causal location effects or individual pay decisions are produced. Actual company compa-ratios and internal distributions remain unavailable under the existing workforce-cost contract.

## Reproduction and boundary

Run `node tests/manual/generate-synthetic-pay-demo.mjs --write` to generate `lib/data/synthetic-pay-demo-v1.json`, then `--check` to verify byte equality. The artifact records SHA-256 hashes of its protocol, generator and shared random helper. The existing prebuild gate checks the artifact. Runtime consumes only this static aggregate JSON; there is no generator import, network fetch, model call or request-supplied salary data in the new panel. A missing or changed artifact candidate fails closed in the consumer.

Validation includes exact arithmetic, FTE normalization, eligibility exclusions, incorrect currencies/dates/bases/midpoints, missing-value coverage, primary/complementary suppression, no row payload, deterministic reproduction, fail-closed consumer behavior, all eighteen UI cohorts and responsive/keyboard checks. Existing workforce-cost and public wage-reference features remain separate.
