# Demand periods and incomplete-review acceptance

This successor tightens the two demand tool schemas to the existing calculation
contract. Counts, FTE fractions, availability percentage and total USD use
`period: null`, even when their values are unknown. Only `hoursPerContract` and
`productiveHoursPerFte` accept `month`, `year` or `horizon`; null keeps their
denominator unresolved. Count integer limits, 0–1 fractions and 0–100 percentages
also match existing runtime validation. Each revision schema ties its field to
the corresponding quantity or scalar type.

Invalid periods return `invalid_demand_period` feedback with every affected field,
its units and allowed periods. No input value or provenance is converted. The
existing four-round/six-tool limit is unchanged; a corrected call is a new
explicit proposal within that limit. Other runtime and provenance checks remain.

The reproduced failure shapes contain seven invalid non-rate periods each, not
only an invalid contract count. After an explicit offline correction to null,
their unknown existing-role count still legitimately produces `needs-inputs`.
Zero proposed availability does not fabricate an existing staff count.

Future acceptance must distinguish three separate conditions:

- A schema or runtime rejection produces no review and cannot count as success.
- A valid structured `needs-inputs` review is an acceptable intermediate result.
  Retain its key and unknowns, allow the nine-month correction, and do not attempt
  staffing comparison or mark it accepted merely because a review exists.
- Once the four-staff/25% user correction supplies the remaining inputs, require
  `calculated` and verify arithmetic and current-turn provenance. For the captured
  shape's two contracts, 80 monthly hours per contract and 120 monthly productive
  hours per FTE, nine months gives 1,440 workload hours, one available FTE,
  1,080 capacity hours, a 360-hour gap, one-third additional FTE and one whole role.

The existing clarified continuation fixture and its pinned historical manifest
remain unchanged. Its original fully specified synthetic test remains valid for
that lane; it is not a rule that every intermediate review must be calculated.
The new incomplete-lane test explicitly leaves `acceptedForScenario` false.
Any later private executor must incorporate these stage expectations and bind a
new source/fixture identity rather than reuse a closed run or its manifest.

`tests/fixtures/swp-demand-period-failures.mjs` reproduces observed numeric values,
periods and provenance kinds using synthetic explanations. Exact original
argument bytes and their verified digests remain private, outside the repository.
Tests use mocked model calls and explicit counterfactual corrected proposals;
they establish no new real-model acceptance result.

```sh
node --experimental-strip-types --test --test-isolation=none tests/swp-demand-period-contract.test.mjs tests/swp-demand-editor.test.mjs tests/swp-clarification-continuation.test.mjs
```

No provider call, deployment, data change, staffing execution or paid-run authority
is part of this change.
