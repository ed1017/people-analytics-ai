# Action Plan context diagnostics

This change builds on the user-goal resolver checkpoint `08541ac` and selected-plan edit checkpoint `d1daf71`, stacked on PR143. It does not establish the cause of the reported hosted reload staleness; no hosted before/after evidence packet was observed.

The existing **Why these plans** disclosure now classifies goal, evidence and planning digest changes. A bounded source comparison distinguishes availability changes, unordered detail-row permutations, and content/scope/date/selection/meaningful-order changes. Reviewed local attachment transitions are identified separately. Only fixed labels are displayed; no goal text, source values, payloads or digest strings are added to the diagnostic.

New explicit preparations persist three bounded hashes alongside their binding. Older saved preparations remain readable in their original ordered comparison mode and honestly report that the detailed baseline is unavailable. Reload never rewrites or migrates a preparation. A later explicit preparation adopts the new comparison mode. No extra model request or automatic regeneration is added.

For new preparations, the fingerprint sorts the retained categorical rows of W2, A1, S2, T1–T4. It preserves which rows were sampled, duplicates, source status, dates, scope, coverage and actual values. Chronological W1/R1/S1, scenario P1, selected quotes I3 and Development options D1 keep meaningful order. I2 already uses a fixed normalized series order, which is preserved. The actual model packet and displayed evidence are unchanged; this projection is used only to compare local plan context.

Existing attachment receipts and projected destination comparisons use the preparation's comparison mode. A reviewed local transition can still validate its original preparation after reload. External evidence or unrelated planning changes remain stale; immutable attachment history and manual destination values are preserved.

## Verification

- 1,301 unit tests pass (1,242 top-level and 59 synthetic-workforce tests). New tests cover canonical permutations, real changes, meaningful order, legacy records, bounded/tampered metadata, safe display labels and labor-market normalizer compatibility.
- Production build, TypeScript, lint and whitespace checks pass.
- 738 browser checks pass: intent matrix234, numbered edits45, context staleness51, linked-context staleness21, unified attachment117, exact AI-skills flow36, rejected discovery72, Pin boundaries45, accepted planning context21, preparation resilience45 and goal context editor51. New intercepted browser tests cover exact goal → Pin → local chat edit → Apply → reviewed attachment → reload → goal switch/return, unordered row changes, content/availability/planning changes and exact restoration. A separate current-UI test covers reviewed Development/workforce field writes, atomic receipt/history persistence, reload validation, preserved manual values and external evidence staleness.
- Browser sizes are 1366×900 desktop, 390×900 mobile and 683×450 for 200%-equivalent reflow. Existing user-intent, numbered-plan edit, unified attachment, malformed-discovery, context-editor and resilience suites also run against the production build. Every API response is intercepted and synthetic; tests make no live model requests.

The old `home-linked-attachment.mjs` browser script uses removed controls. Its obsolete selector failure was not treated as a product regression; the new `home-linked-context-staleness.mjs` exercises the relevant current UI, while existing linked-attachment unit tests retain receipt/conflict/storage-failure coverage.

The hosted rehearsal still needs a fresh, explicitly authorized retest on this exact preview. The new diagnostic can identify the changed dimension; it does not retroactively prove the original cause.
