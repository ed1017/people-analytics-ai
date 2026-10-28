# Overview headcount planner acceptance - October 28

PR451 runtime: `ec0606e070c22195020e4b53a4d1db5a35ef63ce`. Source head: `7c3447a500b73453323b6bd55837b800f937985c`. Merge: `1cd8488ac212b422e5afcfe3f27957824bdaf023`. Deployment: `dpl_51iene1Bk9uZeofy9MMeRzYgS8h2`. Tested stage: https://people-analytics-kqdra56py-ed-56dc.vercel.app. Canonical public host verified against this deployment.

## Cause and correction

Controls depended on a narrow headcount-modeling phrase in the composer, which clears after Send. Generic staffing-gap requests showed only prose; historical charts had no modeling entry. Entry intent now survives Send, Model headcount opens editable assumptions beside historical results, and the parent owns the draft across welcome/conversation transitions. Evidence refresh preserves edits; goal, filter, dataset and reset context still isolate drafts. Back to saved plan restores the separately mounted saved editor.

Regression lesson: test complete entry transitions and historical answers with existing saved results, rather than only populated planner fixtures. Initial staged testing found two simultaneous editors; the final candidate separates them without deleting either state.

## Evidence and limits

- 980 runtime tests, TypeScript, independent review and production build passed. Exact-head CI `40731748406` passed.
- Staged and public browser checks passed at 1440px and 390px: generic gap controls, blank unknown flows, edits before and after Send, reset, whole-month normalization, explicit save, historical chart plus modeling entry, existing saved results, Back to saved plan, recalculation, reload, no horizontal overflow and no page errors.
- Final public checks used actual readiness and scoped projection-source GETs. The source returned 9,037 people as of September 30, 2026 with the expected dataset header. Calculations and browser persistence were real. Chat replies were controlled; this does not establish fresh model interpretation.
- Protected-preview readiness initially timed out through CLI transport; that isolated UI test used an explicit readiness fixture. Final public acceptance used ordinary browser readiness.
- Zero provider calls. No calculation, source-data, financial-policy, credential or access changes. Reload restored saved inputs rather than later unsaved edits.

FoW work is unpublished and separate from this Overview correction. The screenshot clarification superseded the initial FoW interpretation.
