# Complete missing roles in budgeted staffing requests

A normal staffing request can specify a budget before naming its role. The next role reply and the editable Required role field now accept that missing role while retaining an explicitly denominated budget, including zero. This corrects the PR578/579 flow that asked for a role but kept its shortcut and local control guarded.

The role and currency checks are separate. Role entry remains unavailable when a quoted rate, internal pool, training, release, readiness or cost-completeness premise already depends on that identity. Currency entry still requires review of all retained cash amounts. Existing role/currency changes, saved-goal chat contexts, scope/dataset mismatches, stale questions and uncertain replies keep their existing guards. No costs, pools, currency conversion, operational verification or saves are inferred.

Local role-only completion preserves the original budget quote and its period, including a pending period reconfirmation. The budget's source provenance does not become a role-edit quote. The concise chat path still excludes cost-basis-bearing reviews and falls back to the existing typed conversation.

Verification before staging: independent code review clear; 36 intake/routing/presentation tests and 23 related cost-basis, save and guided-flow regressions passed; focused lint and exact source-manifest verification passed. Final release gates remain exact-commit CI, restored-runtime build/typecheck, unchanged runtime-input verification, desktop/phone workflow acceptance and staged health checks. No paid provider calls, data/accounting/provider-setting changes or live-model acceptance are included.
