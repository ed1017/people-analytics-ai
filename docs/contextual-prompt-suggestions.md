# Context-aware question examples

Local review candidate based on reviewed cumulative checkpoint `1f068eda8d6d1733860d2f709e7bcc19f1bb8664`. This slice does not include the separate hiring-fixture preflight candidate.

## Behavior

- Home has one small set of examples instead of the three competing start choices and an additional exploration menu. Selection fills and focuses the existing question composer. Send remains explicit. The contextual goal-reply buttons also draft rather than send.
- Examples use the selected goal, current page, conversation stage and available evidence. Home considers normalized source status and finite numeric evidence; missing or unknown goal evidence yields a question about gaps. Zero remains a known value. Unsupported/read-only pages have no examples.
- Analytics examples ask about recorded patterns, scope and unknowns. Planning examples ask about assumptions and modeled costs. Forecast-oriented goals explicitly identify the validated forecast as unavailable. Nothing suggests employee-level decisions or equates candidate pools/career interest with assignable capacity.
- The existing workforce Continue control keeps its stage-specific behavior and now includes practical examples for reviewing proposed inputs, adjusting assumptions, comparing temporary alternatives, or inspecting saved calculations/pinned versions. It still only opens/focuses existing controls.
- An unfinished question disables example replacement. Goal/stage/evidence updates do not overwrite it. Drafts use the existing browser conversation persistence; no new storage format or solution/approval save is introduced.
- Workforce and Skills keep the CSV example. It now drafts the export request; explicit Send invokes the existing local aggregate export. Unsupported pages no longer advertise that export.

No new navigation, remote lookup, model invocation, calculation, solution save or approval is attached to a suggestion. Existing automatic goal takeaways are unchanged and are accounted for separately in browser tests.

## Feedback applied

The recorded Home feedback in `docs/build-decision-log.md` asked for concise examples, preserved goal/horizon context, no invented cost/impact claims, and less competing navigation. The newer request supersedes the previous immediate-send starter buttons. The existing main composer wording and explicit workflow actions remain.

## Validation

`node --test tests/*.test.mjs`: 485 passing tests, including five new selector tests. ESLint, standalone TypeScript and genuine Next production build pass.

`tests/browser/contextual-prompts.mjs` uses the real Home and side-panel components, synthetic fixtures, and intercepted local requests. Its 24 assertions cover keyboard focus, desktop/mobile layout, goal/stage changes, missing/all-unknown evidence, protected drafts, restored goal drafts, and no suggestion-triggered model/calculation/solution-save/approval effects. Existing automatic takeaways are allowed to settle before measuring suggestion effects.

The full browser regression run passed **637 assertions**: 24 new contextual-example checks and 613 existing lifecycle, handoff, intake, readiness, journey, worker-search, selection, pending-cleanup, solution-card, built-app and portable-fixture checks. Browser coverage is Linux Chromium with desktop and Pixel 7 emulation where configured; this is not Windows Chrome or physical Android Chrome validation. Live model quality, live data/agent operation and ML readiness remain unvalidated.

## Acceptance script

1. Select a retention goal with synthetic evidence. Choose a separation-pattern example with the keyboard: it must appear in the focused composer, with no new answer until Send.
2. Edit that draft. Other examples must be disabled. Switch to a skills goal and back; the original goal's draft must return unchanged.
3. With missing/all-unknown goal evidence, check that examples ask what is missing rather than asserting a finding. On a forecast goal, check the unavailable-forecast wording.
4. In the guided workforce plan, review the example beside Continue as you review inputs, calculate explicitly, and compare saved options. Continue must only reveal/focus the existing step. Reopen a saved/pinned version with its existing control; histories and approvals must remain intact.
5. Repeat at mobile width and use Tab/Enter. Check readable wrapping, visible focus and no horizontal overflow. Verify the ordinary explicit Send, Calculate, Save and approval controls still determine execution.
