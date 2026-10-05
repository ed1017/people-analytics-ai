# Frozen synthetic workforce generation protocol v1

This protocol is committed before running the new generator or evaluating models.
The executable configuration is `lib/ml/synthetic-workforce/protocol.json`.
All five scenario families and seeds 17, 29 and 43 are retained. No seed or family
will be chosen on observed forecast performance. Development origins end December
2024, March 2025 and June 2025; the fixed assessment origin is June 30, 2026, for
July–September outcomes. October–December 2026 remains a separately marked reserve.
The final administrative scoring cutoff is July 1, 2027. These are generated
holdouts, not independent source observations or real-world validation.

This is a **new synthetic experiment**, not recovery of the existing dataset.
The source dataset, prior fixtures and model outputs remain unchanged. No database,
application route, person-level model input, employment score or production write
is introduced. The fixed run timestamp is reproducibility metadata, not historical
availability. Every release uses `simulatedAvailableAt`; `sourceObservedAt` stays
null. Ground truth is stored separately from as-of releases and is never exposed
through the replay function.

Recovered construction evidence is attributed to local preserved commit
`c9ace41` in the recovered-construction-provenance worktree. It reports an initial
headcount anchor of 8,400 and the snapshot membership convention: hires on a date
are included; departures on that date are excluded. Those conventions are reused.
Partial engagement scoring evidence uses 1–5 answers and favorable values 4–5,
with mean respondent favorable-answer shares. This arithmetic is reused with a
new explicitly declared complete instrument. The exact original recipe, BU/key
allocation, former-employee entry dates and historical reporting times remain
unrecovered; this experiment does not claim to reconstruct them or match existing
monthly counts, the 10,000 final headcount or 5,080 survivor-selected hires.

New assumptions: one company-wide population, aggregate monthly opening cohorts,
all external actual starts feeding workforce entries, daily stock/flow exposure,
quarterly comparable survey waves with explicit nonresponse, deterministic seeded
sampling and independent domain streams. No employee identifiers are emitted.
Existing survey wave dates are historical facts about a different fixture; adding
quarterly waves here is a simulation assumption, never a recovered source history.

Scenario families: stationary; gradual improvement; reversal at July 2026;
reporting stress with partial/missing releases, delays and revisions; and an
explicit survey instrument break. All families retain cancellation, unresolved
hiring cohorts, true zero, missing and complete-period examples. Future outcome
fields must not leak into earlier releases. Unknown and suppressed values remain
null; true zero requires explicit generated-universe completion. Rates may use
simulated person-time only when exposure completeness is available at the cutoff.

The staged checkpoint will prove reproducibility, aggregate accounting, release
chronology, revision selection, censoring/maturity and survey comparability. It
will not fit/select a new model, estimate causal effects, report efficacy or add
an uncertainty interval. The next integration is an explicit offline adapter into
existing aggregate evaluators, preserving their input boundary and reporting all
frozen scenarios; the operational source remains unqualified.
