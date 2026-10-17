# Manual capacity: retain early shortages in the period summary

The guided decision shortfall fix in PR289 did not cover the manual capacity projection. Its final-month figures were correctly dated, but readers still had to inspect the chart or monthly table to discover earlier shortages.

The shared projection now states the number of shortfall months, first shortfall and largest known monthly FTE gap. Unknown months are counted separately and cannot produce a full-period coverage claim. Later surplus does not offset earlier shortages. Sub-0.01 positive gaps remain visible. The illustrative demo guidance explicitly labels its existing final-month headline.

The summary reads existing validated monthly points. No arithmetic engine, persistence schema, dataset, AI call or hiring-target conversion changes.

Acceptance: in Scenarios, open Try an illustrative demo and enter four Monthly hires. With the unchanged example inputs, monthly gaps are 7, 4, 1, -2, -5, -8 FTE. Expect three shortfall months starting2026-10, peak7FTE, and the separate final8FTE surplus. Blank workload must show unknown coverage; workload6000 must show no shortfalls; Reset restores six shortfall months.

Local verification:44 focused tests pass (period summary, monthly engine, capacity presentation and saved-scenario storage). Production webpack build including prebuild artifact checks and TypeScript, scoped ESLint and diff checks pass. Independent source review has no actionable findings. tests/manual/capacity-period-summary.browser.mjs passes the acceptance flow at1440px and390px without overflow or page errors. Browser transport blocks non-GET, external and BLS requests; no live model call or stored-data mutation is required.
