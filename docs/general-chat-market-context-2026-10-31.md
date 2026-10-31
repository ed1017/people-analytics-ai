# General-chat market catalogue lookup

Status: live in PR508; direct public desktop/mobile acceptance passed.

Ordinary chat can request a read-only static catalogue lookup using explicit country and an exact reviewed role or occupation code. It returns the current canonical US national BLS 2025–2035 occupational outlook and O*NET 31.0 software flags. This expands retrieval, not data coverage: 39/197 vacancies have conditional outlook references, 40/197 software references, and 59/197 separate pay references.

The catalogue is separate from synthetic company data and saved scenario evidence. A lookup does not confirm duties, attach evidence, change assumptions or update a saved revision. Selected position-context explanations retain their exact context and cannot silently replace it with newer catalogue facts. Shared occupation projections are deduplicated; national employment is not available applicants and projected annual openings are not current vacancies. Software flags are categorical, not volume, rank or employee proficiency. Missing country/role requires clarification; unmatched scopes do not substitute a broader occupation or geography.

Implementation: market-context-lookup.ts validates exact input keys, country, role/code and reference kind, returns cloned canonical references, and caps output at 48,000 UTF-8 bytes. Analytics dispatch supports this static read without network access. Ordinary Home/Intelligence catalogue-only routes reject calculator calls. The existing Home solution loop supports the same read while preserving planning contracts. Existing context, round, admission and reservation controls remain unchanged.

Verification before release: worker 31 focused tests and independent reviewer 23 tests passed, including actual route/Home dispatch with mocked completions, immutable old references, scope rejection and saved-context isolation. No paid model requests. These tests prove data delivery and dispatch, not that a live model will always choose the tool or answer correctly. Integrated checks, CI and browser acceptance are recorded separately after completion.

Sources, hashes, licences and crosswalk decisions remain in market-reference-ai-handoff.md and position-outlook-expansion-2026-10-31.md. No new source acquisition or permissions.

## Exact release acceptance

- Runtime `db929e7bcafb495755f6b251327a7c0531748739`; merge `75eba404827f1b31e18d1b52e138203228f22699`; deployment `dpl_Dkayc368edi2zzCqYRHwMsWGUHpk`.
- Exact stage `people-analytics-8kvjvr2xs-ed-56dc.vercel.app` promoted after QA and confirmed at `www.ed-ai.app`, without rebuilding or changing guards.
- Archive SHA256 `a5f8d799f40147e35778f09a6e0c092050401a2cb7f601dfdeab957119625cbe`; 1,205 verified runtime inputs / 1,060 source-manifest files. Private inputs and dependency locks unchanged.
- Independent review and 23 checks; worker 31 checks; integrated packaged 94 checks; position type graph; production build/TypeScript; exact-head CI `41246365472` passed. The initial checkout test could not load its absent private fixture; the same suite passed against verified packaged inputs. Expected fake-provider failure-path logs do not indicate a paid call.
- Staged 1440px/390px each passed four groups and six mocked requests, with zero page, blocked, mock or bridge errors and drained teardown. Fourteen actual GET responses from the exact stage were fetched with existing authorized CLI access, validated and replayed unchanged to avoid transport startup latency exceeding the app's 12-second evidence timeout. This is not direct staging timing acceptance.
- Direct public 1440px/390px each passed four groups and six mocked requests, real evidence GETs HTTP 200, no replay, zero errors and drained teardown. Actual PR506 backup records, position/finance/context/Track state, follow-up history, BI taxonomy, unsupported Japan and navigation remained correct. Screenshots inspected; no horizontal overflow.
- Initial browser failures were restricted transport, CLI latency and a locator selecting a hidden duplicate answer. Harness corrections preserved app guards and strict assertions. No app workaround or credential change.
- Reports: `nonpay-chat-catalog-{stage-db929e7-visible,public-db929e7}-{1440,390}.json`; `GENERAL-CHAT-MARKET-RELEASE.json` and package record in executor evidence.
- No paid calls. Mocked actual route/Home loops establish canonical data delivery; browser tests establish transport/rendering/state preservation. Fresh live model selection and answer quality remain unverified.
