# Staffing budget-period continuity candidate - November 10, 2026

Status: isolated implementation on reviewed base 94492433f87d86cd95ed8e73191521d765a8a59f; not committed, deployed or accepted as a release by this record.

## Behavior

An ordinary request such as "We need 4 nurses within 6 months with a GBP 240k budget by hiring or training" retains the six-month delivery deadline separately from its unknown cost horizon. Answering "12 months" now retains GBP 240,000 as an unconfirmed budget quote, not an active twelve-month ceiling. Chat explains the pending period and directs confirmation to the existing editable planner.

The shared typed edit path applies the same rule, including zero budgets and combined missing-role/horizon entry. Explicit current-turn restatement or clearing is supported; a same-value confirmation records the new provenance. Old turns and model-proposed restatements cannot confirm the period. Filling or changing currency with an existing quote requires explicit current-turn budget restatement or clearing, including a quote that is already pending.

Shared tool feedback exposes the pending amount and period. Shared prose and comparison metadata suppress an apparent recommendation while funding is pending. Existing editor confirmation and saved-plan guards remain in force. Known-period budget behavior, annual/monthly rate rebasing, unknown costs and pools, and readiness/delivery semantics are unchanged.

## Validation and limits

- Ten new offline regression cases cover shared edits, positive/zero funding, confirmation provenance, clearing, role and currency boundaries, chat/editor parity, reload preservation, recommendation/save guards and a mocked typed-model continuation. No real model is called.
- The affected staffing suite passed 102/102 tests across 15 files. Focused ESLint passed, and the focused TypeScript graph reported zero diagnostics. Exact source bytes are recorded in the release manifest.
- Independent review, CI, production build and hosted desktop/mobile acceptance are still required for this candidate. No build or dependency installation was attempted in the low-disk worktree.
- No provider call, account/admission/accounting change, database operation, source-expansion work or Lab/overlay change was included. This record does not establish universal language understanding or operational staffing approval.
