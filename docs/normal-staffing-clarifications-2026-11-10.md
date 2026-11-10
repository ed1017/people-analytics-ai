# Normal staffing clarification replies

## Scope

Continue the normal planning improvement after PR 578. A short answer to the active missing-role, cost-horizon or currency question can now update that one missing field and advance to the next question. Examples: Clinical nurses, 12 months, Use GBP. The same editable planner and existing provenance validation are retained.

This is a bounded conversation shortcut, not general language understanding. Familiar profession labels are recognized; uncertain or unfamiliar labels, extra instructions, calendar deadlines, currency symbols and corrections use the full typed conversation. A cost period never replaces the delivery deadline. The shortcut is unavailable for saved goals, other planning contexts, priced drafts, stale questions and foreign dataset/scope bindings. It does not save or execute a plan and does not invent costs, pools, release or readiness.

## Verification

- Regression tests cover sequential role/period/currency answers, exact source quotes, one-field changes, state roundtrips, separated delivery, ambiguous input, other contexts, priced inputs, scope mismatches, aborts and failed-provider preservation.
- Focused intake/routing suite: 25 tests passed. Broader related staffing, cost-basis, guided and continuity suite: 57 tests passed before the final conservative role-grammar refinement; affected tests were rerun afterward.
- Focused ESLint passed. Direct release-source TypeScript is blocked by existing omitted runtime-only headcount experiment files; full restored-runtime build and TypeScript remain release gates.
- Initial browser QA used the unchanged PR 578 built UI and the current real public route with a hard provider-deny factory. Six continuation/draft cases passed at desktop and phone widths, including reload between replies, editable changes, ambiguous deadline replies and preservation after a denied full-model fallback. Guided four-step comparison/select/review/save also passed at both widths.
- Independent review caught uncertain role-prefix interpretation. The final grammar limits the deterministic role branch to known professional modifiers and profession heads; unfamiliar prefixes fall back to ordinary conversation.

Before promotion, require independent final review, exact-commit CI, restored-runtime production build/TypeScript, unchanged runtime-input verification and staged health checks. Preserve the current production deployment as rollback. No paid provider calls were made, so live-model interpretation is not newly verified. No data, provider, ledger, budget or pricing changes are included.
