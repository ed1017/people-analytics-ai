# README operational record - October 27, 2026

This preserves operational and acceptance notes moved from the public README during editorial cleanup. These are historical statements from that revision; consult the active roadmap and latest release verification for current state.

**Live AI status, October 27, 2026:** automatic pricing verification is installed and public readiness checks report configured. Readiness is not proof that every answer succeeds; recent visitor-reported answer failures remain under investigation. The worked example and local scenario calculations do not require a paid model call.

## Repository and deployment status

The versioned application source subset is published in [releases/2026-10-21](releases/2026-10-21/README.md), with a file-hash manifest and dependency-free verifier. [PR438](https://github.com/ed1017/people-analytics-ai/pull/438) is verified live, runtime `5d52980ea5dd2218125d81ca62f92947784291d9`; exact-head CI and protected/public desktop/mobile checks passed. The manifest pins that source, removing the duplicate worked-example heading while preserving shared controls and calculations. The [active roadmap](docs/roadmap-status-2026-10-17.md) separates live work, candidates, remaining evidence and deferred scope. Older dated sections are historical.

The root development application remains distinct from that versioned snapshot. Private synthetic runtime inputs, credentials and release evidence are excluded. Publishing the source closes the missing-source record; it does not make this repository a self-contained reproduction of the hosted service. A [local public-fixture replay recipe](releases/2026-10-21/reproduction/README.md) now builds and serves the versioned UI without private inputs or credentials. It preserves recorded company-wide receipts; live AI, narrowed filters and unrecorded server calculations are deliberately unavailable.

Automatic Vercel deployments from main and this publication branch remain disabled. Releases use separately checked builds and explicit promotion. The release notes distinguish protected provider checks, captured-answer replay, local continuity tests and public configuration smoke; no fresh paid production browser journey through every step is claimed.
See [Product architecture and availability](docs/product-architecture.md) for the distinction between the live prototype, the repository and proposed capabilities.

See [Public portfolio MVP acceptance](docs/public-portfolio-mvp-acceptance.md) for completed evidence, operational dependencies and optional extensions.

## Historical maintenance record

Historical pricing renewal PR379 (superseded; current recorded maintenance window is in the active roadmap): app, rollout, admission and settlement upper windows align at October 24 23:14 UTC. Round admission cutoff 23:12:30 UTC; new configuration receipts stop at 23:12:00 UTC. Independent review, 30 focused tests, CI, protected/public Home and capability checks passed. Rates, $50 cumulative cap, original reservations, receipts and uncertain holds are unchanged; accounting preservation verified. No paid provider call. This is configuration acceptance, not fresh-model answer acceptance.
