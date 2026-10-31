# General-chat market catalogue lookup

Status: implemented and independently reviewed; release acceptance pending.

Ordinary chat can request a read-only static catalogue lookup using explicit country and an exact reviewed role or occupation code. It returns the current canonical US national BLS 2025–2035 occupational outlook and O*NET 31.0 software flags. This expands retrieval, not data coverage: 39/197 vacancies have conditional outlook references, 40/197 software references, and 59/197 separate pay references.

The catalogue is separate from synthetic company data and saved scenario evidence. A lookup does not confirm duties, attach evidence, change assumptions or update a saved revision. Selected position-context explanations retain their exact context and cannot silently replace it with newer catalogue facts. Shared occupation projections are deduplicated; national employment is not available applicants and projected annual openings are not current vacancies. Software flags are categorical, not volume, rank or employee proficiency. Missing country/role requires clarification; unmatched scopes do not substitute a broader occupation or geography.

Implementation: market-context-lookup.ts validates exact input keys, country, role/code and reference kind, returns cloned canonical references, and caps output at 48,000 UTF-8 bytes. Analytics dispatch supports this static read without network access. Ordinary Home/Intelligence catalogue-only routes reject calculator calls. The existing Home solution loop supports the same read while preserving planning contracts. Existing context, round, admission and reservation controls remain unchanged.

Verification before release: worker 31 focused tests and independent reviewer 23 tests passed, including actual route/Home dispatch with mocked completions, immutable old references, scope rejection and saved-context isolation. No paid model requests. These tests prove data delivery and dispatch, not that a live model will always choose the tool or answer correctly. Integrated checks, CI and browser acceptance are recorded separately after completion.

Sources, hashes, licences and crosswalk decisions remain in market-reference-ai-handoff.md and position-outlook-expansion-2026-10-31.md. No new source acquisition or permissions.
