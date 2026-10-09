# Compact saved goal progress summary

Separate source successor to editor acceptance commit
`3a7c466c6b6b5e359b605bc4722a3b0fb90bf3c3`. The frozen real-AI predecessor and
diagnostic source are untouched. Integration owner
`01a1139b-d5e4-704a-902c-610e54b1e023` owns combined verification; this branch
is a source handoff only, with no merge, startup or deployment.

## Existing records reused

The existing `goalProgressV1` ledger supplies accepted metric definitions,
directions, dated baseline/observations, targets/deadlines, freshness rules,
proposed/accepted milestones and exact saved-plan links. Its existing assessment
adapter supports point-in-time headcount in people, including increase,
decrease, maintain and ceiling directions. Unsupported metrics retain their
saved target but have no fabricated measurements or gap.

The existing plan-alternative catalog supplies proposed owner roles, first
steps and checkpoint assumptions. There are no owner-assignment, execution,
completed-step or actual-next-action fields. These remain explicitly unrecorded;
proposed first steps are inspectable without being presented as the next
unfinished activity. Links must match the selected goal, dataset token, plan
revision, exact input key and evidence digest. Old or unverifiable plan links
remain unavailable rather than being rebound to another plan.

## Resulting view

The existing selected-goal summary now shows six compact cells: baseline,
latest dated measurement, target, deadline, remaining gap and execution status.
Absent observations say **Not yet measured**. User reports stay unverified,
synthetic and recorded observations retain their classifications, and stale
results keep their date and stale label. A missing baseline can still show a
compatible dated report, while its gap remains unavailable. Numeric gaps come
only from the existing assessment adapter and are labelled at their observation
date; a zero gap is not a completed-goal claim.

One action sentence directs the user to the existing normal-chat measurement
update and explicit review/confirmation path when appropriate. Plan roles,
steps, milestones and evidence expand in existing native details controls.
No default forms, new dashboard, chart, storage schema, sharing or permissions
are added. Existing outcome charts remain conditional plan projections, separate
from this measured-results view. Linear references, pace, forecasts and
on-track/behind claims are not displayed. The existing SWP supplemental summary
remains collapsed and reuses the same component.

## Offline evidence

Nine focused unit tests cover all four supported directions; absent, baseline-only,
stale, missing-baseline and unsupported measurements; invalid scope/quality and
scenario exclusion; exact plan linkage; zero gaps and accepted milestones; and the
existing quoted-chat proposal/store path with explicit confirmation, cancellation,
goal switching, repeat confirmation and later reports preserving history.

The standalone synthetic browser host renders the real selected-goal summary
and progress-entry review components. Predetermined fictional interpretations
replace the model only in the fixture; model quality is not claimed. Forty-two
assertions (21 each at 1280×900 desktop and 390×844 touch mobile) cover cards,
plan/milestone separation, unavailable states, switching goals, confirmed and
cancelled updates, repeated-date correction guards, unchanged plan records,
responsive layout, native detail controls and zero runtime/non-fixture network
attempts. Browser Date is fixed to `2026-10-08T13:00:00Z` for reproducibility.
The inherited editor suite also passes its 68 assertions.

The browser workflow fulfills only the exact top-frame GET document navigation
to `http://127.0.0.1:3100/` using generated synthetic bytes, aborting everything
else. No server or file navigation is used. CSP and network guards remain intact;
Chromium policy and launch flags are unchanged. Compilation bundles actual
components with locked dependencies, without Next build/start.

Commands from the repository root, using existing dependencies/Playwright:

```sh
node --experimental-strip-types --test --test-isolation=none tests/goal-progress-summary.test.mjs tests/swp-demand-editor.test.mjs tests/swp-reference-save.test.mjs tests/home-mix-integration.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
node node_modules/eslint/bin/eslint.js components/goal-progress-summary.tsx components/swp-guided-journey.tsx lib/goal-progress-summary.ts tests/goal-progress-summary.test.mjs tests/fixtures/goal-progress-summary.mjs tests/fixtures/goal-progress-summary.tsx tests/browser/goal-progress-summary.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node --experimental-strip-types tests/browser/goal-progress-summary.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node --experimental-strip-types tests/browser/swp-demand-editor.mjs
```

Each browser run prints an OS temporary output directory with component
screenshots and a receipt recording source HEAD/tree, working-tree status,
fixture SHA-256, browser version and assertion names. Final checks run on the
clean committed source. No provider/model/token-count call, diagnostic API
harness, database, credential/billing action, production startup/deployment,
physical device or user desktop is exercised. Full-app, physical-device,
screen-reader and real-AI interpretation acceptance remain separately owned.
