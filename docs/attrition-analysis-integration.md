# Attrition analysis consumer integration

This local change consumes the tested three-domain analysis result in the existing
Attrition **Synthetic count example → Methods and evaluation** disclosure. The
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

Local branch: `feat/attrition-analysis-integration`.
Exact parent: `038ae4867dc631affa9e0c10ecd6ae993ca974f8`
(`feat/analysis-demo-consumer`), including its existing offline ML prerequisites.
This is a separate local integration commit; no main merge or production release.

Read-only refs inspected for this handoff:

- main: `e50b31555a187a9b730827dfda470975f5085501`.
- PR 129: `7d2d2d9b723a822720b70645ad9f003575670e05`.
- Common ancestor with PR 129: `d3f8f9d200c20fe426f3e6ebf52049728f9afe37`.

The original Attrition page and count-example component match PR 129 at those
heads, so this insertion does not overlap its edits. PR 129 changes
`lib/home-bundle-reconciliation.ts`, which participates in the analysis producer's
implementation fingerprint. The release owner must first combine the prerequisite
consumer/ML branch with PR 129, then regenerate and review the unified artifact
with the existing `action-plan-analysis-demo.mjs --write` entry point. Project
that freshly checked result using `projectAnalysisDisplay` and replace only
`lib/data/analysis-demo-display-v1.json`; rerun the checks below. Do not accept old
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
altered hiring, stale satisfaction and missing evidence at desktop, 390px, 320px
and a 200%-zoom-equivalent viewport. It checks keyboard access, semantic table
headers, contained scrolling, automated WCAG A/AA rules, original count retention,
no horizontal page overflow, no new network requests, no storage writes and no
runtime errors. Screenshots are emitted to the reported temporary directory.
This is component integration verification, not a live source or production test.

Astra/high reviewed the design and implementation. Its Brier-description
correction is included. No substantive review blocker remains.
