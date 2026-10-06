# Synthetic performance and promotion demo

This extends **Career Growth & Internal Mobility**, not Career Interests or a separate page. Existing recorded movement counts, event shares, monthly movements and level transitions remain separate. Their source has no verified promotion-eligible workforce denominator, annual rating history or longitudinal level-entry dates; it must not supply these new metrics.

The offline generator constructs separate annual cohorts for 2023–2025, seed 51007. Only nine fixed department × starting-job-level cell series and aggregate evidence hashes are shipped. Records exist in generator memory only. These are invented populations, distinct from the workforce source and synthetic pay demo; dashboard filters do not apply. Annual cohorts are not a longitudinal employee panel.

## Definitions

- **Eligible denominator:** active salaried at 1 January, hired by then, at least 12 completed calendar months at the starting job level, complete promotion-event follow-up through year end or exit. This is a demo rule, not company policy. Later hires and invalid/incomplete inputs are excluded. Exits stay in the initial eligible denominator.
- **Promotion rate:** distinct eligible people with an observed promotion to a higher level during that calendar year and no later than exit / all eligible people at year start. One first promotion per eligible person; no lateral-move or transfer numerator. Not event composition or a person-time incidence rate.
- **Ratings:** consistent invented 1–5 ordinal rubric. Display each category count and the share rated 3–5 / eligible people with one valid in-year rating. Missing, incompatible or after-exit ratings are excluded from this rating denominator, never assigned zero. No mean rating or interval/normality assumption. Differences across years do not establish individual improvement.
- **Time to promotion:** completed calendar months since prior-level entry among observed eligible promotees. Median and Q1–Q3 use linear interpolation at `(n-1)*p`. People without observed promotions are excluded from this statistic, including people who exited first. This selection means the metric is not a future waiting-time or survival estimate. No causal link between ratings and promotion is claimed.

## Disclosure

If any year contains fewer than five eligible people, or a positive count of 1–4 in rated, missing-rating, rating-category, promoted or nonpromoted groups, every metric and count for that department-level series is suppressed in all years. If exactly one department at a level is suppressed, the smallest remaining department cohort (minimum annual eligible size, then stable key tie-break) is also suppressed across all years. There are no overall totals or overlapping marginal subtotals. The comparison and trend controls select already-published fixed cells; they never recalculate new groups. True zeros remain visible when the full cell meets the disclosure rules. A zero-rated or zero-promoted cell has no invented rating/time statistic.

This reproducible invented demonstration is not a general privacy guarantee for real records. No individual records, ranking, recommendations, protected attributes, fairness/equity conclusion or operational promotion decision is provided.

## Reproduction

`node tests/manual/generate-synthetic-career-demo.mjs --write` regenerates the artifact. `--check` compares every byte, including hashes of the protocol, generator and shared simulation utilities; prebuild runs the check. The browser consumer accepts only the exact verified static artifact. Unit tests cover denominators, eligibility exclusions, dates, missingness, true zero, duration selection, primary/complementary suppression across years, duplicate identities, unmapped cohorts and reproducibility.
