# UK hiring-difficulty reference

The Labor Market UK selection adds a separate 2024 Professional occupations reference for the United Kingdom and its four nations. It shows the published share of vacancies that employers described as hard to fill and the subset attributed to skills, qualifications or experience shortages. Both bars use all vacancies in that occupation group as their denominator; they are not additive.

The source is the Department for Education Employer Skills Survey, SOC 2020 major group 2, all sectors, with lower occupation levels set to Total. The five-row extract retains exact published rates, rounded weighted vacancy estimates and the unweighted occupation/site sample. A detailed software occupation, city or internal company role is not inferred from this broad group. The existing software-pay reference and its saved-plan carry retain their original identities and behavior. The new reference does not populate planner assumptions.

## Provenance

- [Official dataset and field definitions](https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1)
- [Published CSV](https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/1c000555-8188-4e28-ac32-22313d8702a1/csv)
- [Methodology](https://explore-education-statistics.service.gov.uk/methodology/employer-skills-survey-2022-2024)
- [Corrected report](https://assets.publishing.service.gov.uk/media/6a1eef8d050971fbebf3bd92/Employer_Skills_Survey_2024_UK_report.pdf)
- [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)

Downloaded October 30, 2026: 35,100,885 bytes; SHA256 `557dbafc39bdcfd96ec6637d8dcaef42c6babbb467359efe7cbed67d1ca65156`. The report was corrected in June 2026. The methodology reports 22,712 interviews in the 2024 survey; an inconsistent landing-page interview count is not used. Suppressed detailed occupation cells are not filled from the broad group. Percentages are not recomputed from rounded published counts.

| Geography | Hard-to-fill share | Skill-shortage share | Occupation/site sample |
| --- | ---: | ---: | ---: |
| United Kingdom | 36.8% | 29.4% | 1,416 |
| England | 36.9% | 30.6% | 604 |
| Scotland | 41.4% | 24.5% | 356 |
| Wales | 42.7% | 31.3% | 253 |
| Northern Ireland | 22.1% | 12.7% | 203 |

This closes a dated occupation-group hiring-difficulty reference gap. Available applicant counts and completed time-to-hire remain unprovided. No denied source route was retried, no account or credential was created, and no paid model request is required.

## Release status

Candidate implementation; production publication and final acceptance are not yet recorded here. Historical ratings and survey-filter boundaries are documented separately in [the filter contract audit](filter-contract-audit-2026-10-30.md).
