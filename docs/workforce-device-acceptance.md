# Reproducible synthetic device acceptance

This closes a test-delivery omission: the existing browser scripts supply HTML and API responses through Playwright interception. Their `127.0.0.1:3100` address is not a published fixture URL and cannot simply be opened on a phone. No preview link is assumed here.

The new builder produces one self-contained HTML file from the existing `selectionFixture()` / `workforceReviewFixture()` data, real `WorkforceAlternatives` component, real search worker and existing built CSS. It includes a three-role Engineer/Technology plan, one v1 review, an approval note, another goal and a newer synthetic calculation. No data construction, password, key, service or API is required. Fixture controls are test-only; no product route imports them.

The file embeds the worker as a Blob because a local file cannot load a separately hosted Next worker asset. Thus this checks component/calculator/worker behavior, storage and interaction on the device; it does **not** validate Next production worker URLs or hosting CSP. The previously passed built-app suite covers built assets on Linux. Eventual target-host acceptance is still separate.

## Build once from the repository root

Prerequisites: existing locked dependencies, Node 24 (native TypeScript support), and the existing production `.next/static/chunks/*.css`. The builder intentionally fails if CSS is absent; run `npm run build` once only if no applicable build exists. No production build rerun is needed just to generate another fixture.

PowerShell:

```powershell
$fixture = (node tests/manual/build-workforce-device-fixture.mjs | Select-Object -Last 1).Trim()
Write-Output $fixture
```

Bash:

```bash
fixture=$(node tests/manual/build-workforce-device-fixture.mjs)
printf '%s\n' "$fixture"
```

Output is an OS temporary directory containing `workforce-device-acceptance.html`. Transfer **that single HTML file** using an existing approved file-transfer method if needed. It contains only synthetic inputs and bundled code/CSS. Rebuilding creates a new file; preserve the same file/path during reload checks. Do not place it in the product's `public/` directory or deploy it.

## Windows Chrome — interactive, no server

Use an existing Playwright installation. If `playwright` already resolves in this workspace, no module override is needed. Otherwise point `PLAYWRIGHT_MODULE` at the existing installation's `index.mjs` using a file URL; do not put credentials in this variable. The cloud path below is not a Windows path.

```powershell
# Only when Playwright is installed outside this checkout:
# $env:PLAYWRIGHT_MODULE = 'file:///C:/actual/existing/playwright/index.mjs'
node tests/browser/workforce-device-fixture.mjs $fixture --interactive
```

On Windows the launcher selects installed Chrome (`channel: chrome`) and opens a separate temporary browser context. The test page is supplied in memory by Playwright; no HTTP listener or backend starts. All requests except the exact synthetic navigation are aborted, and page CSP blocks connections. Close the test browser window when done. Reload inside that session to verify history; closing the context intentionally discards its test storage.

Optional `CHROMIUM_PATH` selects an already installed browser executable. Missing Chrome/Playwright is a local tooling prerequisite, not a reason to change app access or use production data. No headed desktop browser was launched in the cloud task.

## Android Chrome — standalone file, conditional on device support

Transfer the generated HTML through an already approved local mechanism, then open that file with **Chrome** using the device's existing file-opening UI. Confirm the page says **Synthetic device acceptance**, **Saved locally: true**, **Original plan unchanged: true**, **Reviews: 1**. Do not use a document preview renderer in place of Chrome. No computer server, LAN exposure, USB debugging, port forwarding, login or new device setting is required by this artifact.

Some Android file providers/browsers may refuse HTML, persistent local storage or workers from a local file. If it does not open in Chrome, says it cannot initialize, or cannot run a worker, record the exact behavior and stop that path. It is a fixture/device-delivery blocker, not proof the HTTPS product is broken. Do not change browser security policy, debugging settings or use a remote upload service to work around it. A separately available approved synthetic HTTPS preview would then be needed for complete Android acceptance; none is created or claimed here.

The managed Linux browser rejected direct `file://` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. No retry/bypass or policy change was made. Direct file operation on Windows/Android is therefore **unvalidated**. Only the artifact's fully intercepted browser mode has been validated in this environment.

## Five-minute interaction script

1. Open **Review local alternatives**. Bounds start blank and Run is disabled. Click **Use saved mix as exact bounds**: confirmation is still required. Try a negative/fractional bound and all-zero maxima: each blocks Run.
2. Set Build/Move/Buy minimum `0`, maximum `3`. Expect **10 combinations; 11 evaluations**. Check the confirmation box, then **Run local mix search**. Choose Build 0 / Move 3 / Buy 0 and Build 1 / Move 2 / Buy 0; a third selection is disabled. All comparisons remain conditional; no best plan or available staffing capacity is claimed.
3. **Review selected mixes**, then **Cancel selected mixes**: drafts/history remain unchanged. Review again and **Replace alternative drafts**: no save/approval occurs. **Calculate alternatives locally**, edit Alternative 1's annual internal cohort uplift to `1000000`, verify Save disappears, then recalculate and **Save reviewed alternatives**. Expect **Original plan unchanged: true**, **Reviews: 2**, and a customized-origin warning.
4. Reload, reopen alternatives and click **Verify saved review 2 locally**. Inspect **Search origin and conditional assumptions**. Bounds/method/customization remain inspectable. Click **Publish newer synthetic calculation**; reopen alternatives and verify review 2 again. It must be **Historical inputs or evidence**. This button only publishes the prebuilt synthetic state; it makes no calculation API request.
5. Click **Reset synthetic fixture** to restore the initial seed. Reenter 0–3 bounds and confirmation. Set **Worker test mode → Hold replies**, run, wait briefly, then **Cancel local search** and **Release held replies**. No result returns or saved state changes. Repeat with Goal B → Goal A or **Toggle unsaved main edits** while held. Set **Worker unavailable**, then **Web Crypto unavailable**, and run each: expect clear local-unavailable messages, retained history and no fallback. Restore **Normal** when finished.

On Android additionally check tapping inputs/actions, portrait layout and scrolling without horizontal overflow. Record device/OS/Chrome versions and pass/fail for each step. Physical-device success must not be inferred from Pixel emulation.

## Focused automated verification (optional)

This checks the new artifact packaging/seed/controls only; do not rerun the already passed 407-unit/245-browser release suite for this documentation/test-only increment.

Cloud/Bash with existing tools:

```bash
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs \
  node tests/browser/workforce-device-fixture.mjs "$fixture"
```

Windows/PowerShell with existing Playwright:

```powershell
node tests/browser/workforce-device-fixture.mjs $fixture
```

The default mode intercepts the synthetic page in memory and starts no server. `--file` is an explicit direct-file check only for an environment already permitting it; do not retry that mode after an administrative denial. Default tests passed 10 packaging-specific assertions on Linux Chromium, including embedded Blob worker execution, v2 save/reload/verification, newer-version history, reset, unsupported-worker/hash controls and zero non-fixture requests/browser errors. Focused lint and TypeScript passed. Existing release checks were not repeated.
