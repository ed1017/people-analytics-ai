# Australian occupation shortage references — 1 November 2026

**Live and publicly accepted: 106/197 non-pay vacancies; 91 remain. Pay: 59/197.** PR541 merged as `43cdeb453b26e3cd2b0293e5bfea07da9a950516` and published exact runtime `9279edee6cf0171cf592f04cbdd9d32801d84ea3` through deployment `dpl_GDVznzWNzeWAkeM7GQeDP8TMTW63` after successful CI41339206030. Stage and direct-public acceptance each passed seven groups at both 1440 and 390 widths: HTTP 200, nine locally mocked explanations per run, zero recorded errors, drained teardown, and zero public asset replay. All 20 saved goals and earlier records were preserved. No paid model calls were made.

The new reference set covers two Treasury vacancies (221212, NS/Clear), one Management Consultant (224713, NS/Clear) and one Privacy Counsel (published Solicitors group2713, Shortage/Suitability gap). Group driver and occupation confidence remain distinct. See [Australian source and release evidence](australia-shortage-2026-11-01.md), [remaining source checkpoint](remaining-source-checkpoint-2026-11-01.md) and [the full register](data/nonpay-vacancy-coverage-2026-11-01.json).

The original OSCA273233 Solution Architect row has now been received and independently accepted for conditional duty fit: national NS/Clear, OSCA2024 v1.0, row456 in `2026 OSL (OSCA 2024)`, same verified six-digit workbook hash. It belongs to a separate next candidate108/197, not this live106 release. No additional coverage is counted here.


## Published scope and conditional role use

| Internal role | Vacancies | Published ANZSCO scope | National 2026 rating | Confidence | Published driver |
| --- | ---: | --- | --- | --- | --- |
| Treasury Specialist | 2 | 221212 Corporate Treasurer, six-digit occupation | NS — No shortage | Clear | Not supplied |
| Management Consultant | 1 | 224713 Management Consultant, six-digit occupation | NS — No shortage | Clear | Not supplied |
| Privacy Counsel | 1 | 2713 Solicitors, four-digit unit group | S — Shortage | Not supplied | Suitability gap |

The first two references retain their exact six-digit scope. The Privacy Counsel reference is explicitly the broader published Solicitors group, not a privacy-specialist or inferred six-digit 271311 rating. Official methodology Appendix C independently defines four-digit group ratings; where constituent ratings differ, the largest employment-share rating is used. This separately published group output can be used at its true scope without substituting or deriving a six-digit rating. The application does not derive a group rating or transfer it to a specialty.

These are national point-in-time employer recruitment assessments for **2026**, not forecasts, shortage severity scores or an independently verified October publication date. “Clear” is qualitative evidence confidence, not a probability. “Suitability gap” is a published main-driver category concerning qualified candidates who may not meet employer suitability requirements. It is not a confidence label, a measured skill gap in this company, or a causal finding about an individual applicant. The group's unavailable confidence remains null.

NS does not guarantee easy hiring, sufficient local candidates or immediate availability. No state ratings, time-to-fill, applicant counts, employee proficiency, training duration or financial approval follow from these records. National guidance does not certify a person's credentials or authority.

## Exact original identity and extraction boundary

The owner supplied the original workbooks. The parent Linux extraction worker verified original byte counts, SHA-256 values and selected cell tuples. The local adapter author and independent reviewer received bounded extracted evidence; they did **not** inspect the original workbook notes. Official methodology and rights definitions were independently reviewed. Do not rewrite this boundary as local inspection of originals or their notes.

| Workbook | Original bytes | SHA-256 | Sheet |
| --- | ---: | --- | --- |
| `2026_occupation_shortage_list_-_6_digit_anzsco_and_osca.xlsx` | 151,746 | `9d35938318b7032f95a1f203962f83d00800622a98a8f2df17d8ace90fedcedd` | `2026 OSL (ANZSCO 2022)` |
| `2026_unit_group_shortage_list_-_4_digit_anzsco.xlsx` | 81,658 | `0eab13fc886e4b8e7852a56dfe6863b8e32101996e5e7c167495b9a030e4ec39` | `2026 Unit group Shortage List` |

Both source sheets identify national scope at `C7`, with headers on row 8. Selected rows retain:

- Occupation row 144: `A144=221212`, `B144=Corporate Treasurer`, `C144=NS`, `D144=Clear`.
- Occupation row 177: `A177=224713`, `B177=Management Consultant`, `C177=NS`, `D177=Clear`.
- Unit-group row 137: `A137=2713`, `B137=Solicitors`, `C137=S`, `D137=Suitability gap`.

