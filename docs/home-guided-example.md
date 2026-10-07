# Guided Example and first-run goals

Home has one **Try a guided example** entry under **Show instructions**. The expanded toggle reads **Hide instructions**. Submitting a question or selecting a starter prompt collapses the intro without clearing drafts or goals. Entering the guide also collapses the intro and hides the starter block until the guide closes. Merely having saved example goals does not hide starter prompts in General exploration.

The six guided steps execute real actions: **Next: send example prompt**, **Next: pin demo goal**, **Next: select demo goal**, **Next: prepare example plans**, **Next: select example plan**, and **Next: attach example plan**. Each step advances only after its handler succeeds and the resulting state is verified. The single forward button shows a loading status, disables repeated clicks, and becomes a step-specific Retry action on failure. Back cancels pending work without undoing completed saved work or repeating a successful question.

Opening the guide sends nothing. The first Send opens an isolated temporary exploration while keeping the previous goal, transcript and draft. Pin uses the normal goal-save handler with a new guide-owned ID, explicitly labelled “demo example”; it saves only the example transcript and leaves goal selection to the following step. It does not replace or recreate first-run examples, including deliberately removed examples. Preparing plans is an explicit model request through the ordinary preparation coordinator. Selecting and attaching call the ordinary plan handlers, with their readiness, current-context, storage and conflict checks intact. No models run on guide entry, Back, goal selection, reload or first-run seeding.

Cancel aborts pending work and restores the preceding conversation and draft. A user-selected different goal is respected. Successfully pinned examples and attachments remain saved. A validated tab-local return address restores the preceding conversation after reload. Reload closes the walkthrough and does not resume or replay actions. Re-entering starts a separate explicit example; existing goals and histories remain intact. The finished guide points users to ordinary chat edits and reopening saved goals. **Share Action Plan (TBD)** and **Track results (TBD)** remain future copy.

## First-run examples

Only a browser with neither current decisions nor legacy goals receives these examples:

- **Reduce turnover** → **Manager check-ins**: a fictional volunteer pilot with regular check-ins and workload adjustments.
- **Close AI skill gaps** → **Build AI skills**: guided practice followed by a work-sample review.

Both are labelled **Demo example**, with an attached plan and explicit scope, proposed owner roles, cash allowance, employee-time assumptions, dates and intended deliverables. They claim no achieved result, validated intervention effect or scenario-run count. Plan titles remain short; the generated-plan instructions request plain-English titles without changing saved custom titles.

Seeding uses the existing browser decision envelope and attachment schema. It makes no model request or source fetch and does not apply values to other planning tools. The normal plan UI supports local chat edits, reviewed draft changes, attachment history, collapse and reopening. Demo edits also work when evidence services are unavailable; this does not make their assumptions current workforce evidence.

Current or legacy state, including empty/deleted state, is never augmented. Reload, reset and repeated initialization do not duplicate examples. Removed examples are never restored automatically. General exploration remains initially selected, and shared workforce filters are untouched.

## Checks

- `tests/home-demo-goals.test.mjs`: first-run eligibility, immutable local templates, existing/corrupt/legacy state, deletion, quota retry, edit persistence and attachment history.
- `tests/browser/home-demo-goals.mjs`: first-run Home, instructions, starter submission, demo edits, filters, switching, reload/reset, removal and keyboard flows at 1366px, 390px and 683px.
- `tests/home-guided-flow.test.mjs`: single-flight execution, idempotent completed steps, failed receipts, explicit retry and cancelled late completion.
- `tests/browser/home-guided-example.mjs`: real action click-through on desktop and 390px, clean/existing/deleted-example states, keyboard selection, prompt and plan failures, repeated clicks, cancellation, Back, original draft/history preservation and passive reload.

Browser checks intercept source and chat requests with synthetic fixtures. They establish local application behavior, not hosted integration or real model outcomes.

## Loading feedback

Home shows a visible, indeterminate **Loading data…** status while its existing source requests are pending. Once settled, unavailable or partial sources replace the spinner with actual available-source counts and **Refresh data**, using the existing refresh path. The shared page status uses the selected page’s existing loading flag. AI answer and Action Plan preparation have separate labels. This presentation does not change timeouts, request concurrency or source validation.

`tests/browser/home-loading-status.mjs` exercises delayed success, partial data, failure, actual source timeout, refresh, local demo editing without evidence, separate answer preparation and navigation cancellation on desktop and mobile.

## Submission visibility and demo budgets

Submitting a question collapses the intro, hides unused starters and reveals the pending response once after layout settles. Home disables browser scroll anchoring for that workspace so a growing answer cannot keep the lower Pinned Goals rail in view. The reveal preserves keyboard focus, uses an immediate movement for reduced motion, and is cancelled by subsequent user navigation. Response completion does not trigger another scroll. Assumptions-only suggestions wait until the request finishes, avoiding a transient block above the answer.

New first-run example plans explicitly mark their listed component costs complete within the fictional pilot scope. This keeps the card and attached snapshot on the same assumed cash total ($3,000 for Manager check-ins; $5,000 for Build AI skills). Real-world costs and funding remain unverified; existing stored snapshots are not rewritten.

`tests/browser/home-response-scroll.mjs` measures actual outer/inner scroll position and reading-area geometry at desktop, 390px and compact reflow sizes, including focus/draft preservation and no later automatic jump.
