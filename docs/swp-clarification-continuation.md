# Unarmed clarification-aware conversation fixture

The first reply to an underspecified managed-services objective may legitimately
ask what kind of work the contracts require. Requiring a calculated operational
review on that turn is stricter than the application conversation contract.
This fixture preserves a supplied first reply and defines exactly three later
user turns: client-operations/service-desk work with proposed editable assumptions,
a nine-month correction, and four existing staff at 25% availability.

`tests/fixtures/swp-clarification-continuation.mjs` contains fictional user text,
empty workforce evidence and pure request/binding helpers. It embeds no actual
model reply, receipt, credentials or execution approval. `bindClarificationReply`
validates and hashes supplied reply/state bytes; their origin must be verified
separately. The first continuation retains the exact prior state, and later turns
must retain the original two-turn history. It cannot regenerate the opener.

The user need not type an internal template name. A model may propose the narrow
compatible client-operations illustration with clearly labeled scope/linkage
provenance. A different operational role still requires separately reviewed
cost/readiness assumptions. No application language-mapping behavior is changed.

Expected acceptance distinguishes a valid focused clarification from a completed
planning scenario. After the intended work is sufficiently resolved, proposed
effort, productive hours, horizon and availability remain assumptions. Code checks
scope, dates, periods and arithmetic. Subsequent edits preserve every omitted
input and provenance field. Scenario acceptance does not verify facts or save a
goal. Counted existing capacity excludes double-counted internal pools; a zero
gap produces no staffing plan. Whole-period shortfalls remain visible.

The pure test uses a **synthetic** first clarification and typed model outputs.
Its illustrative 4,000 annual hours per contract and 1,600 productive hours per FTE
are deterministic test inputs, not the only acceptable proposed model values.
It proves state, calculation and provenance contracts, not model comprehension:

```sh
node --test tests/swp-clarification-continuation.test.mjs
```

This fixture has no provider client, token-count call, paid-run entry point, build
hook, deployment configuration or armed manifest. The earlier diagnostic harness
retains its original source and contract; it does not execute this continuation.
Any separately approved future executor must bind this exact source and fixture,
the verified preserved first reply/state, and its bounded reservation before a run.
