# Browser-local search release review — 2026-10-03

Disposition: the offline feature is ready for parent source review with the small compatibility fix below. This is not deployment approval or validation on physical Windows/Android devices. Live agent and ML readiness remain separate and unvalidated.

## Source and scope

- Fetched `cloud-browser-local-search` and verified exact source `65c08f3dd4bb5d3a647a56effae0e286697d8dae` before review.
- Verified comparison checkpoint `3a6a14dfb310193524dd24f0990ae3aac5fd15f5` and production baseline `67cf4873623194eecb13666d9788423dcdc8c820` locally.
- Review/fix branch: `review-browser-local-search`. Source branches preserved; no push, PR, merge or deployment.
- Read `AGENTS.md`, the installed Next client-boundary guide and the three requested workforce documents. No repository `.agents/skills` or workspace skill files were present.
- Reviewed the 27-file search increment and cumulative 74-file source diff from production, including earlier evidence/lifecycle, calculator rounding, agent/ML and API transport changes. Earlier proxy transport code is part of that cumulative diff, not new local-search transport or authentication work.

## Findings and boundaries

1. **Fixed, minor compatibility defect:** missing Worker support or synchronous worker-constructor failure surfaced a raw browser exception. `lib/workforce-search-client.ts` now reports local unavailability, retained records and no service fallback. Unit tests cover missing/throwing constructors; browser tests cover unavailable Worker and worker Web Crypto without state changes, API requests or uncaught errors.
2. **Browser test improvement:** added Pixel 7 touch/device emulation for the 390px local-search pass, viewport metadata in the fixture, and an exact layout-width assertion. Without viewport metadata a mobile context can render a scaled desktop layout and misleadingly pass an overflow assertion.
3. No further concrete release defect was found in the reviewed/exercised scope. Search requires six explicit integer bounds and confirmation, reports the finite domain and caps, uses the shared deterministic calculator/Web Crypto in a cancellable worker, and offers no remote fallback. Selection remains limited to two eligible emitted alternatives; review, replacement, calculation, save and approval remain separate actions.
4. Source/goal/evidence identity checks, deliberately late replies, draft preservation, concurrent history refusal, mixed v1/v2 retention, historical reconstruction, tampering and storage limits are covered. Lineage adds bounded references/hashes rather than raw evidence or private notes. Hashes establish content identity, not external authenticity or approval authority.
5. Runtime graph tests exclude Node hashing facades, the live workforce agent adapter, ML evaluation and fixture hosts from product imports. Worker/search contain no network/storage calls. Existing app APIs are still present; local testing intercepted their responses with synthetic fixtures. The whole application is not claimed to be offline.
6. Candidate pools remain descriptive evidence, not assignable capacity. Counts/costs/dates are entered assumptions; nondominance is not a best-plan recommendation. Fixed training/uplift totals do not scale with changed counts. No employee-level decisions or operational capacity validation occurred.
7. `localExitEnpsEnabled()` still returns false. No database files or `docs/exit-enps-local-contract.md` changed relative to production; the held SQL and document were not edited or executed.

## Independent checks

Untouched source: 406 unit tests passed and genuine Next production build passed. Final runtime fix:

| Check | Result |
| --- | --- |
| `node --test tests/*.test.mjs` | 407 passed, zero failures/skips |
| `npm run lint` | Zero errors/warnings |
| `npx --no-install tsc --noEmit` | Passed |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Genuine production build passed; no font mocks |
| Local-search browser suite | 62 passed |
| Handoff browser suite | 50 passed |
| Built Next workspace suite | 98 passed, including real built worker assets |
| Selection browser suite | 11 passed |
| Planning lifecycle browser suite | 24 passed |
| `git diff --check` | Passed |

Total: 245 browser assertions. Final mobile local-search run includes actual worker parity, 990 mixes/991 evaluations, explicit output truncation, over-budget rejection, missing Worker/Web Crypto, source changes, cancellation and v2 reload verification. Other responsive suites use 1366px/390px viewport sizing. All browser API responses were mocked; external browser requests were blocked. Existing SDK unit tests use injected or loopback fixtures only.

Engine: installed Debian Linux Chromium `151.0.7922.173`, headless, driven by installed Playwright. The local-search 390px pass uses the Pixel 7 device descriptor with touch/mobile settings and a 390px CSS viewport. This is Android emulation on Linux Chromium, not Android Chrome execution. Windows Chrome, physical Android Chrome, platform storage restrictions and eventual hosting/CSP remain unvalidated. Unsupported Worker/Web Crypto paths fail closed with saved records retained.

Reproducible logs in this review workspace: `/tmp/review-{unit-baseline,unit,lint,ts,build,local-browser,handoff,workspace,selection,lifecycle}.log`. Final local-search screenshots: `/tmp/workforce-local-search-TWqefg/`; built-app results/screenshots: `/tmp/review-workspace/`. Browser commands use `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs`. The built-app suite requires the local production server on `127.0.0.1:3100`.

Dependency installation needed a writable `/tmp` npm cache after the default cache path failed. No dependencies or lockfiles changed. No live OpenAI/Supabase/auth requests, secret inspection, access/settings/database changes or GitHub status API queries were made.

## Concise acceptance script

Use the synthetic mocked fixture with one saved three-role plan, one prior v1 review and approval note. Repeat on real Windows Chrome and Android Chrome before claiming target-device support; keep fixture interception active.

1. Open local alternatives. All six bounds are blank and no search runs. Copy saved mix: bounds populate but Run remains disabled until confirmation. Try a fraction, negative value and impossible sum: each blocks Run.
2. Set Build/Move/Buy minima to 0 and maxima to 3. Confirm the unchanged cost/timing assumptions. Expect 10 combinations and 11 evaluations; explicitly run. Check conditional labels, unknown/failed options and the absence of a preferred option.
3. Select two eligible non-core mixes; a third must be unavailable. Review, then cancel: existing edited drafts and saved data must remain unchanged. Review again and explicitly replace drafts; this must not calculate, save or approve.
4. Calculate; edit an alternative and confirm Save disappears. Recalculate and save explicitly. Confirm the original plan, approval and prior v1 review remain intact; the new review retains bounds/method/origin and marks customization.
5. Reload and verify the saved review locally. Confirm the search starts blank and history remains inspectable. Complete a newer synthetic plan calculation and inspect the older review as historical.
6. Cancel a held operation, switch goals or introduce main-plan edits; late replies must not restore results or write state. Check unsupported Worker/Web Crypto using the supplied test harness: clear local-unavailable message, retained history and no service fallback.

Live workforce-agent invocation, actual-model semantics, ML predictive performance/training, real staffing capacity and automated approvals have not been validated or activated by this review.
