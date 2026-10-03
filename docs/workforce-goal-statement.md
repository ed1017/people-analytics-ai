# Explicit current-goal copy into a temporary planning statement

Priority 2 follows reviewed priority-1 checkpoint `c84fb17d4dfa21998154a12b5ef1e25023fef3f5`, published normally to `cloud-input-readiness` and verified through Git. This slice is local only.

`Use current goal as planning statement` copies exact text only after an explicit click. A blank field copies directly. Any nonempty text, including whitespace, opens an inline replacement confirmation with the proposed text and a Keep action. Cancelling preserves the text and returns focus to the trigger; confirming focuses the statement. Repeating an already-identical copy is a no-op. The statement has a stable accessible name after programmatic population.

Confirmation is temporary and consumed once. Typing invalidates it even if the user later restores the previous text. Current goal/solution/version/input identity and selected calculation are re-read before acceptance; store subscriptions invalidate even a batched goal A→B→A transition. Goal wording or version changes cancel confirmation without replacing existing statement text. Unsaved numeric edits, pending calculations and unbound goal wording block copying. Normal goal switching/reload do not retain a temporary statement or confirmation; existing saved inputs, approvals, owner and history remain untouched.

No goal-to-number extraction, autofill of assumptions, model/API invocation, storage field, calculation or approval was added. Copying invalidates an existing clarification proposal just as manually editing the statement does; the separate AI action remains explicit. No changes were made to the clarification route, model envelope or parent-run live validation.

Validation: 421 full unit tests; 44 new goal-copy browser assertions plus 48 readiness and 245 existing workflow assertions (337 total); full lint, standalone TypeScript, genuine production build and whitespace checks pass. New browser cases cover blank/nonempty/whitespace, cancel/confirm, keyboard focus and departure, repeated clicks, editing/reverting, unrelated updates, goal/version/evidence changes, unsaved/pending guards, reload preserving actual storage, and 1366px/390px layouts. All browser API requests were blocked or synthetic/intercepted. Actual Windows/Android and live AI remain separate gates.

Logs: `/tmp/goal-copy-{unit,lint,ts,build,browser,readiness,workspace,search,handoff,selection,lifecycle}.log`; new screenshots `/tmp/workforce-goal-copy-WfdLuE/`. No browser file-policy retry or settings/security change.

The next user request supersedes the earlier standalone priority-3 Decision Brief summary proposal: compact preferred/alternative solution cards, local what-if recalculation with explicit revised-solution save, and pins referencing exact saved solutions. No card/pin product implementation is part of this commit; its bounded contract is reviewed next.
