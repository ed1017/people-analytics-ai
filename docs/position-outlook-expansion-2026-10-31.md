# Position outlook expansion

Status: implementation candidate, not released. Extends PR504 using nine verified records from the same original BLS workbook; no new pay or applicant-supply claims.

## Source contract

Original [BLS occupation.xlsx](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx): 413,524 bytes, SHA256 `08ee182f992d972593e64559ce467bad75967d2228f11ad5e2f86d4ec0ee6c00`. The authorized Linux research task extracted exact detailed line items in Tables 1.2 and 1.10. All nine requested codes exist in both tables; none was aggregated, substituted or inferred. [BLS public-domain terms](https://www.bls.gov/opub/copyright-information.htm) and attribution apply.

US national 2025–2035 projections. Employment, numeric changes, openings, exits, transfers and separations are published in thousands; normalized counts multiply by 1,000. Percentages remain unscaled. Published independently rounded values remain intact, even where rounded components do not sum. Median wages, self-employment shares and OOH links in the original rows are not imported by this non-pay extension. Unavailable original fields are not interpreted as zero.

| SOC | Occupation | Both source rows | Annual openings | Exits | Occupational transfers | Separations | Decade change | Change % |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 15-2051 | Data scientists | 119 | 24,800 | 5,600 | 9,700 | 15,300 | 95,400 | 34.6 |
| 15-1212 | Information security analysts | 97 | 14,100 | 3,500 | 6,500 | 10,000 | 40,600 | 21.0 |
| 15-1243 | Database architects | 105 | 3,900 | 1,300 | 2,000 | 3,300 | 6,500 | 9.4 |
| 15-1253 | Software quality assurance analysts and testers | 110 | 10,700 | 3,500 | 6,100 | 9,600 | 10,600 | 5.7 |
| 15-1255 | Web and digital interface designers | 112 | 8,300 | 3,100 | 4,300 | 7,400 | 8,000 | 6.0 |
| 13-1082 | Project management specialists | 67 | 76,500 | 22,600 | 46,600 | 69,200 | 73,200 | 6.7 |
| 13-1141 | Compensation, benefits, and job analysis specialists | 71 | 9,000 | 3,100 | 5,200 | 8,300 | 7,100 | 6.0 |
| 27-3031 | Public relations specialists | 393 | 23,000 | 7,400 | 15,100 | 22,400 | 5,700 | 1.8 |
| 41-3091 | Services sales, excluding advertising, insurance, financial services and travel | 662 | 115,700 | 35,000 | 77,300 | 112,300 | 33,900 | 2.7 |

Table 1.2 columns D/E hold base/projected stocks, H/I published numeric/percent change, K annual openings, M/N/O entry education/experience/training. Table 1.10 H/I/J hold exit/transfer/separation rates; K/L/M components; N openings. Source row coordinates are retained in the fixture. Typical preparation categories do not assess a candidate or promise training duration; services sales retains its high-school and moderate-term OJT categories rather than a bachelor/None default.

## Mapping and saved-state boundaries

Reuse reviewed US role/duty mappings. Data Scientists is a shared broader occupational reference for ML and BI; it is not a separate forecast for each internal role and its figures must not be summed across them. BI software remains O*NET `15-2051.01`, distinct from BLS `15-2051`. Database architecture duties, web/digital-interface duties and services-sales exclusions remain explicit. No role-title-only or country-only expansion.

The original eight BLS records, O*NET fixture, 29 existing canonical references and their versions must remain unchanged. New references use the same verified source identity; prior attachments continue reconstructing their original reference set. Existing allocation, finance, pay, Track/Review and backup contracts remain unchanged. No automatic attachment, latest-version selection, budget or training assumptions.

Expected conditional eligibility: outlook 17 → 39 of 197 vacancies (22 additional across 12 roles); software stays 40; pay stays 59. This is reference eligibility, not measured hiring feasibility. Tests and actual release acceptance must confirm these counts before a live claim.

## Acceptance

Pending independent source/model review, focused and aggregate tests, CI, staged/public desktop and mobile checks. No paid model calls or fresh provider-answer acceptance. UK detailed survey work, user-owned Lab and target overlay are outside this batch.
