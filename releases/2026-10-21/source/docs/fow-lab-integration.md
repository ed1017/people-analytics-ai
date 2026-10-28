# Future of Work Lab integration

The native Future of Work workspace reads a versioned aggregate snapshot from the separate Future of Work Lab. It does not join the Lab population to the Workforce Intelligence population or apply the app's workforce filters to Lab functions.

## Source and capture

- Source: https://github.com/ed1017/future-of-work-lab, commit `295fe31e511d708e2261947a17a96f29257a3f65` (`m7-methodology-validation`).
- Export: `data/fow-lab-snapshot.json`, version `fow-lab-2026-10-28-v1`, captured October 28, 2026 through existing authorized read-only database access.
- Population: 10,000 people, 15 functions and 50 job profiles; workforce snapshot September 30, 2026. Adoption observations are dated September 21, 2026. Scoring and recommendation records are dated October 13, 2026.
- The export contains aggregate view rows, public occupation task statements, task classifications and run provenance. It excludes employee records, reviewer identities and comments, credentials, billing data and scoring-job administration.
- The source deployment required Vercel authentication. Integration QA renders this authorized source-derived snapshot in the app; it does not establish visual acceptance of the protected original Lab deployment.

## Meaning and verification

Automate, augment and unaffected task classifications use rubric weights 1, 0.5 and 0. The exposure index combines these weights with estimated task shares. It is distinct from the exposed task share, measured productivity, hours saved and staffing reductions. Cost/headcount weighting changes aggregation, not the underlying rubric.

The adapter checks task coverage, single-run provenance, labels, shares, source dataset identity and adoption denominators. Missing, suppressed or incomplete measures remain unavailable. Matched recommendation citations mean they match the captured snapshot, not that the recommendation is current or validated. Source date and validation progress remain available in Details. The capture has 100 sampled tasks, 33 human reviews and no completed retest; it is not a completed validation study.

The native module includes no scoring, recommendation-generation or retest job and makes no provider calls. Updating the snapshot requires a separately reviewed export; browser reload does not regenerate it.

## Planning and saved work

An explicit handoff saves the selected Lab reference and immutable source version to the selected existing goal through the existing revision-checked decision store. It does not alter scenario inputs, convert exposure to FTE, overwrite a draft or merge populations. Workload, capacity, timing, adoption and cost assumptions remain separate planning inputs. Existing task-redesign examples and saved scenarios remain available.
