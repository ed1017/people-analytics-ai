# Attrition analysis consumer integration

This local change consumes the tested three-domain analysis result in the existing
Attrition **Synthetic count example → Source, version and reproduction** disclosure.
Hiring and satisfaction are explicitly separate demonstrations that do not inform
the exit estimate; **Methods and evaluation** contains turnover methods only. The
default collapsed surface and existing turnover output are unchanged. No Home,
navigation, source, model, database, eNPS or plan-persistence file is changed.

The browser imports a 10 KB projection, not the producer or full analysis report.
It displays all nine hiring comparisons at four decimal places, four losses of
the selected rule against fixed logistic, and all seven abstentions. Brier scores
binary start/non-start outcomes across aggregate openings. Satisfaction remains
descriptive: three irregular waves, response denominators, two signed changes and
assumption-dependent nonresponse sensitivity bounds. These are not confidence
intervals, forecasts or within-person changes. No result is adopted as a plan
baseline. Goals and filters do not narrow these fixed demonstrations.

Operational forecasts remain unavailable. The previously qualified demo history
contains 32 event-bearing months, excluding January 2024's unverified join zero.
Source completeness, historical availability and generator provenance remain
unverified; neither a rate denominator nor calibrated uncertainty is established.
The original conditional count remains 201 additional exits, with recorded
subtotal 605 and conditional full-year total 806. See
[source qualification](aggregate-exit-forecast.md).

## Evidence and failure behavior

`tests/helpers/analysis-display-projection.mjs` projects the existing public
consumer result without changing model outputs. The regression test reproduces
that result, checks its full committed artifact, and checks the browser projection.
All three source identities and the full analysis identity are retained; the
canned plan's target and binding are omitted from display semantics.

Browser validation checks exact equality with the shipped reviewed projection
and the existing turnover method/fingerprints. It establishes artifact coherence,
not live freshness or source truth. Missing, changed or inconsistent display
evidence removes all new numeric comparisons and shows a recovery status. The
independently checked original turnover example remains available.

## Dependency and release handoff

Published source branch: `feat/attrition-analysis-integration` at
`44394f70a232a39c81f56ba86cd1b065022704c9`.
Consumer prerequisite: `038ae4867dc631affa9e0c10ecd6ae993ca974f8`
(`feat/analysis-demo-consumer`), including its existing offline ML prerequisites.
The corrected combined branch is `integration/analysis-demo-pr129`, based on exact
PR 129 head `7d2d2d9b723a822720b70645ad9f003575670e05`, with the published source
branch merged locally. Both source branches are preserved. No main merge or
production release is included.

Read-only refs inspected for this handoff:

- main: `e50b31555a187a9b730827dfda470975f5085501`.
- PR 129: `7d2d2d9b723a822720b70645ad9f003575670e05`.
- Common ancestor with PR 129: `d3f8f9d200c20fe426f3e6ebf52049728f9afe37`.

The original Attrition page and count-example component match PR 129 at those
heads, so this insertion does not overlap its edits. PR 129 changes
`lib/home-bundle-reconciliation.ts`, which participates in the analysis producer's
implementation fingerprint. The combined branch regenerates the unified and display artifacts against that
exact PR 129 head. Assertions confirmed identical turnover, hiring and satisfaction
model payloads before writing either artifact. Only implementation/result identity
fields changed: full analysis identity is now
`3179a661882157c30cd3afd10d0ac68b1acfd6d6562923f9874402ea816eadcd`.
If the release owner adds a later Home fix that changes hashed producer inputs,
regenerate the unified artifact through the existing public producer, assert
unchanged domain payloads, and project it with `projectAnalysisDisplay` again. Do not accept old
identity values or relax the equality check to bypass integration drift.

The old foundation ref `feat/aggregate-exit-forecast-foundation` and object
`b62df6ff778d65ba29cd466e28abdaec2cb59434` are absent from this repository. This
integration uses the verified existing consumer history and does not claim to
have recovered that foundation commit.

## Local verification

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
node tests/browser/analysis-demo-display.mjs
```

The browser fixture compiles the real app stylesheet and imported production
component, without introducing a product route. It exercises collapsed/expanded,
altered hiring, stale satisfaction, missing evidence, and missing/stale source
readiness at desktop, 390px, 320px
and a 200%-zoom-equivalent viewport. It checks keyboard access, semantic table
headers, contained scrolling, automated WCAG A/AA rules, original count retention,
no horizontal page overflow, no new network requests, no storage writes and no
runtime errors. Screenshots are emitted to the reported temporary directory.
This is component integration verification, not a live source or production test.

Astra/high reviewed the design and implementation. Its Brier-description
correction is included. No substantive review blocker remains.

Combined verification: 1,159 unit tests and 102 browser checks pass. Full ESLint
and the optimized Next.js 16.3.6 production build pass. The build uses inert,
explicitly supplied API placeholders and does not validate live source access. Dependencies are local to this worktree because Turbopack rejects
the shared dependency symlink. Home and shared navigation match the exact PR 129
base; original model outputs, disabled eNPS and held SQL/contracts are unchanged.
