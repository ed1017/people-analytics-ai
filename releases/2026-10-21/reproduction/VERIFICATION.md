# Verified stages — October 21, 2026

This is a bounded local reproduction, not complete hosted-service parity.

| Stage | Result |
| --- | --- |
| Public source provenance | All 714 immutable snapshot files verified before preparation. |
| Public fixture provenance | 19 unauthenticated public GET bodies, dataset headers and complete receipts captured; original source-ordered bundle digest reconstructed successfully. No private source package was used to generate fixture data. |
| Fresh Git checkout | Prepared from a new clone of the public-only integration branch, without node_modules, private files, environment files or a .vercel project link. |
| Dependency install | Locked npm install with lifecycle scripts disabled succeeded; the fresh-checkout repetition used the local npm cache offline. |
| Contract tests | Seven pass: fixture pin/receipts, exact 19-route replay, scope restrictions, disabled services, request boundary, tampering and launcher overrides. |
| Production build | Next.js 16.3.6 webpack compilation, TypeScript, page generation and build tracing passed. No ignored TypeScript errors or fake credentials were used. |
| Desktop 1440 / phone 390 | Original Home shows 9,037, replay notice and unavailable AI; scenario comparison, save and restored results after reload pass. No horizontal overflow or page exceptions. |
| Pay and cost | Both widths render 50 catalog jobs and 9,037 snapshot people, without crash or horizontal overflow. |
| External operations | Browser tests permitted only local GETs; no blocked external attempts or writes occurred. Unit tests reject AI/POST operations and non-loopback/deployed requests. |
| Focused review | Data provenance, privacy and local boundary reviewed. Launcher hostname-override issue and incomplete support-file mapping were fixed and cleared. |

The first build exposed missing imports from the existing public headcount experiment. The recipe now includes five pinned public support files; their normalized bytes match the deployed archive. The successful clean build includes them. Afterward, only launcher argument validation, documentation and reproduction metadata changed; final committed preparation was compared against the built application and application bytes were unchanged. The tested launcher matches apart from Git checkout line endings.

Browser harness corrections scoped a duplicate Compare button to the scenario dialog, checked the already restored results region after reload, and used Salary ranges by job rather than a desktop navigation label on mobile. The existing application was not changed to accommodate these selectors. Passed Home/save/reload checks were retained; only the final Pay check was rerun separately.

Next emitted a multiple-lockfile workspace-root warning because the generated app is nested inside the checkout. Build completed successfully; all available parent files in that clean checkout were public source. The standalone app is served locally and is not packaged for deployment.

Not established: narrowed workforce filters, arbitrary server calculator outputs, provider-backed AI, live billing/admission, private data reproduction, predictive performance or every application screen. Unsupported operations return explicit errors, not invented totals. Follow the [README](README.md) to reproduce the supported stages.
