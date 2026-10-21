# Deployed application source — October 21, 2026

This directory publishes the application source from the reviewed 9,037-person release at https://www.ed-ai.app. It is a source snapshot, not a deployable replacement for the root development application.

- Deployed source commit: `a86acfa4ebc28015f2652685536750c300ca083a` (local release identity; not a GitHub commit link).
- Verified deployment: `dpl_fw5A59MB2HhM74R5qzrxEAqhVmM5`.
- Original deployed package SHA-256: `d1355bde21786753b1bc1bf71a21d6c1f0c4cb9fe8ad94007ccaf7a35e3e9416`.
- `source/` contains 720 exact application, asset and configuration files. `manifest.json` records individual byte hashes. The base archive was independently downloaded and matched; this update changes only the reviewed source files. The staged build restored and verified the pinned archive before the same build was promoted.

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

Current pricing verification expires October 22, 2026 at 09:59 UTC (admission cutoff 09:57:30 UTC). Continuing operation requires aligned app pricing, rollout pricing, admission SQL ceiling, and settlement dispatch windows/rates. The cumulative budget is not reset by a release. This snapshot records a point in time; it is not a claim of perpetual availability.

The [local replay recipe](reproduction/README.md) implements bounded public fixture/receipt integration with a separate generated app. Full private calculator reconstruction and live AI are not reproduced. Saved/versioned headcount what-if remains a separate design proposal, not an implemented feature. No predictive accuracy, realized savings or enterprise persistence is claimed.

## Home question and split-view update

The calendar-year turnover shortcut now resolves relative years using the trusted server clock and request timezone, and computes annual exits divided by average monthly closing headcount only when all twelve months and matching company-wide sources are verified. For calendar 2025 the current synthetic dataset yields 1,342 exits / 8,743.67 average headcount, or 15.35%. Missing or conflicting evidence remains unavailable; monthly rates are never summed.

Home keeps the conversation and composer left and the current answer's supported visuals right, with a stacked mobile layout. New questions, errors and stale evidence clear prior visuals. Four natural-language prompts submit their visible text; the planning scenario popup remains separate. No cost-driver causality or new forecasting capability is claimed.

Validation: 11 annual-contract tests, 8 existing consumer/grounding tests, 13 route tests (including exact prompt routing with fake provider ports), and 12 UI tests pass; TypeScript, focused lint and the production build pass. Independent reviews cleared the annual contract and UI. Real staged desktop/phone checks returned the annual answer and monthly chart with zero model rounds. Other prompt answers were not re-tested with fresh paid provider calls. Data inputs, provider configuration, budget and permissions are unchanged.

## Conversational framing repair

Shared normalization removes polite framing while preserving dates, populations, negation and substantive qualifiers. Verified turnover and headcount calculations remain bounded; unsupported causal and planning questions retain the grounded model/tool path. Twenty-three focused tests and TypeScript passed. A separately captured freeform cost-summary question completed in one model round with grounded figures and explicit limitations; this is not arbitrary-query acceptance. The 19-case offline matrix tests routing only and deliberately denies model dispatch. The original midnight pricing deadline was superseded by the coordinated renewal below: expiry October 22, 2026 at 09:59 UTC, with admission cutoff 09:57:30 UTC.

## Conversation display labels

The renderer formats only eight exact public business-unit labels through the existing catalog display convention. Stored answers, model context, filter IDs, unknown labels and quantities are unchanged. The focused display/saved-evidence/visual suites passed 24 tests; actual-route tests passed 17. A fixture-provider browser journey passed ten checks covering paraphrased planning, selection/save/reopen, explicit budget changes, topic switches and late-response cancellation. These checks do not establish arbitrary model answer quality. A captured real cost answer is used for hosted rendering verification without another paid call.

## Multi-turn topic continuity

A real three-turn conversation covered a four-role staffing comparison, a changed budget and redeployment pool, then recorded monthly turnover. The two staffing turns used two model rounds each; turnover used zero. Numeric assumptions, conditional recommendations and explicit evidence limits were preserved. The captured topic switch exposed stale staffing cards alongside the new metric answer. Current calculation markers now reset per answering turn while retaining scenario inputs and provenance. Seventeen route tests, TypeScript and captured-request replay passed; an independent focused review found no blocker. Saved/reopened state remains covered by earlier fixture checks rather than a fresh paid save journey. No model, budget, permission or data changes accompany this correction.

## Coordinated pricing renewal

The reviewed rolling price window is October 21 09:59 through October 22 09:59 UTC. Admission stops 90 seconds before expiry. Application policy, rollout expiry, database admission ceiling and receipt settlement upper bound must match the coordinated renewal; existing receipt lower bound and ten-minute freshness remain intact. The cap, reservations, uncertain holds, prices and permissions are unchanged. Twenty-five accounting/round tests and exact live-definition date-transform checks passed with independent review. This supersedes the earlier midnight deadline above.

One additional actual model investigation plan passed evidence review and explicit browser Save/reload, preserving the candidate, goal, scope and unknown resources. It remains a qualitative proposal, not an executed intervention or proof of causes.

## Saved-plan reading area

After pinning and reopening a real model-generated qualitative plan, the desktop split transcript collapsed to 96px. Include saved-plan mode in the existing split-specific reading-area rule; mobile, scenario popup and saved state are unchanged. Focused independent review and retained-state browser verification cover the correction without another provider call.
