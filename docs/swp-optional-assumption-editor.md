# Optional assumption editor successor

Isolated successor to public diagnostic checkpoint
`0b36af5b6f2b4bf7537adca202c77e5d2f8a1c7d`, tree
`7f741597d4f3cd208637445348b5f819de61465a`. The frozen application
`cf9dbd1195ac11ceda5645ace392034e9bb03f7e` and its diagnostic branch remain
unchanged. Integration/release ownership remains with
`01a1139b-d5e4-704a-902c-610e54b1e023`; this successor is not merged or published.

Only `components/swp-demand-journey.tsx` changes existing product code. New
`components/swp-demand-editor.tsx` and `lib/swp-demand-editor.ts` own the editor
and its typed patch adapter. Detection uses the existing
`DemandIntakeControl.command` hook. Conversation services, schemas, runtime
model, database, permissions, protected diagnostic harness and normal build
configuration are untouched.

## Behavior

Natural language remains the default. An explicit request such as “Show me an
assumption editor” or “Open an edit box” opens the optional fields only after
a current demand review exists. Ordinary corrections, negations, quoted text
and mixed editor-plus-change instructions remain on the natural-language path.
No manual pin is required. Repeated open requests preserve the draft.

The editor supports horizon/start, the nine existing quantity fields and the
two effort-rate periods. Objective, role scope and operating linkage remain
read-only; discuss different work in chat. Unknown optional inputs remain
unknown unless supplied. A known numeric value cannot be erased into a falsely
user-supplied Unknown: enter a reviewed number or cancel to retain the current
assumption. No defaults or scope conversions are silently introduced.

Edits stay in component-local draft state. Cancel or Escape leaves the demand
review, scenario acceptance and saved work unchanged. “Review edited
assumptions” generates only changed-field patches and calls the existing
`reviseDemandReview`, validation and calculation helpers. Unchanged values,
units, scopes and provenance remain exact. Changed values carry an explicit
editor-action quote as unverified user-supplied planning inputs.

Reviewing clears scenario acceptance and invalidates the parent's comparison
and save review. The existing “Use your assumptions for now” action must run
again before comparison; final plan/goal saving still uses the existing explicit
review/save flow. Acceptance never changes assumption provenance. Repeated
acceptance of the same exact review does not rerun its calculation. Busy work,
changed exact keys, dataset/goal changes, reset, navigation and closure prevent
stale edits from being applied.

## Focused validation and remaining gate

Eight focused unit tests cover request boundaries, unchanged provenance,
repeated edits, rate conversion, exact-key/context staleness, cancellation by
discard, numeric/schema guards and unknown inputs. TypeScript and focused lint
are checked separately.

`tests/browser/swp-demand-editor.mjs` compiles only the actual SWP components
and a fictional local-storage host into standalone HTML, using locked compiler
and CSS tooling. It does not run Next build/start, app routes, the diagnostic
model harness, a database or provider. Its proposed desktop/mobile checks cover
focus, touch targets/reflow, repeated opens, cancel/Escape, invalid inputs,
renewed acceptance, explicit save/cancel, busy/reset/navigation/dataset changes
and blocked network attempts. Fixture-only feature constants permit rendering
the UI; they do not change application runtime configuration.

The standalone build passed. **Browser behavior is not yet verified:** the
cloud sandbox first blocked Chromium's local socket operation; an approved
headless execution then launched Chromium but browser administration policy
rejected the local fixture URL with `ERR_BLOCKED_BY_ADMINISTRATOR`. Testing
stopped at that boundary, without policy changes or an alternate navigation
route. No desktop/mobile pass, screenshot review or full-app acceptance is
claimed. The browser assertions need execution in an approved environment
before integration.

```sh
node --experimental-strip-types --test --test-isolation=none tests/swp-demand-editor.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
node node_modules/eslint/bin/eslint.js components/swp-demand-journey.tsx components/swp-demand-editor.tsx lib/swp-demand-editor.ts tests/swp-demand-editor.test.mjs tests/fixtures/swp-demand-editor.tsx tests/browser/swp-demand-editor.mjs
# Build only: no browser launch or model call.
node --experimental-strip-types tests/browser/swp-demand-editor.mjs --build-only
# Only in an environment authorized to open the isolated fixture:
node --experimental-strip-types tests/browser/swp-demand-editor.mjs
```

Set `PLAYWRIGHT_MODULE` to the existing installed Playwright module if it is
not in the checkout's dependency resolution path. No package installation or
dependency change is required. The earlier exact-source real-AI test remains a
separate frozen-predecessor decision; this successor does not establish its
result or authorize paid testing.
