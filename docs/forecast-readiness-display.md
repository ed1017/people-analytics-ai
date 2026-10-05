# Forecast readiness beside the existing count demo

The existing `SyntheticExitCountExample` now consumes the offline result from `exitForecastForConsumer()` through a generated browser-safe artifact. The generator calls the real local consumer entry point, which reruns the existing source-metadata readiness checks and evidence evaluator. No source fixture, evaluator, filesystem access, database client or model call enters the browser path.

The collapsed summary reads **Operational forecast unavailable · conditional synthetic example only**. The existing count cards retain their original distinct labels: recorded subtotal 605, conditional remaining-year estimate 201, conditional full-year estimate 806. The existing “Source, version and reproduction” disclosure includes the exact missing-input lists for turnover, satisfaction and hiring. No new page, broad panel, Action Planning integration or shared navigation change is included.

The browser projection compares the consumer result with its reviewed bundled version and compares its preview with the existing preview artifact. Missing, malformed, stale or altered evidence withholds the count cards/tables and presents a concise explanation; the existing source disclosure gives a regeneration instruction. No absent value is rendered as zero. Unit coverage confirms a separately reviewed matching zero is preserved. The actual captured source remains blocked; a supported metadata contract still cannot establish operational forecasting.

## Offline generation and freshness boundary

```sh
node tests/manual/generate-forecast-consumer-view.mjs --write
node tests/manual/generate-forecast-consumer-view.mjs --check
node tests/manual/generate-exit-demo-presentation.mjs --check
node tests/manual/predictive-evidence-checkpoint.mjs --check
```

`--write` updates only `lib/data/forecast-consumer-view-v1.json`. Existing reports, original evaluator, PR126 head and all source/evidence branches are preserved. The generated view reproduces exactly from the available local metadata, whose completeness and availability remain unknown. Run the checks with the intended source head before integrating/building. The browser cannot inspect repository code or detect a source change that has not been built into its deployment; no live freshness or historical provenance is invented. The full test suite checks regeneration against current source bytes and fails if the artifact is stale.

The optional component `consumer` prop is an injection seam for a cached result and failure-state tests; it does not create a new fetch, persistence mechanism or model input. Production uses the checked-in artifact. Equality is conservative: even harmless serialization differences can withhold a cached result. Hashes are reproducibility identities, not authentication.

## Observed local validation

- 1,020 repository unit tests passed, including five display/artifact tests. Existing seven consumer tests cover actual metadata, contradictory flags, zero/null, revisions and stale evidence.
- TypeScript and targeted ESLint passed. An optimized Next Webpack production build passed using synthetic placeholder service configuration; no service query or model call was performed. Default Turbopack could not build with the existing cross-worktree `node_modules` symlink, so Webpack was used without changing product configuration.
- 30 component browser checks passed at 1366×900, 390×900 and 683×450 (zoom-equivalent layout, not physical-device or OS zoom verification). These used the actual component and current production CSS. They observed default collapse, keyboard expansion, distinct unchanged totals, hidden-until-expanded domain gaps, stale/missing-result withholding and recovery copy, no page overflow and no runtime errors/network work. A test-fixture charset omission found during screenshot review was corrected and the suite rerun.
- 63 existing full-shell browser checks passed against the optimized local app, with intercepted synthetic page APIs. Filters/goals did not alter the fixed example; source API failure did not promote it to live evidence; reload restored collapse; no forecast/planner writes or model/external calls occurred. Horizontal method tables retained keyboard scrolling on narrow layouts.
- Browser source-boundary checks found no raw exit fixture or Node evaluator in the component bundle. Existing source reports and preview reproduce unchanged.

Commands for browser reproduction after `next build --webpack`:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/forecast-readiness-display.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs HOME_BASE_URL=http://127.0.0.1:3174 node tests/browser/synthetic-exit-count-example.mjs
```

Screenshots were inspected locally. Full-shell evidence: `/tmp/synthetic-exit-example-oCPhhZ`; the component runner prints its new temporary evidence directory on every run. These are local evidence, not published artifacts.

This branch starts at consumer head `49f505c3f404860b19ee3437c4fd54988b919acf`. The next step is parent review/integration of this isolated display branch and a fresh artifact check at the combined head; no push or release was attempted. Source qualification still requires the provenance/completeness/availability evidence in the existing investigation.
