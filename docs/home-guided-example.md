# Guided Example and first-run goals

Home has one **Try a guided example** entry under **Show instructions**. The expanded toggle reads **Hide instructions**. Submitting a question or selecting a starter prompt collapses the intro without clearing drafts or goals. Entering the guide also collapses the intro and hides the starter block until the guide closes. Merely having saved example goals does not hide starter prompts in General exploration.

The burgundy **Guided instructions** panel has a divider and eight steps: review the example, submit the example, Pin the goal, select Action Plan #1, attach it, submit a prefilled coordination-hours edit, select the revised numbered plan, then attach it. **Next → Submit** is a noninteractive arrow pointing at the actual chat Send button for both submissions. Separate Next buttons appear only on explanation steps. Large arrows highlight the real Pin, plan tabs and Attach controls; they cannot receive clicks. These steps advance only after successful saved receipts for the expected control, plan and isolated goal. Automatic selection does not advance the walkthrough. Existing assumption acknowledgements and conflict checks remain required. Back revisits completed steps without repeating work.

Opening the guide sends nothing. **Next → Start example** opens an isolated temporary exploration and prefills the composer, without submitting while keeping the previous goal, transcript and draft. Pin uses the normal goal-save handler with a new guide-owned ID, explicitly labelled “demo example”; it saves the example transcript, selects that goal and prepares plans through the ordinary Pin flow. It does not replace or recreate first-run examples, including deliberately removed examples. After the first attachment succeeds, chat is prefilled with **In Action Plan #1 set coordination hours to 24**. Submitting uses normal local numbered-plan editing to create a separate alternative; the first attachment and original plans remain unchanged. The user then explicitly selects and attaches the revised plan. No models run on guide entry, Back, plan selection, local edits, reload or first-run seeding.

Exit guide aborts pending work and restores the preceding conversation and draft. A user-selected different goal is respected. Successfully pinned examples and attachments remain saved. A validated tab-local return address restores the preceding conversation after reload. Reload closes the walkthrough and does not resume or replay actions. Re-entering starts a separate explicit example; existing goals and histories remain intact. The finished guide points users to ordinary chat edits and reopening saved goals. **Share Action Plan (TBD)** and **Track results (TBD)** remain future copy.

## First-run examples

Only a browser with neither current decisions nor legacy goals receives these examples:

- **Reduce turnover** → **Manager check-ins**: a fictional volunteer pilot with regular check-ins and workload adjustments.
- **Close AI skill gaps** → **Build AI skills**: guided practice followed by a work-sample review.
- **Add 5 roles over 12 months**: a fictional staffing mix with separate cash and staff hours.

All are labelled **Demo example**, with an attached plan and explicit scope, proposed owner roles, cash allowance, employee-time assumptions, dates and intended deliverables. They claim no achieved result, validated intervention effect or scenario-run count. Plan titles remain short; the generated-plan instructions request plain-English titles without changing saved custom titles.

Seeding uses the existing browser decision envelope and attachment schema. It makes no model request or source fetch and does not apply values to other planning tools. The normal plan UI supports local chat edits, reviewed draft changes, attachment history, collapse and reopening. Demo edits also work when evidence services are unavailable; this does not make their assumptions current workforce evidence.

Current or legacy state, including empty/deleted state, is never augmented. Reload, reset and repeated initialization do not duplicate examples. Removed examples are never restored automatically. General exploration remains initially selected, and shared workforce filters are untouched.

## Checks

- `tests/home-demo-goals.test.mjs`: first-run eligibility, immutable local templates, existing/corrupt/legacy state, deletion, quota retry, edit persistence and attachment history.
- `tests/browser/home-demo-goals.mjs`: first-run Home, instructions, starter submission, demo edits, filters, switching, reload/reset, removal and keyboard flows at 1366px, 390px and 683px.
- `tests/home-guided-flow.test.mjs`: single-flight execution, idempotent completed steps, failed receipts, explicit retry and cancelled late completion.
- `tests/browser/home-guided-example.mjs`: real action click-through on desktop and 390px, clean/existing/deleted-example states, keyboard selection, prompt and plan failures, repeated clicks, cancellation, Back, original draft/history preservation and passive reload.

Browser checks intercept source and chat requests with synthetic fixtures. They establish local application behavior, not hosted integration or real model outcomes.

## Loading feedback

Home shows a visible, indeterminate **Loading data…** status while its existing source requests are pending. Once settled, the loading status disappears. Source coverage, unavailable-source details and **Refresh evidence** remain inside **Data details**, using the existing refresh path. There is no data-unavailable banner. The shared page status uses the selected page’s existing loading flag. AI answer and Action Plan preparation have separate labels. This presentation does not change timeouts, request concurrency or source validation.

`tests/browser/home-loading-status.mjs` exercises delayed success, partial data, failure, actual source timeout, refresh, local demo editing without evidence, separate answer preparation and navigation cancellation on desktop and mobile.

## Submission visibility and demo budgets

Submitting a question collapses the intro, hides unused starters and reveals the pending response once after layout settles. Home disables browser scroll anchoring for that workspace so a growing answer cannot keep the lower Pinned Goals rail in view. The reveal preserves keyboard focus, uses an immediate movement for reduced motion, and is cancelled by subsequent user navigation. Response completion does not trigger another scroll. Assumptions-only suggestions wait until the request finishes, avoiding a transient block above the answer.

New first-run example plans explicitly mark their listed component costs complete within the fictional pilot scope. This keeps the card and attached snapshot on the same assumed cash total ($3,000 for Manager check-ins; $5,000 for Build AI skills). Real-world costs and funding remain unverified; existing stored snapshots are not rewritten.

`tests/browser/home-response-scroll.mjs` measures actual outer/inner scroll position and reading-area geometry at desktop, 390px and compact reflow sizes, including focus/draft preservation and no later automatic jump.

The example retains a company-wide 2-percentage-point turnover-reduction target over 12 months and a $100,000 demo cash ceiling throughout. Baseline turnover and average workforce remain unknown. The target is not a forecast. Company-wide sources stay company-wide when workforce filters change.

Failed ordinary saves keep a validated per-tab session-storage recovery copy when available. Reload displays the recovered draft for review. Recovery merges nonconflicting changes with the latest saved envelope; conflicts require an explicit choice to retain saved versions and the unsent request. Original attachments and deleted goals are protected. Storage failures remain visible if even the recovery copy cannot be written.