The original E/F values (`1` and `2` in these selected rows) are retained only in the audit fixture. The app does not use these classification fields or interpret them as employee proficiency or app grades; they remain outside the UI, canonical AI facts and recommendations. Column D is interpreted according to source granularity: confidence for the selected occupation records, driver for the selected group record.

The immutable fixture is `releases/2026-10-21/source/lib/data/jsa-osl-selected-2026.json`. It retains the original download URLs, hashes, sheets, rows and raw cells. The conditional adapter is `lib/position-australia-shortage.ts`. This additive contract preserves all 137 previous reference objects and existing saved source versions; it does not replace earlier source records.

## Official definitions and reuse

The [2026 OSL methodology](https://www.jobsandskills.gov.au/sites/default/files/2026-10/2026_osl_methodology.pdf), including pages 5–8 and Appendix C on page 22, establishes assessment scope, confidence and group construction. The [2026 shortage driver report](https://www.jobsandskills.gov.au/sites/default/files/2026-10/2026_osd_report.pdf) supplies driver meaning. These definitions were independently read from official sources; no local methodology PDF hash or original-note inspection is claimed.

[JSA's copyright policy](https://www.jobsandskills.gov.au/copyright-and-disclaimer) applies [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) to the relevant government-authored output, subject to its exclusions. Credit: © Commonwealth of Australia, Jobs and Skills Australia, 2026 Occupation Shortage List; selected records extracted and conditional role mappings added. Retain the policy and licence links and identify modifications. Third-party content, coat of arms, trademarks, images/photos and underlying third-party input microdata are not republished. No framing or facsimile reproduction is included.

The independent review found no additional permission requirement solely because original notes were not locally read. If a specific conflicting original-note exclusion is later identified, stop the affected reuse and reconcile it; no such conflict is established by the current evidence. The former transfer/zero-byte retrieval problem is resolved by the recovered originals and is not a continuing access-denial claim.

## Review, attachment and AI contract

Explicit confirmation remains necessary. Treasury must principally concern corporate funding, liquidity and financial-risk work, not ordinary accounting alone. Management consulting must concern organizational/process analysis and improvement rather than a title-only match. Privacy Counsel must principally provide solicitor-type legal advice/drafting; no employee registration, litigation duties or privacy-specific shortage is inferred.

Showing a source is not adopting it. Existing review/cancel/attach and exact saved-revision selection apply, including stale-draft and mixed-role/country protection. Attachment changes neither allocation nor funding, cost, readiness or timing. General market lookup and saved-position explanations must use the same canonical scope and separate rating, confidence and driver fields. Saved revisions, prior chat snapshots, backups, goal isolation and Track/Review relationships remain compatible. No paid provider calls are part of this batch; mocked requests can verify context integrity but do not prove fresh model-answer quality.

## Retained review artifacts and release gates

- `integration-evidence/australia-user-originals-20261101/independent-source-readiness.json`: conditional source-readiness decision, original-verification boundary, methodology, rights and semantic requirements.
- `integration-evidence/au-osl-rights-duty-review-20261101.md`: official reuse policy and conditional role-duty assessment.
- `integration-evidence/jsa-osl-final-alternate-formats-20261101.md`: official catalogue/methodology review and prior retrieval history.
- `lib/data/jsa-osl-selected-2026.json`: bounded original cell evidence with parent Linux provenance.

These are evidence identifiers, not claims that all executor files are public downloads. Source and implementation checks, prior-reference equality, UI semantics, exact CI, isolated runtime acceptance and public desktop/mobile journeys must be reported at their actual terminal state. The verified release record below supersedes the earlier candidate checkpoint; historical evidence remains retained.

## Verified PR541 release

Merge `43cdeb453b26e3cd2b0293e5bfea07da9a950516`; exact runtime `9279edee6cf0171cf592f04cbdd9d32801d84ea3`; deployment `dpl_GDVznzWNzeWAkeM7GQeDP8TMTW63`; successful CI41339206030. Archive SHA-256 `ffc600d89bcb7079c29874a3991b38a689b3fd5ad290078167dcac5e41b5d369`; 1,291 runtime inputs and 1,146 manifest entries. Private runtime inputs remain unchanged.

Reports: `integration-evidence/position-market-australia-shortage-{stage,public}-9279ede-{1440,390}.json`. All four runs passed seven groups, with nine locally mocked explanations each, HTTP 200, empty page/bridge/blocked/mock error arrays and drained teardown. Public runs used no asset replay. Actual screenshots were inspected by the QA owner. Native public backups have the same prefix plus `-backup.json`, 1,366,410 bytes each; all 20 goals and earlier saved source records were preserved.

The canonical106 register retains prior row and release history. The separate OSCA273233 candidate has a received and independently reviewed row, but is not included in this release's coverage or QA. No fresh paid-model-output acceptance is claimed.
