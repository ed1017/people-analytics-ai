# Nonpay vacancy coverage — 1 November 2026

This is a release-state record, not a claim that all 197 vacancies have complete market evidence. Root release owner updates live milestones after public acceptance.

| State at preparation | Source | Eligible vacancies | Remaining |
| --- | --- | ---: | ---: |
| Live France baseline, as confirmed by release owner | `679faf34c70f8b04afd3a63db57bb223a56e1267` | 66 | 131 |
| Japan + US Corporate Development candidate, not yet live | `339a88d532fe7a475b83d1723c4fce3f79b2f5e2` | 72 | 125 |
| Expected next milestone, subject to implementation and release checks | ESCO follow-up; not verified live coverage | 80 | 117 |

“Eligible” means at least one canonical nonpay reference matches the modeled vacancy's country and role. It does not mean complete market evidence, verified actual job duties, employee capability, applicant availability, confirmed hiring feasibility or adopted planning assumptions. Different reference kinds measure different things and must not be treated as interchangeable. Pay coverage remains a separate measure.

The inventory is `company-position-model-v2`, dated 30 September 2026. Its 197 vacant slots and country allocations are modeled, not observed vacancies or locations. The registers preserve exact IDs and the existing duty provenance. Explicit duty confirmation remains required per reference; fictional templates are not consent.

## Reproducible registers

The local integration evidence directory contains:

- `nonpay-live-france-register-20261101.json`: live baseline, per-vacancy canonical reference IDs, versions, source hashes, source kinds and country counts.
- `nonpay-candidate-japan-corpdev-register-20261101.json`: candidate computed independently from its frozen source.
- `nonpay-live-candidate-register-20261101.mjs`: read-only generator asserting clean worktrees, canonical library subtree identity to frozen commits, all 197 preserved IDs and expected totals. The checked HEAD is also recorded when packaging-only commits advance the worktree.
- `nonpay-source-gap-status-20261101.json`: prior source-research evidence. Each new row links its exact prior entry and carries forward unresolved blockers. Historical statuses are retained as historical, not mistaken for current release state.

The candidate adds five Japan vacancies with conditional occupational mean-skill references and one US Corporate Development vacancy with eight O*NET in-demand software examples. The latter adds no core-skill, outlook or pay claim. The France baseline already includes five newly eligible French vacancies.

## Country coverage

| Country | Vacancies | Live eligible | Candidate eligible | Candidate remaining |
| --- | ---: | ---: | ---: | ---: |
| AU | 9 | 0 | 0 | 9 |
| BR | 7 | 0 | 0 | 7 |
| CA | 15 | 0 | 0 | 15 |
| DE | 10 | 0 | 0 | 10 |
| FR | 7 | 5 | 5 | 2 |
| GB | 20 | 14 | 14 | 6 |
| IN | 59 | 0 | 0 | 59 |
| JP | 8 | 0 | 5 | 3 |
| SG | 11 | 0 | 0 | 11 |
| US | 51 | 47 | 48 | 3 |

Potential next eight: Germany Data Scientist (1), Frontend Software Engineer (1), Communications Specialist (2), Total Rewards Specialist (2), and Japan Data Architect (2). ESCO provides taxonomy skill associations; this does not establish measured German demand or observed Japanese employee skill. These eight are not included in either frozen register.

## Remaining work and real blockers

Read the per-vacancy registers for exact roles and IDs; these country summaries are not declarations that every alternative official source has been exhausted.

- **India:** reproduction/link permissions and individual qualification-file rights remain unresolved. Qualifications or curriculum hours do not establish market demand or employee readiness.
- **Canada:** original permitted COPS/OaSIS files and exact NOC duties remain needed; direct catalogue access was denied. Do not substitute secondary data or retry denied routes.
- **Germany:** earlier BERUFENET/shortage-source permission and original-source questions remain in the historical gap record. A separate ESCO skills slice can address only its reviewed role scope, not establish German shortage or hiring difficulty.
- **Singapore:** the original MOM September 2025 workbook was obtained and row-checked. Its linked commercial reuse terms require permission; exact duty mappings are unresolved. Counts are rounded survey vacancies, not hiring difficulty; omitted occupations are not zero. See `sg-mom-followup-20261101/audit.json`. The blocked IMDA route was not retried.
- **Brazil:** consultation access and registration barriers plus derivative-reuse rights remain unresolved; no new account or access workaround was used.
- **Australia:** original-source transport and occupation mapping remain unresolved for the reviewed candidate. A timeout is distinct from permission denial.
- **United Kingdom, remaining France/Japan/US roles:** no applicable reviewed canonical mapping is established for the remaining exact roles. Neighboring titles cannot substitute for verified duties. The US Product Manager and Customer Success roles remain unsupported by this slice.

Research candidates and open-license metadata alone do not count as coverage. Obtain permitted originals, verify reuse terms, inspect exact rows and definitions, confirm duty conditions, then complete implementation, regression tests and public acceptance before moving a milestone to live.
