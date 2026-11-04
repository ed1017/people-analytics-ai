# October roadmap acceptance — 4 November 2026

## Scope and outcome

The agreed next item after PR558–560 was acceptance of the complete October hiring-manager journey and deterministic answer correctness. Public desktop (1440px) and mobile (390px) each passed nine workflow groups on the existing October runtime. No product defect was demonstrated, so this patch changes tests and documentation only; no runtime deployment or database mutation is required.

Independent review of the association tests passed, including a separate 8/8 execution. The combined association/annual/quarterly checks passed 27/27. Root focused association/quarterly execution passed 13/13. A broader local suite was interrupted after executor responsiveness degraded and is not counted as passed; exact-commit CI remains the publication gate. Local manifest walking encounters a pre-existing node_modules junction; tracked-file hashes are refreshed and clean-checkout verification runs in CI.

## Repeatable public journey

Use a fresh isolated browser, open Overview, choose Explore on my own, then Talent inventory. Keep October inventory; filter Frontend Software Engineer and vacant, all locations. Select these two explicit modeled vacancies:

- MODEL3-BU-CORP--SWE-FRONT--L7--0002 (Germany)
- MODEL3-BU-DATAAI--SWE-FRONT--L4--0008 (Canada)

Plan selected vacancies. For this QA example only, set cash budget $100,000, horizon four months, annual compensation $163,176, hire fee $6,000, hire arrival month two/readiness month four, redeploy readiness month one, training readiness month four, training fee $2,500, repurpose cost $2,000, training hours 80 and time value $50/hour. These are explicit test assumptions, **not local pay benchmarks or available-employee evidence**. The app correctly declines adopting a single-country pay reference for this mixed-country selection.

Save two hires, then one hire/one trainee, then one hire/one redeployment, with assumed donor release one FTE. Compare original versus redeployment: $93,588 versus $48,794 cash, both under the assumed ceiling; target capacity two FTE in both; company-wide net capacity two versus one, donor source-work gap zero versus one. The original retains its unused-route/readiness labels. Change horizon to five months and save revision two without replacing prior revisions.

Track saved positions: cancel goal creation and verify no changes; confirm once (including repeated click) and verify exactly one goal plus retained exploration. Choose the exact latest revision. Cancel target review, then save. Record an explicitly manual, unverified 1.5 FTE test result against a two FTE target, as of November 1; this tests the comparison, not a real realized outcome or validated target schedule. Review displays 0.5 FTE below. Reload and browser Back/Forward preserve state. Download native backup; cancel restore without changes; explicitly restore and reload, preserving all workspaces. The isolated test-browser data never modifies a user's saved workspace.

Both widths passed all nine groups, with HTTP 200 document responses, no page errors, no blocked attempted model calls, and drained teardown. Mobile table scrolling and page overflow were checked. Machine-readable receipts: [acceptance results](data/october-roadmap-acceptance-2026-11-04.json). Desktop comparison pixels were inspected. Original QA harness and screenshots remain local under integration-evidence/hiring-manager-journey-october-audit-*.

## Answer regression and limitations

The retained engagement survey closed September 30; current turnover runs January 1–October 31. Production already states both measurement windows. The old test fixture incorrectly assigned the workforce cutoff to the survey. The corrected current-source fixture and root CI wrapper test the actual contract, reject falsely redated survey/stale attrition, and confirm reads do not mutate inputs. No historical pinned fixtures or production calculations changed.

This is deterministic UI, persistence and constructed-answer acceptance, not fresh paid-provider answer-quality testing. Old MODEL2 compatibility remains covered by existing historical-inventory CI; this browser run exercises MODEL3, not a relabeled September backup. No API budget, credentials, public tables, external source dates or saved-user data changed.
