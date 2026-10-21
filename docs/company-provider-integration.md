# Synthetic company provider integration

This increment connects the existing invented-company importer to a versioned read binding and a real loopback HTTP transport. It supports **company-wide headcount and headcount trend only**. It does not replace Home, add a company switch, connect to a database, accept uploads, call AI, or provision a real company.

## Executable contract

`lib/public-fixture/company-binding.mjs` accepts configuration text, source aggregate text and separately reviewed `{companyKey, configSha256, sourceSha256}` pins. It reuses `company-import.mjs` for closed schemas, explicit field/leaf-unit mapping, snapshot coverage, integer headcount, FTE precision, duplicate rejection and independent control totals. It reuses the existing read provider; no second calculation engine is introduced.

The immutable binding retains company identity, exact input/config/manifest digests, first snapshot, latest as-of date and company-wide scope. Its token hashes that identity. Identical aggregates from another company, or revised source bytes, produce a different token. Every request must carry the exact token in `x-workforce-dataset`; missing, stale or cross-company tokens return 409. This is a **snapshot identifier, not an authorization credential**.

Successful responses preserve the existing bodies and carry `x-workforce-dataset`, `x-company-key`, `x-company-as-of`, `x-fixture-contract` and `Cache-Control: no-store`. Only exact GET `/api/headcount` and `/api/headcount-trend` targets work. Queries, encoded aliases, writes, finance, attrition, planning and AI have no fallback. Zero is valid; missing or invalid values fail before a server is created.

The transport checks its local socket, exact host/port and any Origin, rejects forwarded headers and non-GET/body-bearing requests, and exposes no source-file or upload endpoint. It does not enable CORS. Exceptions return a fixed error without source values. These are local-fixture checks, **not production authentication**. Do not expose this launcher through a tunnel or proxy.

## Reproduce

Node 24 is sufficient; no npm installation, credentials, database or provider is required:

```powershell
node --test tests/company-binding.test.mjs tests/company-fixture-import.test.mjs tests/public-fixture-provider.test.mjs
node tools/serve-company-fixture.mjs
```

The launcher reads only the checked-in invented Lantern config/rows/pins, explicitly normalizing CRLF to LF before checking the reviewed hashes. It accepts no arguments or arbitrary paths and rejects a Vercel environment. It binds an OS-assigned port on `127.0.0.1` and prints the URL, public fixture token and identity. Send that token in `x-workforce-dataset` for the two GET routes, then stop with Ctrl+C. No files are written. Editing input bytes without reviewing/updating separate pins fails startup; generating a digest alone is not review or data-sharing approval.

The tests exercise mapping → provider → actual HTTP request → response, two-company/revision isolation, explicit zero, rejected private-shaped fields, stale clients, unsupported targets and transport guards. **25 checks passed** across the new and reused suites. Browser rendering, full-app bootstrap, live-model behavior and real-company acceptance are not claimed.

## Remaining integration work

The deployed app's `lib/dataset-runtime.ts` selects a pinned aggregate provider before legacy handlers. Legacy `.from(table)` calls do not describe public-mode database requirements. This fixture binding remains outside that runtime; public requests cannot select it.

Full new-company app integration still needs explicit aggregate-domain coverage for each UI/calculator, reviewed provider selection and stale-response handling, and browser → API → provider → rendered scope/date checks with invented data. Missing domains must remain unavailable rather than borrowing the existing 9,037 company. This two-route contract cannot supply Home's costs, turnover, recruiting or planning.

Actual private-company ingestion additionally requires source-owner/classification, population/denominator/currency/period, independent controls, privacy, retention and approved-destination evidence in [the ingestion contract](fresh-company-bootstrap.md). No private data has been ingested. The [accounting bootstrap](../database/fresh-accounting/VERIFICATION.md) is separately tested; it is not a full app/data bootstrap or an allowance for another company. Production and the existing cumulative $20 ledger remain unchanged.
