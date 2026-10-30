# Synthetic workforce history

The owner approved generating coherent historical ratings and survey partitions for the fictional company. This release adds a local, versioned history explorer; existing published ratings, survey aggregates, source artifacts, APIs and saved plans remain unchanged.

## Population and scoring contract

| Period | Matching snapshot / survey wave | Eligible people | Valid respondents |
| --- | --- | ---: | ---: |
| 2024 Annual | December 31, 2024 | 8,636 | 6,687 |
| 2025 Annual | December 31, 2025 | 8,831 | 6,987 |
| 2026 YTD | September 30, 2026 | 9,037 | 7,028 |

These company-level population and valid-respondent totals were checked against the current public survey release. The original 11-wave company trend remains separate. No annual rating is joined to a different survey wave and waves are never pooled.

`synthetic-workforce-history-v1` uses deterministic independent cross-sections. Filled modeled inventory slots provide business-unit, country and level templates only. Generated cohort IDs are not employee or position IDs. Historical dimension distributions are deterministic modeled subsets of those templates, not reconstructed employment histories. Current dimensional totals reconcile to the existing modeled 9,037-person company. No real employee records are used.

Ratings are generated ordinal values 1–5, with a separate generated not-rated status. Survey records have five generated 1–5 items; workload pressure is reverse-coded as six minus its raw value. Valid respondents answer at least two items. Their mean after reverse coding determines unfavorable (at most 2), favorable (at least 4), or neutral (between 2 and 4). These person-level classes are not derived from the old favorable-answer percentage. Nonrespondents are not classified as unfavorable or neutral.

## Filters and display policy

Year selection chooses one matched cross-section. Business-unit, country and level selections use OR within each dimension and AND across dimensions, without duplicate people. An empty selection means no matching people. All people includes the eligible cohort; respondent-class filters include only valid generated respondents of that class, then use that same cohort for ratings and composition.

History filters are local to this explorer. They do not change other dashboard charts, saved scenarios or global API query contracts. The current dashboard receipt must identify the supported dataset and match the requested/effective scope; the model provides its own pinned bundle digest. A missing, stale or incompatible receipt cannot supply history results.

Nonzero selected cohorts and complements below 10 are withheld, including small linked rated/respondent differences. Chart buckets below 10 receive primary suppression and an additional complementary cell is hidden so visible totals cannot directly expose those cells. Linked counts and percentages are not displayed behind suppression labels. Known empty results remain distinct from withheld data.

This is a minimum-cohort display policy for reproducible fictional data, not anonymization certification or a guarantee against every overlapping-query inference. Raw generated cohort records are not sent to an external service. The generator seed, version, period rules and definitions are available under Details rather than repeated primary-page notices.

## Verification and release

Candidate implementation. Independent review, invariants, UI regressions, exact-head CI, isolated production build and staged/public desktop/mobile acceptance are required before publication. The target-line overlay remains preview-only and Lab validation remains owner-owned. No paid provider calls, new credentials, grants, accounting or pricing changes are part of this work.
