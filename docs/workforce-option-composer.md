# Local option suggestions

This follow-up starts from PR102 candidate `3eb67788258552121a3a8cd8d291b91809243f12` on the separate local branch `fix/workforce-option-composer-20261004`. It does not move the PR102 or PR101 branches.

Home offers Compare all N options, Adjust this option, and Explore more options only when the option panel has a verified current source and usable local handlers. Compare requires multiple displayed options. Busy, temporary-draft, historical, unsaved and unavailable contexts remove action offers. Exploration opens the existing confirmed bounded-search flow; it does not promise another eligible result.

Choosing a suggestion only drafts its exact label and captures an in-memory generation and goal identity. The registered handler is bound to the selected option, saved result, complete source/alternative-history identity and comparison order. Explicit Send dispatches locally before Home's ordinary model request path. Compare opens/focuses the existing table; Adjust opens the captured option's existing temporary editor; Explore opens/focuses search bounds. Search, review, replacement and saving keep their separate explicit controls.

The bridge and action acknowledgments are never included in model payloads or transport history. Existing goal requirements, approvals and plan records are not changed by these actions. Home's automatic takeaway remains paused through local staging/completion so clearing a successful command cannot start a model request. Ordinary questions retain the existing request path and payload shape.

## Stale text and draft behavior

Occupied drafts are not overwritten, including queued input updates. Changed goal/result/alternative history or selected option invalidates staged commands; direct store subscriptions catch a batched goal A-to-B-to-A transition. A consumed command cannot execute twice. Reloaded or typed action labels have no trusted capture and require choosing a suggestion again.

Editing a staged suggestion invalidates it, even if its original text is later restored. Send keeps the text and explains the problem; it neither changes target nor falls through to AI. The intentional UX cost is that users must clear and reselect after an edit or context change, or clear and write a normal question. Existing goal rename/delete behavior still clears the goal-owned draft. These three commands are exact staged actions, not a new natural-language intent parser.

## Validation

502 unit tests passed. 264 browser assertions passed: 52 integrated composer/action checks, 30 existing contextual-prompt checks, 120 option-card checks and 62 journey checks. Full lint, TypeScript, production build and diff whitespace checks passed. Fixtures intercept all network traffic; no live service/model call was made.

Coverage includes explicit keyboard Send; actual two/three-option labels; no effect at suggestion click; unchanged saved solution/approval and model-history data; current-option Adjust; retained adjustment drafts; Explore without implicit search; edited/restored command rejection; missing overview evidence; stale result/history/version; goal roundtrip; queued ordinary drafts; normal chat request shape; focus and mobile overflow. Bridge unit checks cover replay, stale-owner cleanup and unavailable actions.

Logs: `/tmp/option-composer-final-*.log`.

Screenshots: `/tmp/workforce-option-composer-IdhM7I/`, `/tmp/contextual-prompts-3WcDpg/`, `/tmp/workforce-solution-cards-1SVgRL/`, `/tmp/workforce-journey-olB0cu/`. The integrated mobile screenshot was visually inspected.

Publication is intentionally held for integration review. PR101 also edits Home's composer copy/layout; any integration must preserve its approved placeholder and responsive sizing while retaining this branch's input handler and Send gate. Hosted acceptance applies to PR102's unchanged candidate, not this unpublished follow-up.
