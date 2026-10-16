# Simplified guided decisions

The fictional service example starts with a business question and the actual common-scale gap: 8 FTE of work, 3 qualified allocated FTE, and 5 additional FTE. Ten existing people remain a separate assumption. Compare staffing options runs the same bounded local staffing engine; cards retain calculated incremental cash, readiness and whole-period uncovered workload.

The three stages are Understand the gap, Compare options, and Save and review. Assumptions and detailed calculations are collapsed. Two linked primary controls update the current unsaved draft; advanced changes still require explicit review. Interactive volume round trips retain the last reviewed search limits, capped to current demand without enlarging pools. All displayed primary values must be valid before comparing or reviewing a choice.

Ask about this opens existing chat without sending or clearing its draft/history. Saved plan/goal transactions and Track retain their existing semantics. Future of Work also starts with results, with three primary controls inside Adjust assumptions and the remainder under Edit detailed assumptions. Scenario handoff still requires review and explicit replacement consent for an occupied draft.

Regression tools:
- `node --test tests/simple-swp-controls.test.mjs tests/guided-workload.test.mjs tests/guided-demo-release.test.mjs tests/future-work-example.test.mjs`
- `tests/manual/simple-swp.browser.mjs`: 1440 and 390 pixel gap, chat retention, live edits, mixed validity, advanced review, save/reopen/Track checks.
- `tests/manual/future-work.browser.mjs`: collapsed summary plus linked controls, invalid input, cancel/replace and saved origin checks.

Browser harnesses block network writes and AI calls and use isolated local browser state with public synthetic fixtures. They do not activate populations or change a database. Local results and hosted evidence are recorded in the PR; a Ready deployment alone is not a Preview interaction pass.
