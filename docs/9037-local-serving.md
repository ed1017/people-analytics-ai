# Reviewed 9037 local serving

The existing application can display the reviewed synthetic 9037 candidate on loopback in development. With no private configuration, the original legacy router remains unchanged. This does not activate or deploy a dataset.

Use an isolated checkout without `.env` files. Install the locked dependencies, then create a private JSON file outside the repository with exactly these keys:

```json
{
  "componentDirectory": "/absolute/private/components-reviewed",
  "capturePath": "/absolute/private/captured-62-queries.json",
  "captureDigest": "921e9dbe52e516cbd9d28033c09a0f886127917b40b48bbb3f4448814440ce13",
  "jointPath": "/absolute/private/components-reviewed/joint-dashboard.json"
}
```

The capture comes from the retained isolated rehearsal, not a new production query. Verify its lineage before use. Compute the configuration file SHA-256 and launch:

```sh
node scripts/dev-9037.mjs /absolute/private/config.json CONFIG_SHA256
```

Open `http://127.0.0.1:9037`. Stop with Ctrl-C. The launcher validates artifacts before starting, binds to loopback, and refuses hosted execution. Private configuration variables are server-only. Production mode with either local variable fails closed. No selector write, database connection, or AI call is required. The local proxy permits the 19 reviewed company GET routes and the explicitly allowlisted deterministic planning operations in `lib/dataset-company-routes.mjs`. POST operations calculate draft scenarios and allocations without persistence. BLS, AI/conversation routes, unsupported methods, and unknown API routes return 503. Existing application analytics is omitted in local mode.

The component integrity pin is `5f7c0952361565579df7354d863441698d776fa2ef2ab1f9c70f8b0c14079ab7`; the joint artifact pin is `aa01cfd83b1e38ac704330dd5749ce0026c4d351b99839321ffd7c52d0172ce5`. The reader reconciles 960 joint cells, 33 monthly stocks, event flows, company totals, and dimension partitions against the separately pinned capture. Invalid artifacts never fall back to live data.

The dashboard supports country, business unit, level, and their combinations, including known-empty scopes. Voluntary turnover uses all nine 2026 month-end stocks, including zero months. Company detail panels retain their explicit company-wide scope. Recruiting hires represent accepted offers; they are distinct from external workforce starts. The attrition chart shows exit-derived rates, not an exit-count chart. Forecast validation and publication approval remain false.

## Focused validation

Run the manual test with explicit private inputs:

```sh
WORKFORCE_9037_LOCAL_CONFIG=/absolute/private/config.json \
WORKFORCE_9037_LOCAL_SHA256=CONFIG_SHA256 \
DATASET_9037_SQLITE=/absolute/private/fixture.sqlite \
node --import ./tests/fixtures/dataset-review-offline.mjs --test tests/manual/dataset-9037-development.test.mjs
```

The test reads the pinned SQLite fixture independently and compares all 1,287 scopes, 42,471 monthly observations, costs, vacancies, and turnover numerators/denominators. It also checks configuration, token, host, route, and tampering guards. No fixture regeneration is performed.

## Deterministic planning

The local candidate supports company and business-unit scenarios, position actions and structure, internal talent evidence, historical recruiting feasibility, occupational-reference availability, response plans, portfolios, business-unit allocation, execution timing, constraints, scheduling, and workforce-solution calculations. These reuse the reviewed capture and existing calculators. Readiness, available movers, future hiring capacity, and confirmed completion remain unknown where the source does not establish them. Occupational mappings and external references are unavailable.

The staffing-target companion uses a candidate-specific January–December 2027 draft horizon. It explicitly carries September 2026 stock to January 2027; October–December 2026 are unmodeled. This is an assumption, not a forecast bridge. The original staffing contract still requires consecutive months immediately after the source snapshot. Only an unmodified Baseline can supply the target comparison.

With the private configuration variables above, run `node --import ./tests/fixtures/dataset-review-offline.mjs --test tests/manual/dataset-9037-planning.test.mjs` for the eight business units, 50 roles, dependent calculations, source receipts, horizon checks, and blocked model/network paths. Production delivery, backup/recovery evidence, publication approval, and activation remain separate unresolved gates.
