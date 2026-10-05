# Local forecast context for Action Plans

This sidecar is implemented against read-only PR129 head
`d3f8f9d200c20fe426f3e6ebf52049728f9afe37` (inspected main:
`e50b31555a187a9b730827dfda470975f5085501`). It changes no Home UI,
navigation, database, persisted plan contract, or model input boundary.

## Entry and integration points

Use `planForecastContext(draft, domain)` from
`tests/manual/plan-forecast-context.mjs` in an offline local integration. It
re-executes `exitForecastForConsumer`, which runs the existing readiness and
domain evaluation adapters. It accepts only the existing `BundleDraft` and a
domain (`turnover`, `hiring`, `satisfaction`); there is no qualification override.
`composePlanForecastContext` is internal composition, not an external model-output
ingestion API. Hashes detect changed content; they are not source attestation.

The result binds to `bundleInputKey(draft)`, complete evidence identity and the
sidecar implementation identity. `readCachedPlanForecastContext` regenerates the
whole result and rejects any cache mismatch, including plan, goal, revision,
source, method, interval or assumed target changes. Do not render a stored result
as current without that check. The Node runner is not a client component import.
A future browser projection needs a separately reviewed artifact/freshness path.

`planAssumptions` copies the existing what-if and success-measure inputs verbatim.
`forecastBaseline` is always null for the current producers; `interventionEffect`
is always not-estimated, with null estimate and interval. There is no adoption,
target subtraction, avoided-exit calculation, probability, savings or ROI method.
Existing `calculatePlanWhatIf` remains conditional assumption arithmetic.

The only eligible numeric *reference* is the current retrospective synthetic
exit-count demo, when an existing success measure is exactly `Voluntary exits
(count)`, its goal and measurement scope match the draft, population is exactly
the source identifier `all-recorded-voluntary-separations`, no BU/job restriction
is present, and the plan covers the exact October–December 2026 demo horizon.
This narrow binding avoids silently interpreting free-text names as metrics or
claiming that a companywide count describes a subgroup. It does not verify the
user's scope assertion or make the source operationally qualified.

The reference carries source provenance, method/version, dataset/protocol
identities, baseline comparisons, evaluation custody, assumptions and unavailable
uncertainty. Home's turnover-rate and capacity what-ifs cannot consume this count
reference. Hiring and satisfaction retain their domain-specific unavailable
evaluation and missing-input details. Unknown uncertainty is never a zero-width
interval. Reference eligibility and operational forecast qualification are
different statuses; no current domain is operationally qualified.

## Evidence still required

Recovered construction evidence narrows provenance but does not close readiness
gaps. The source has 33 snapshot months and 32 usable event-bearing months; the
bulk September 2026 creation times do not establish historical availability.
Recovered deterministic formulas and planted BU survey shifts do not establish
prediction efficacy or intervention effects. External fills selected from active
synthetic survivors do not represent complete historical opening cohorts.
The recovery record is preserved separately at local documentation commit
`c9ace41df024c4fb186e32ebf4da05b88597a799`; it is not substituted for executable
generator evidence in the consumer.

Before accepting a qualified producer here, supply and review:

- Counts: scoped monthly completion, event-empty-month reconciliation, observation
  and revision vintages, and complete generator/version lineage or verified source
  extraction. A rate additionally needs the correct exposure denominator and
  future-exposure assumptions; entered plan population is not that denominator.
- Hiring: all opening cohorts, cancellations and unresolved cases, status/actual
  start follow-up and cutoff coverage, without survivor selection.
- Satisfaction: comparable eligible waves, versioned items/scoring, respondent
  and eligible denominators, missingness and suppression review.
- Evaluation: reproducible generator/source history, training-only selection,
  temporal holdouts and independent calibration sufficient to justify intervals.
  The existing final-data assessment has already been inspected.
- Causal effects: separate identified comparison/intervention evidence. Predictive
  validity alone cannot justify an assumed action's effect.

A future qualified adapter must extend this interface through review rather than
setting a boolean on the current consumer. Next integration step is for the Home
owner to choose how unavailable context and a separately labeled count reference
should appear; no UI integration is part of this local commit.

## Validation

`node --test tests/*.test.mjs`: 1,085 passed, including eight sidecar tests.
`npx tsc --noEmit`, focused ESLint on the three new JavaScript modules, both
existing forecast artifact checks, and `git diff --check` passed. This is an
offline contract change; no browser behavior, live source access, or operational
model efficacy was validated.
