# Optional assumption editor successor

Isolated successor to public diagnostic checkpoint
`0b36af5b6f2b4bf7537adca202c77e5d2f8a1c7d`, tree
`7f741597d4f3cd208637445348b5f819de61465a`. The frozen application
`cf9dbd1195ac11ceda5645ace392034e9bb03f7e` and its diagnostic branch remain
unchanged. Integration/release ownership remains with
`01a1139b-d5e4-704a-902c-610e54b1e023`; this successor is not merged or released.
A separate source-only browser acceptance handoff is documented below.

The original editor increment changed only `components/swp-demand-journey.tsx`
among existing product files. New
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

The browser acceptance successor uses the supported managed-Linux workflow in
`docs/workforce-device-acceptance.md`: Playwright fulfills only GET document
navigation to `http://127.0.0.1:3100/` from generated synthetic fixture bytes.
Every other request is aborted. CSP and fixture network guards remain enabled;
no HTTP listener, file navigation, browser policy change or additional security
flag is used.

**68 browser assertions passed**, 34 each at 1280×900 desktop and 390×844 mobile
with touch enabled. Coverage includes explicit-request boundaries, natural-chat
routing (a synthetic no-model reply), initial focus and keyboard traversal,
accessible labels, 44px controls/actions, no horizontal overflow, repeated opens,
button/chat/Escape cancellation, invalid numbers, exact preservation of untouched
values/periods/scopes/provenance, changed-month user provenance, renewed/repeated
assumption acceptance, pending plan-review invalidation, separate plan cancel/save,
busy/reset/navigation interruptions and stale dataset rejection before host redraw.
There were zero runtime errors, blocked non-fixture requests or guarded network
attempts. Component screenshots and an assertion receipt are written to the printed
OS temporary output directory; the receipt records HEAD/tree, working-tree status,
artifact SHA-256, exact assertions and never-run coverage. Run on a clean committed
tree to bind evidence to the exact final source.

The first browser execution exposed a scoped save defect: the feasible displayed
“Current mix” (`reference`) was passed to an adapter accepting only emitted
alternative IDs. `lib/swp-demo.ts` now uses the existing no-alternative receipt
path and associates the immutable source plan for that verified reference. It
still verifies the exact report, feasibility, context and storage guards. Emitted
alternatives retain their existing proposal path. Two synthetic regression tests
cover preparation without writes, unchanged demand provenance, invalid IDs/altered
reports, infeasible-reference rejection and emitted-alternative preparation. The
positive reference test failed on the original code before this fix.

The harness also fixes two synthetic-host expectations: reset starts a fresh
discussion, and changing fixture input supplies the host redraw after its store
instance is replaced. Before that redraw, the real editor must reject the stale
dataset draft. Editor screenshots are scoped to the editor and the review button
is explicitly scrolled into view before clicking; this avoids the intermittent
full-page screenshot/scroll interaction observed during harness development.

Ten focused unit/regression tests, eight related Home mix integration tests,
TypeScript, focused lint and isolated component compilation pass. No full-app,
physical-device, screen-reader or real-AI natural-language correction acceptance
is claimed. The diagnostic API harness, provider/model/token-count calls, database,
credential/billing actions, production startup/deployment and user desktop were
never run or accessed. Frozen predecessor and diagnostic files remain unchanged.

```sh
node --experimental-strip-types --test --test-isolation=none tests/swp-demand-editor.test.mjs tests/swp-reference-save.test.mjs tests/home-mix-integration.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
node node_modules/eslint/bin/eslint.js components/swp-demand-journey.tsx components/swp-demand-editor.tsx lib/swp-demand-editor.ts lib/swp-demo.ts tests/swp-demand-editor.test.mjs tests/swp-reference-save.test.mjs tests/fixtures/swp-demand-editor.tsx tests/browser/swp-demand-editor.mjs
# Build only: no browser launch or model call.
node --experimental-strip-types tests/browser/swp-demand-editor.mjs --build-only
# Isolated intercepted HTTP fixture; no server or diagnostic:
node --experimental-strip-types tests/browser/swp-demand-editor.mjs
```

Set `PLAYWRIGHT_MODULE` to the existing installed Playwright module if it is
not in the checkout's dependency resolution path. No package installation or
dependency change is required. The earlier exact-source real-AI test remains a
separate frozen-predecessor decision; this successor does not establish its
result or authorize paid testing.
