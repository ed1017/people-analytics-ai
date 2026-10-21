# Public portfolio MVP acceptance — October 21, 2026

The delivered scope is a synthetic People Analytics and Workforce Planning portfolio. Real-company records, hosted tenancy and enterprise persistence are not prerequisites for this public MVP. This checklist records bounded evidence, not unrestricted AI correctness or enterprise readiness.

## Delivered scope and evidence

| Requirement | Verified evidence and limits |
|---|---|
| Workforce evidence | The public snapshot contains 9,037 synthetic people as of September 30, 2026. Workforce, compensation and turnover views use verified contracts; withheld or unsupported results remain explicit. |
| Planning and comparison | Guided scenarios, staffing options and browser-local saved proposals are available. They are planning records, not approved actions or shared enterprise records. |
| Conditional headcount what-if | Explicit monthly hires/exits for October 2026–March 2027 drive company-wide arithmetic. This is not a validated prediction or payroll forecast. |
| Grounded conversation | Reviewed provider checks cover selected planning, revisions, combinations and follow-ups. A real multi-turn staffing journey retained changed assumptions and switched to recorded turnover. A separate model-generated plan passed browser Save/reload. These samples do not prove arbitrary analytics or causal claims. |
| Home interaction | Questions and text remain left; supported current-answer visuals appear right. Desktop/mobile checks cover responsive layout, saved-plan reading, navigation and stale-answer isolation. |
| Honest presentation | Synthetic-data and assumption boundaries are explicit. Ed defined the problem, requirements and acceptance criteria; AI assisted implementation, design and testing. No realized savings, adoption or predictive-performance claim is made. |
| Reproducible public source | The versioned source has a dependency-free hash verifier. A clean-checkout public fixture replay builds and serves the UI without private inputs or credentials, with bounded recorded GET receipts. It does not reproduce live AI, narrowed filters or private calculations. |

Detailed validation and release identities are in the [versioned release notes](../releases/2026-10-21/README.md) and [reproduction instructions](../releases/2026-10-21/reproduction/README.md). The [October 17 roadmap](roadmap-status-2026-10-17.md) is historical; later release evidence supersedes its availability statements.

## Production versus source-only handoff tooling

The latest verified production mapping is local release source `a86acfa4ebc28015f2652685536750c300ca083a`, deployment `dpl_fw5A59MB2HhM74R5qzrxEAqhVmM5`. Root repository code and the versioned deployed snapshot are distinct.

PRs #321–324 added accounting-only fresh-database bootstrap, invented-company mapping/provider binding, partial Home contracts and local company/snapshot workspace recovery. These are tested synthetic handoff capabilities, not a production rollout of company switching or authentication. They do not need deployment to satisfy the public synthetic MVP. See [bootstrap boundaries](fresh-company-bootstrap.md), [company Home integration](company-home-integration.md) and [workspace transitions](company-workspace-transitions.md).

## Operational dependency

Live AI remains subject to the cumulative $20 cap and coordinated app pricing, rollout, database admission and settlement windows. The recorded expiry is October 22, 2026 at 09:59 UTC; admission stops at 09:57:30 UTC. Renewal must preserve spend, reservations, uncertain holds and permissions. A point-in-time release receipt does not guarantee perpetual availability.

## Optional extensions, not public MVP blockers

- Actual company ingestion requires an authorized source, inclusion/date rules and independent controls. No private-company readiness is established by synthetic fixtures.
- Hosted tenants, access isolation, company-specific domain contracts and enterprise persistence need separate implementation and authorization.
- Saved/versioned six-month headcount what-if persistence remains a design proposal, not an implemented feature or an approved implementation requirement.
- Predictive evaluation, defensible payroll forecasts and broader causal or operational recommendations require additional evidence and scoped acceptance criteria.

Do not treat these extensions as missing original portfolio acceptance, or start them merely because a source-only milestone has merged. Remaining work should address a reproduced defect, an existing operational dependency or a separately agreed extension.
