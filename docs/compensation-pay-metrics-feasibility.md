# Compa-ratio and pay-distribution feasibility

Source-only review, 6 October 2026. No database, person-level query, access, schema or model changes.

The current internal contract (`lib/compensation.ts`, `app/api/compensation/route.ts`) exposes business-unit headcount, FTE and reported total labor cost in USD at 30 September 2026. Cost period, employee cost coverage, original currency and base-pay semantics are unavailable. Cost/FTE is not mean salary.

The separate public reference (`lib/compensation-benchmarks.ts`, `docs/compensation-public-benchmarks.md`) supplies OEWS occupation/geography wage percentiles for its exact reviewed mappings. Those are market distributions, not internal salary ranges, grade midpoints or employee pay distributions. They cannot provide an internal compa-ratio denominator or internal standard deviation.

## Minimum missing contract

- Compa-ratio: qualified annual base-pay numerator and corresponding salary-range midpoint, with matched currency, FTE/pay basis, effective date, job/grade and geography. A ratio of 100% means pay equals the matching midpoint. Missing or zero midpoints remain unavailable. Aggregate reporting needs eligible/covered/missing counts and a defined weighting method; an unqualified average of percentages is insufficient.
- Internal distribution by job, level and location: authorized aggregate cohort counts, a defined comparable pay basis, mean/median and actual spread statistics (for example reviewed percentiles and standard deviation). Standard deviation cannot be recovered from the current total labor cost/FTE figures or inferred from market percentiles. Do not impose a normal distribution.
- Any future exposure requires a separately reviewed aggregate/access contract, minimum cohorts of five and complementary suppression to prevent deduction from overlapping totals. No person-level salaries or newly exposed dimensions are authorized by this implementation.

No internal compa-ratio or pay-distribution metric was added because the existing contract does not supply these prerequisites. Existing public occupation/geography percentiles remain available independently. Screenshot-specific Compensation copy shortening remains pending identification of the target: the authorized Library transfer helper failed to download the supplied reference.
