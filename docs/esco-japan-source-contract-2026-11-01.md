# ESCO taxonomy and Japan Data Architect source contract

This additive batch supplies four European taxonomy references for six German vacancies, requiring explicit duty confirmation and one broader Japanese Data Engineer profile for two Data Architect vacancies. Eligibility increases from 72 to 80 of 197 modeled vacancies. Eligibility is not adoption or complete labor-market evidence. Pay eligibility is unchanged.

## ESCO

The four original occupation API responses explicitly requested `selectedVersion=v1.2.0`. Unversioned response self links do not establish v1.2.1. The fixture retains original multilingual occupation labels/descriptions and all 284 relation identities, categories, types and source ordering: Data Scientist 97, Frontend Software Engineer 98, Communications Specialist 60, Total Rewards Specialist 29. Unknown skill type remains null. Essential/optional relations are categorical taxonomy, not numerical importance, proficiency or German hiring-demand measurements.

The European Commission ESCO copyright notice identifies CC BY 4.0 unless otherwise indicated; its linked underlying-source notices are preserved. Attribution records requested version, retrieval date, selection/reformatting and no endorsement. German applicability is a reviewed conditional duty match; source geography remains European occupational classification. No foreign survey is presented as German measurement.

## Japan

Data Architect is conditionally matched to broader jobtag Data Engineer profile 523 only for design/build of data collection, storage/access platforms, databases or cloud infrastructure, excluding governance-only or routine pipeline operation. Original CSV record 496 supplies 39 skill means. Exact variable IDs, Japanese labels, raw decimals and coordinates are retained; English labels reuse the previously reviewed translations.

Source version 7.00 was released 2026-03-17 and internally updated 2026-02-10. These are not observation dates. Sample sizes and uncertainty are unavailable. The workbook range is 0–7; public explanatory examples use 1–7. A future zero stays uninterpreted and unplotted. Article 9 attribution identifies JILPT, filename/version, retrieval and processing. No employee proficiency, demand, applicants or training time is inferred.

## Compatibility and verification

All 112 preceding canonical references are byte-identical (aggregate SHA-256 `e915d7810b047fac0af3393c800b31f4c49c469ce524368a15e513c007e7606b`). New records append; saved versions are never automatically enriched. Existing explicit duty confirmation, cancel/review tickets, stale checks, selected-revision reconstruction and backup validation apply unchanged. Static lookup and model explanations receive canonical source facts without external calls or automatic attachment.

Run `python releases/2026-10-21/source/scripts/verify-esco-japan-sources.py --evidence-root <integration-evidence>` against retained originals to verify four ESCO response hashes and relation fields plus the original Japanese CSV hash, row, variable headers and all means. Public deterministic tests require no private evidence directory. This batch has no fresh live-model acceptance claim.

## Release gates

Candidate only; not yet public. Backend checks: 76 passed, followed by 6 after strengthening held-role assertions. UI checks: 35 passed. Independent review: 19 checks plus original-source verification passed. Exact-commit CI, isolated staging and desktop/mobile public acceptance remain required.

## Verified public release

PR531 merged as `de664e7d65d05f48dd1eea71aaff3f5a770a20f5`. Runtime `8b2ea1dd7c61ff204aac9b490c8ed63c1e9722fc`, deployment `dpl_EFwzPaC8jEoSxvNQeQ852aU7XZBp`, exact CI `41283412695` succeeded. Seven staged and seven direct public flow groups passed at each desktop/mobile width; HTTP200, no recorded errors, clean teardown. Actual screenshots inspected, including a settled desktop capture below the sticky header. Seven explanation requests per width were mocked; no paid model acceptance is claimed. Live non-pay coverage80/197, pay59/197.
