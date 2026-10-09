# Optional editor and progress summary client integration

The separate integration successor imports the exact application changes from
`codex/swp-goal-progress-summary-20261008` at
`b6910655db764b75946c2fb0b9f29895dd3b62be`, which includes the optional editor
and reference-plan save fix. The frozen model-acceptance predecessor remains
unchanged. No diagnostic execution hook is imported into this successor.

`tests/browser/swp-editor-full-client.mjs` bundles the actual root client page,
dataset boundary and decision store. Playwright intercepts its single localhost
document and all API responses; every other request is blocked. It starts no
HTTP server and makes no provider or database call. It does not test Next server
rendering, production deployment, real model language interpretation or real data.

The desktop and touch-mobile flow verifies a natural proposed review, an
explicitly requested editor, local recalculation and acceptance, the feasible
reference-plan save, exact reload, retained conversation provenance, the linked
goal-progress summary, cancellation and actual Home reset. Saved plans retain
their unverified assumptions; an unmeasured goal stays **Not yet measured** with
execution **Not recorded**. Conversation fields may change during a new exchange,
so persistence checks compare the saved demand, plan and progress records.

Run with the available Playwright installation:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/swp-editor-full-client.mjs
node --test tests/swp-demand-editor.test.mjs tests/swp-reference-save.test.mjs tests/home-mix-integration.test.mjs tests/goal-progress-summary.test.mjs
```

The browser run writes screenshots and a receipt to a new temporary directory.
Fixture feature flags are defined in the isolated bundle only. No application
environment flag, model setting, saved user record, dataset selector or release
configuration is changed by this test.
