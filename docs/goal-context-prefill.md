# Goal context prefill, local checkpoint

This change follows the accepted core Home checkpoint `e99e3159ec528876616932fec5e3831d2c8a462d`. The independent UI checkpoint `66cf8df` is not included. No hosted changes, database changes, new model inputs or Action Plan editing controls are introduced.

## Existing behavior and change

Saved goal notes already retain bounded user text, page, scope, requirement/context classification and truncation status. However, the Focused issue editor showed context only for saved goals and did not prefill the separate empty constraints field. Its context edits saved immediately, so closing the goal modal did not cancel them.

The existing label is now **Constraints, assumptions and context**. Empty context drafts copy literal retained user-note text, retaining the original notes and their page/scope labels below. Saved manual context remains authoritative. The 600-character field and existing 800-character/12-note limits remain unchanged; longer copies carry a continuation marker while the source notes remain available. No assistant prose, model problem or inferred facts are extracted into context or decisions.

New Goal opens context expanded. With no current relevant user context it is blank. A goal typed in the editor—for example, “I need more AI capability without increasing headcount”—prefills its own statement and constraint with the editor's current page and actual selected scope. Missing provenance is explicitly marked unavailable. Current General exploration user statements may prefill a new goal through the existing explicit-user-goal resolver; their original source metadata is retained. This temporary buffer is populated only by the existing user-statement recording path, stays in the tab, and still returns null to the unpinned model input envelope. Different explicit exploration goals, starting a new problem, switching goals and clearing all reset the relevant buffer. New Goal opened from another saved goal copies none of that goal's context or decisions. Changing a new goal discards imported exploration context and records the new user statement at the current editor source.

Context and confirmed decisions are local editor drafts until explicit Save/Pin. Close cancels them. Decisions remain a separate editable field and are never filled from notes or AI suggestions. An editor instance identifier and checks against its opening goal, statement and saved context reject stale field/save handlers, including close/reopen of the same goal. Duplicate goal creation reports a reviewable error and does not overwrite the existing goal. Existing Action Plan work remains intact; plan changes continue in chat.

An initial browser check found that nested label text changed its accessible name when the textarea acquired content. Both fields now have stable explicit accessible labels; visible-field assertions remain strict. Existing browser harnesses also needed their stale Home/action labels aligned with the current Action Planning/Create Action Plan controls. The two shared workforce fixture bundles resolved two React copies and failed before rendering; they now use the same root React alias already used by other repository browser fixtures and report page errors. No product behavior was changed to accommodate those harness repairs.

## Validation

Validation passed on the final production source, using a fresh production server on port 3178. Build and standalone TypeScript ran separately. Tests use intercepted synthetic API responses; no live model calls or credential diagnostics.

- Unit tests: **1,131/1,131** (`node --test tests/*.test.mjs`), including 10 new context-editor cases.
- Browser checks: **925/925** across desktop, mobile and zoom/reflow: new context editor 51; prior core Home regression suites 648; section goal context 73; capacity-flow fixture 84; option-composer fixture 69. New coverage exercises blank/expanded New Goal, literal constraint prefill, original versus current source provenance, separate explicit decisions, Cancel, stale handlers after same-goal reopen and other-goal selection, duplicate protection, General exploration resets and unchanged unpinned request boundaries.
- `npm run lint`, standalone `npx tsc --noEmit`, `npm run build` and `git diff --check` passed. Held eNPS, database and workflow files are unchanged.

Local evidence: `/tmp/context-prefill-unit.log`, `/tmp/context-prefill-browser.log`, `/tmp/context-prefill-home-*.log`, `/tmp/context-prefill-section-goal-context.log`, `/tmp/context-prefill-workforce-option-composer.log`, `/tmp/context-prefill-final-lint.log`, `/tmp/context-prefill-final-tsc.log` and `/tmp/context-prefill-build.log`. Initial harness failures are described above; the final individual suite logs supersede the earlier stopped sweep summary.

## Separate work

The published core `e99e3159` is preserved. Its reported live acceptance covered one exact prompt, correct Pin, three intervention cards and comparison; hosted attachment/save was not exercised and remains distinct from local browser coverage. This context checkpoint is local only.

Preserve UI checkpoint `66cf8df` and the separate Guided Example queue. Palette work remains blocked by the known Library helper error `library file transfer failed: download failed`; no workaround or further diagnostics were attempted here. The later “Why these plans” truncation follow-up remains queued separately, preserving full Details and a sensible word boundary. A later read-only country/business-unit/department capability audit is also queued: trace actual scope support through evidence, Home, Pin, plans, what-if and saved plans without expanding scope or claiming every source is filtered. Next local integration is the preserved analysis-demo branch `69188f79035d7faf8e9241ddd6aed75cdb653106`, with the two evidence fingerprints regenerated and unchanged model payloads verified; it is not part of this checkpoint.
