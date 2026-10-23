> Candidate status: the current fixture is a local replay of the reviewed public-route projection, not a hosted or production capture. No model output is included.

# Local reproduction with public synthetic fixtures

This recipe starts the versioned release's actual Home and analytics components against a pinned replay of 19 public-schema aggregate GET responses. It uses no private runtime inputs, credentials, database, provider calls or production access. It creates a separate local application; the immutable source snapshot and repository root app are not modified.

## Setup

Use Node 24.21.0 and the committed package lock. From a clean checkout of this repository:

```sh
node releases/2026-10-21/verify.mjs
node --test releases/2026-10-21/reproduction/fixture-handler.test.mjs
node releases/2026-10-21/reproduction/prepare.mjs .public-reproduction
cd .public-reproduction
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run start -- --port 3097
```

Open http://127.0.0.1:3097. These commands work in PowerShell and ordinary Unix shells. The output directory must not already exist; the recipe never replaces existing work. Choose another new path to prepare a second copy. Dependency installation requires access to the public npm registry. After installation, build and serving require no network services. Do not supply Vercel environment variables; the local wrapper rejects that environment. No credentials are needed.

The generated wrapper enables the original Home conversation layout at build time while its local configuration endpoint explicitly reports AI unavailable. It binds the server to loopback. This convenience boundary is not remote authentication and must not be deployed publicly.

## Provenance and fidelity

`fixtures.json` records the capture time, explicit local replay origin, dataset headers and exact bodies. `fixtures.sha256` pins its bytes. `verify-receipts.mjs` reuses the reviewed public projection allowlist, verifies complete metadata and dashboard scope, rejects extra fields, and reconstructs the original source-ordered bundle digest. These are pinned local public-route replay receipts, not a production capture or proof of live-source currentness. All 19 bodies were independently matched against the protected skills preview.

The fixture is intentionally company-wide. The dataset token in recorded receipts is retained so the original UI validators can inspect those historical responses. A permanent local notice and response header identify replay. Browser storage uses this local origin; do not interpret saved local examples as live production plans.

Five already-public headcount experiment support files are reused from the root repository and pinned in `public-support.json`. Their normalized contents match the deployed archive. They are existing fictional experiments, not new private inputs or proof of forecast accuracy.

The source manifest verifies all source files in the current manifest before copying. `REPRODUCTION.json` lists local overrides. The recipe replaces only the transport/runtime binding, adds the replay notice, removes private file tracing and changes local build/start scripts. Home layout, chart calculations and existing UI handlers are not rewritten. Analytics is suppressed. Historical generation scripts are not rerun: generated source assets are already pinned by the manifest, while their excluded historical evidence is not reconstructed.

## Supported and deliberately unavailable

- Recorded company-wide Home/analytics GET responses, including the full dashboard receipt, headcount/history, pay summaries, workforce, skills, talent, finance and survey evidence.
- Existing browser-local deterministic planning flows and explicit-input calculations can run where they use only those supported inputs. Individual browser checks are reported separately; compilation alone is not functional parity.
- AI/provider paths, database clients and unrecorded APIs are unavailable. All POST requests are rejected, including server-side calculations. No fallback to legacy sources exists.
- Narrowed country/business-unit/level filters, unknown or duplicate query parameters and mismatched dataset tokens fail visibly. They never receive silently substituted company totals.
- Full server calculator parity, live AI, private-source reconstruction and company-data onboarding are not reproduced by this increment.

The seven fixture tests cover exact 19-response replay, receipt/data tampering, explicit global scope, unsupported scope, disabled external operations local-only request boundaries and launcher argument restrictions. Run the standalone source verifier as well. Build and browser verification outcomes belong to the implementation report, not inferred from this instruction list.

## Coordinated baseline revision

The current fixture was captured locally from the reviewed generation-4 public route implementation. All 19 bodies match protected preview `people-analytics-gmrz2xb8i-ed-56dc.vercel.app`; no production promotion is claimed. The previous production fixture remains in Git history. No private aggregate source files or employee records are included.
