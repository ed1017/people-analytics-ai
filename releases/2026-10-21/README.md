# Deployed application source — October 21, 2026

This directory publishes the application source from the reviewed 9,037-person release at https://www.ed-ai.app. It is a source snapshot, not a deployable replacement for the root development application.

- Deployed source commit: `e974354f8abf28345c0ad219cd2cb9f321b7878b` (local release identity; not a GitHub commit link).
- Verified production deployment: `dpl_627T9CMztxkzoCqoqruB8PL3pEky`.
- Original deployed package SHA-256: `40c78460cbbe49c97545c17b7e3bbbf560b199f85679359bf17bf7cc5b9d3ed7`.
- `source/` contains 714 exact application, asset and configuration files. `manifest.json` records individual byte hashes. The deployed archive was independently downloaded and matched before this subset was extracted.

Verify without dependencies, credentials or network:

```sh
node releases/2026-10-21/verify.mjs
```

The original archive is deliberately not published. Five private synthetic aggregate runtime files, historical evidence, experiments, deployment receipts, credentials, environment configuration and local Git history are excluded. The source references those dependencies, but this publication does not authorize distributing them or grant access to hosted services. Do not treat the original package hash as the hash of this smaller source subset.

The excluded runtime files are `.private-9037/captured-62-queries.json`, `component-contracts.json`, `components.json`, `integrity-manifest.json` and `joint-dashboard.json`. A self-contained reproduction requires separately reviewed public fixtures for these contracts, hosted admission/accounting configuration and existing provider configuration. Do not fabricate substitutes and claim production parity.

The snapshot's package scripts and deployment configuration are preserved for inspection, not instructions to deploy this incomplete package. Root Vercel Git deployment remains disabled for main and this publication branch. Root TypeScript excludes the snapshot to preserve the existing development application's checks. Copying this folder into a separately configured project is not expected to reproduce the live release without its excluded dependencies.

## Release behavior and evidence

This release restores provider-backed planning routes, preserves the current workforce data and adds bounded tolerance for clock skew in the configuration receipt. Home has a two-column chart/chat layout, additional scoped metrics and clearer catalog labels. Saved proposals remain browser-local planning records.

Protected provider checks cover intake, comparison, revisions, combinations, capability review and grounded chat. Captured two-round Home output passed corrected offline contract grading; the original failed hosted grading receipt was not rewritten. Seven local React continuity checks cover selected-goal follow-up, save/reload, cancellation and stale-response isolation using fake provider/admission ports. Public desktop/mobile smoke confirms enabled UI and configuration without paid requests. This is not evidence of a fresh paid production browser journey through all these steps or of arbitrary recommendation correctness.

At publication, pricing verification expires October 22, 2026 at 00:00 UTC. Continuing operation requires a freshly verified policy and matching admission window. The cumulative budget is not reset by a release. This snapshot records a point in time; it is not a claim of perpetual availability.

The [local replay recipe](reproduction/README.md) implements bounded public fixture/receipt integration with a separate generated app. Full private calculator reconstruction and live AI are not reproduced. Saved/versioned headcount what-if remains a separate design proposal, not an implemented feature. No predictive accuracy, realized savings or enterprise persistence is claimed.
