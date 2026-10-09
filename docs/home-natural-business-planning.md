# Natural business planning in Home: local candidate

This successor to `b7d0e4c` lets the ordinary Home solution conversation use checked demand and provisional staffing tools from a typed objective. It does not require a recognized starter, a mode button, an existing goal, an example role, an input form or a prebound request fixture. The existing Home solution feature flag still controls activation. This local preparation changes no deployed flag, provider setting, database or active dataset.

## Behavior and boundaries

The ordinary route advertises the existing scoped demand reference tools, a small typed staffing adapter, and a provisional-context clear tool. The model selects a relevant calculation by meaning; there is no text/keyword router. Code creates the demand identity on the first successful demand-tool call and binds it to the actual dataset, goal and request scope. The optional `businessPlanning` field lives in the existing version-1 solution conversation envelope. Old envelopes remain readable. Existing explicitly selected demand/demo modes keep their existing path.

The workload calculation remains contracts × role-slice effort, less explicitly supplied available capacity. Missing scope, time units and inputs remain unresolved. The natural tool schema does not offer the legacy Service Analyst shortcut. This first journey is useful for a narrow professional-services or service-desk slice; it is not a general model of every business mechanism. Current headcount never supplies uncommitted availability.

A comparison requires a calculated positive demand of at most 20 whole additional full-time roles. It uses the existing bounds preflight and workforce-increment calculator, once per mix, within the existing 256-evaluation ceiling. Build and Move are excluded until explicit separate-pool, release and backfill premises exist. Their exclusion does not assert that no internal capacity exists. All-hire is the reference, and at most five other bounded options are displayed by known workload shortfall, complete cash, added employees and stable identifier. This is not an optimizer for operational feasibility.

Costs, fees, readiness, training, internal uplift and constraints come from typed fields. There are no demo cost/date defaults. Training cash and hours and annual internal uplift are total path amounts held fixed across mixes; this first adapter does not model per-person training economies or negative salary changes. Inactive paths contribute no corresponding expense. Positive backfills use their supplied timing and cost fields. Full cash remains Unknown until the completeness/distinctness premise and all active costs are present. Omitted fields retain values and exact provenance; existing assumptions need a quoted current-user correction. A quoted withdrawal can restore an Unknown value.

Coverage hours use uniform monthly productivity over the stated horizon; hire arrival is prorated for its first month. A role present at the deadline does not erase an earlier workload shortfall. Pools must be separate from baseline capacity and each other. Actual release, skills, funding, shift coverage, service levels, contract wins and causal productivity remain unverified. Results distinguish these limitations from the entered budget/headcount/date checks.

The existing review/goal transaction saves only after a user reviews an option and explicitly selects it. The immutable proposal and its original demand/staffing provenance are retained in an additive selection receipt. Selection does not verify assumptions, approve funding, apply employee changes or record progress. A persistent selected-plan label prevents repeat selection of the same current option. Corrections create a new provisional result; previous saved proposal contents remain unchanged.

A current-user quoted topic change can clear provisional demand or staffing through a tool. The local Clear control and existing Home reset also clear provisional context. Saved plans and goals survive these actions. Goal, dataset and source-scope mismatches fail closed, with a clear control available. This is content integrity and scope binding, not proof that the user's assumptions match operational records.

## Offline evidence

`tests/browser/home-natural-business-full-client.mjs` renders the actual Home page, DatasetBoundary and decision store at desktop and mobile sizes. It sends the unmodified browser request body and headers to the compiled actual POST route; only provider and dataset transports are replaced. The initial request has no mode header, scenario review, saved goal or injected demand state. The test covers an arbitrary typed objective, clarification, calculated options, reload, review without save, correction, deliberate save, topic change, clear and reset, with saved proposal preservation. Requests and screenshots are private local evidence.

`tests/home-business-planning.test.mjs` covers recalculation, retained provenance, unknowns and withdrawals, bounds/scope/reference validation, positive backfills, reconciled proposal selection and clearing. Existing demand, route/model policy, workforce mix and preserved Apply-repair regressions remain applicable.

All model replies in these tests are synthetic. They prove transport/state/calculator boundaries and do not establish that a live model will interpret arbitrary language correctly, choose these tools, or produce a useful recommendation. The frozen real-provider reference and its manifest are unchanged. The earlier externally prebound acceptance harness is not natural-entry acceptance and remains unarmed.

## Review and release

This code remains separate from production and the data-preparation work. The prospective publication branch is `codex/home-natural-swp-entry-20261009`, with automatic Vercel deployment disabled in the candidate configuration. No push, PR, deployment, provider call, new credential path, database write or paid action is included.

An independent review of this exact successor is still required. Any later provider acceptance needs separate coordinator approval for the exact source, actual UI request journey, route/feature flags, transport, token/call/turn/time budget and semantic criteria. It must not inject a demand context into a supposedly ordinary request. Publication, deployment and production merge are separate decisions; approvals for PR185/PR186 do not authorize this successor. The preserved `b7d0e4c`, `b550102e` and frozen reference remain available for comparison and rollback. No destructive cleanup is proposed.
