# Isolated synthetic company Home

This executable integration uses the versioned current-release Home (`a86acfa`), its left conversation/right visual layout and headcount chart. It does not change production selection or deploy a new company. PR322's API binding alone did not establish browser integration.

## Reproduce

From a clean checkout with Node and npm:

```sh
node --test tests/company-dashboard.test.mjs tests/company-binding.test.mjs
node --test tests/company-workspace-session.test.mjs
node tools/prepare-company-home.mjs ../company-home
cd ../company-home
npm ci
node run-next.mjs build
node run-next.mjs start --port 3098
```

Open `http://127.0.0.1:3098`. The generator requires a new output directory, verifies the 720-file release manifest and public support pins, and accepts only the checked-in invented Lantern fixture. No environment credentials are needed. The server binds to loopback and refuses Vercel execution; its proxy denies other API domains, writes, unsupported routes and alternate page URLs. The underlying release files are not modified.

Optional browser acceptance: with an existing Playwright installation and browser, run `node tools/verify-company-home-browser.mjs` while the server is running. `PLAYWRIGHT_MODULE` may point to that installation and `BROWSER_EXECUTABLE` to an existing browser. The script writes desktop/mobile screenshots and `COMPANY-HOME-BROWSER.json` into its working directory. It checks actual API values/layout, unsupported answers, reload failure and an older delayed request completing after a newer failed reload. It makes no provider calls.

## Supported contract

`invented-headcount-dashboard-v1` includes company identity, dataset token, as-of date, exact capabilities, snapshot and ordered history. The browser validates all fields against the fixed expected company/date and current dataset session. Unsupported metrics must be absent, never fabricated as zero. Identity, token, scope, date, missing/extra fields and conflicting final snapshots fail closed.

The invented August/September snapshots are 7/9 people and 6/7.75 FTE, respectively. Supported deterministic questions show these dates, values and the +2 recorded change. They do not explain causes. Turnover, cost, recruiting, vacancies, planning and subgroup analysis are explicitly unavailable. An unsupported question removes the previous answer visual. Reload failures clear values and conversation; session guards prevent old requests or messages from crossing company identities.

This is a partial Home capability integration, not full real-company readiness or general conversational AI. Production's complete-dashboard receipt is unchanged. No legacy demo values fill gaps.

## Local company/snapshot controls

The unpublished transition increment also generates two fixed invented variants from the reviewed Lantern fixture: Second company has 14/18 people and 12/15.5 FTE; revised Lantern has 21/27 people and 18/23.25 FTE. These are intentionally synthetic test transformations, not independently sourced company totals. No arbitrary file, company or upload input is accepted.

Home's selector opens one exact snapshot. The server returns only a registered snapshot whose digest matches the activation header; the client separately rejects completions from older activations. The immutable snapshot keys saved conversations and drafts in a dedicated `invented-workspace-` namespace, separate from the existing Home shell. Selection is tab-local in sessionStorage. Returning to a snapshot or reloading restores its conversation; revised source starts separately and does not silently copy old goals/evidence.

Failed saves prevent switching. Pending target recovery is visible without activating that company; explicit recovery and retry use the existing DecisionStore conflict controls. Source retry refreshes React state from the recovered record. At 100 saved answers, further submissions are refused without discarding history or the draft. Unsupported answers still remove the chart, and failed/loading requests withhold prior company values.

Run `node tools/verify-company-transitions-browser.mjs` with the same optional Playwright/browser environment variables for the integrated desktop/mobile selection, reload, delayed response, quota/recovery and transcript-limit journey. This tests local synthetic Home, not production tenant authentication or hosted persistence.

## Remaining acceptance boundaries

- A real-company source needs explicit data approval, validated mappings/controls, and separately authorized storage/access configuration. This tool deliberately cannot load arbitrary files or credentials.
- Cost, turnover and recruiting need numerator/denominator, currency, period and scope contracts before they can appear as supported capabilities.
- Planning, AI grounding, real-company selection and hosted persistence remain unverified. Local synthetic selection and browser storage acceptance do not establish those capabilities.
- Accounting-only fresh-database bootstrap remains separate from full application schema/bootstrap. Refer to `fresh-company-bootstrap.md` and `company-provider-integration.md`.
- Current live AI windows still expire October 22 09:59 UTC, with application cutoff 09:57:30; this offline tool neither renews them nor changes cumulative spending.
