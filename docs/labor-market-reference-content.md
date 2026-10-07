# Labor Market reference content

The Labor Market panel compares the three occupations and three geographies already present in the public May 2025 OEWS extract. Users can select an occupation or geography from controls or table rows. The occupation table holds geography constant; the location table holds occupation constant. All comparisons retain the same period, all-industry scope and annual USD wage basis.

## Public data

- [OEWS tables](https://www.bls.gov/oes/tables.htm) list May 2025. The [release](https://www.bls.gov/news.release/ocwage.nr0.htm) is dated May 15, 2026; the observation period is not 2026. The existing nine wage/employment rows are unchanged and match the source-workbook re-extraction in `compensation-oews-may2025.json`. See [the existing source review](./compensation-public-benchmarks.md) for workbook provenance.
- [BLS Employment Projections table 1.2](https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm) supplies the new national 2025–2035 subset. The [release](https://www.bls.gov/news.release/ecopro.nr0.htm) is dated August 27, 2026. The three detailed SOC rows were checked on October 7, 2026 and transcribed into `bls-projections-2025-2035.json`. This is an application-authored frozen transcription, not a downloaded workbook or automatic feed. The fixture keeps published one-decimal values, including numeric changes that differ from subtracting rounded endpoints.
- [Projection definitions](https://www.bls.gov/emp/documentation/definitions.htm) identify the National Employment Matrix population and occupational openings. [OEWS technical notes for May 2025](https://www.bls.gov/oes/2025/may/oes_tec.htm) define the separate wage/employment population and wage components. BLS public-domain facts are attributed in the UI; no BLS logo is used.

| Detailed SOC | Occupation | 2025 jobs, thousands | 2035 projected jobs, thousands | Decade growth | Annual openings, thousands |
| --- | --- | ---: | ---: | ---: | ---: |
| 15-1252 | Software developers | 1,717.8 | 1,892.6 | 10.2% | 95.3 |
| 15-2051 | Data scientists | 275.6 | 371.0 | 34.6% | 24.8 |
| 29-1141 | Registered nurses | 3,465.4 | 3,660.1 | 5.6% | 180.8 |

## Scope and behavior

Outlook is national regardless of the wage geography selected. It counts total jobs, including self-employment; the local wage section covers OEWS employment. The page does not splice the series, apply national growth to local counts, or label projected openings as current vacancies. Openings include separations as well as growth. Published growth is over the full decade. No internal role match, employee attainment, company pay midpoint, cost-of-living adjustment or local recruiting prediction is inferred.

`nationalOutlookEvidence(soc)` resolves only the three exact detailed codes and returns canonical public source facts with explicit units, population and limits. It rejects O*NET suffixes, role names and caller-supplied forecasts. `marketComparisons(selection)` resolves only existing occupation/geography pairs. Unknown selections show a recoverable unavailable state.

The existing Planning carry remains the selected OEWS snapshot; it does not carry or apply national projections. Public snapshots require no runtime external request and remain usable when national macro observations are unavailable. All tables have captions, row/column headers and keyboard-focusable horizontal-scroll regions. Source/status details stay compact and expandable.

The smallest limits to broader coverage are source-reviewed additional occupation/geography rows and any required internal duties-based mapping review. State/metro outlook and additional public wage occupations are not loaded. This change needs no credentials, database writes or new service.

## Checks

`node --test tests/labor-market-reference.test.mjs tests/goal-market.test.mjs` checks compatible comparison dimensions, exact parity with the previously verified wage extract, the projection transcription and rounding, units/populations, invalid selections and unchanged canonical carry. The combined Intelligence browser suite exercises controls, mobile containment, source failures and keyboard table access. Full recursive tests, lint, TypeScript and production build belong to combined-branch acceptance.
