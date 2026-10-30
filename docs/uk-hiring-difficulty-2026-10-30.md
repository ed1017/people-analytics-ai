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

PR479 is live at runtime `ce8c80050e8ed159a7550cee3ac17cf7c17917b9`, merge `f25aee0567919f7a1026cd1b2a82ede0bcac1af2`, deployment `dpl_CiTD9aZNJinH3U3KVNVHpW6SBTqP`. The exact isolated production build was promoted to www.ed-ai.app without rebuilding. Stage URL: https://people-analytics-gxeg0otap-ed-56dc.vercel.app.

Independent source/code review, 37 affected tests, full build/TypeScript/asset audit and exact-head CI `41121620996` passed. Package SHA256 is `d70556c447ed4604ec45fc49d1b9fc2a111b0d68b8a3fe137cd85a34feebf782`, with 1,178 entries and unchanged private inputs.

Staged desktop (1440px) and mobile (390px) each completed eight functional checks, combining retained runs and focused supplements. Initial harness failures involved a shifting collapsed-navigation locator, an incorrect intro-on-Labor-Market assumption, and a background Overview selector behind the mobile drawer. No application changes were needed. Reload supplements had 15-second protected-transport drain timeouts and late route-handled errors (three desktop, two mobile); no pre-teardown page/bridge errors were reported.

Final direct public desktop and mobile each passed all eight checks in one run, with zero page errors, blocked provider attempts or bridge errors and clean teardown. Coverage includes all five source rows, samples/definitions/links, keyboard and Details behavior, repeated selection, existing UK/Canada/US bundled references, Back/Forward, reload, saved-goal preservation and no horizontal overflow. Actual rendered desktop/mobile images were inspected. The existing upstream BLS route was locally excluded to avoid retrying a denied source; national-indicator availability is not certified by these checks. Missing/suppressed input behavior is covered by unit/render tests, not selectable live suppressed rows.

Historical ratings and survey-filter boundaries are documented separately in [the filter contract audit](filter-contract-audit-2026-10-30.md). Fresh provider-answer acceptance, applicant supply and completed hiring-time evidence remain outside this release. No paid calls or financial/access changes were made.
