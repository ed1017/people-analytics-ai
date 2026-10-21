# Isolated synthetic company Home

This executable integration uses the versioned current-release Home (`a86acfa`), its left conversation/right visual layout and headcount chart. It does not change production selection or deploy a new company. PR322's API binding alone did not establish browser integration.

## Reproduce

From a clean checkout with Node and npm:

```sh
node --test tests/company-dashboard.test.mjs tests/company-binding.test.mjs
node tools/prepare-company-home.mjs ../company-home
cd ../company-home
npm ci
node run-next.mjs build
node run-next.mjs start --port 3098
```

Open `http://127.0.0.1:3098`. The generator requires a new output directory, verifies the 720-file release manifest and public support pins, and accepts only the checked-in invented Lantern fixture. No environment credentials are needed. The server binds to loopback and refuses Vercel execution; its proxy denies other API domains, writes, unsupported routes and alternate page URLs. The underlying release files are not modified.

## Supported contract

`invented-headcount-dashboard-v1` includes company identity, dataset token, as-of date, exact capabilities, snapshot and ordered history. The browser validates all fields against the fixed expected company/date and current dataset session. Unsupported metrics must be absent, never fabricated as zero. Identity, token, scope, date, missing/extra fields and conflicting final snapshots fail closed.

The invented August/September snapshots are 7/9 people and 6/7.75 FTE, respectively. Supported deterministic questions show these dates, values and the +2 recorded change. They do not explain causes. Turnover, cost, recruiting, vacancies, planning and subgroup analysis are explicitly unavailable. An unsupported question removes the previous answer visual. Reload failures clear values and conversation; session guards prevent old requests or messages from crossing company identities.

This is a partial Home capability integration, not full real-company readiness or general conversational AI. Production's complete-dashboard receipt is unchanged. No legacy demo values fill gaps.

## Remaining acceptance boundaries

- A real-company source needs explicit data approval, validated mappings/controls, and separately authorized storage/access configuration. This tool deliberately cannot load arbitrary files or credentials.
- Cost, turnover and recruiting need numerator/denominator, currency, period and scope contracts before they can appear as supported capabilities.
- Planning, AI grounding, persistence and company selection require company-isolated integration acceptance; this fixture does not establish them.
- Accounting-only fresh-database bootstrap remains separate from full application schema/bootstrap. Refer to `fresh-company-bootstrap.md` and `company-provider-integration.md`.
- Current live AI windows still expire October 22 09:59 UTC, with application cutoff 09:57:30; this offline tool neither renews them nor changes cumulative spending.
