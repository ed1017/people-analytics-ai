# Deployed application source — October 21, 2026

This directory publishes the application source from the reviewed 9,037-person release at https://www.ed-ai.app. It is a source snapshot, not a deployable replacement for the root development application.

- Deployed source commit: `b3890b9a17bd1da661ae2463c91589774fc4d955` (local release identity; not a GitHub commit link).
- Verified production deployment: `dpl_Eg21b7PzxbtsoKE35RgyBykAUbnk`.
- Original deployed package SHA-256: `73d6cdf115ac754ebf2f7a0f02febe56a82ee94c4669ff452645237fc276095b`.
- `source/` contains 716 exact application, asset and configuration files. `manifest.json` records individual byte hashes. The base archive was independently downloaded and matched; this update changes only the reviewed source files. The staged build restored and verified the pinned archive before the same build was promoted.

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

The next source-reproducibility step is the already identified public fixture/receipt integration. Saved/versioned headcount what-if remains a separate design proposal, not an implemented feature. No predictive accuracy, realized savings or enterprise persistence is claimed.

## Home question and split-view update

The calendar-year turnover shortcut now resolves relative years using the trusted server clock and request timezone, and computes annual exits divided by average monthly closing headcount only when all twelve months and matching company-wide sources are verified. For calendar 2025 the current synthetic dataset yields 1,342 exits / 8,743.67 average headcount, or 15.35%. Missing or conflicting evidence remains unavailable; monthly rates are never summed.

Home keeps the conversation and composer left and the current answer's supported visuals right, with a stacked mobile layout. New questions, errors and stale evidence clear prior visuals. Four natural-language prompts submit their visible text; the planning scenario popup remains separate. No cost-driver causality or new forecasting capability is claimed.

Validation: 11 annual-contract tests, 8 existing consumer/grounding tests, 13 route tests (including exact prompt routing with fake provider ports), and 12 UI tests pass; TypeScript, focused lint and the production build pass. Independent reviews cleared the annual contract and UI. Real staged desktop/phone checks returned the annual answer and monthly chart with zero model rounds. Other prompt answers were not re-tested with fresh paid provider calls. Data inputs, provider configuration, budget and permissions are unchanged.
