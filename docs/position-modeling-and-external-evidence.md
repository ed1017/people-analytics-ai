# Position modeling and external evidence

Candidate runtime: `7d0496874f5b995f427783488105a58f96fdab6a`; protected deployment `dpl_4hqgnfh6SN8YdUz5edfvfemYNLUQ` at https://people-analytics-gks199ze0-ed-56dc.vercel.app. Production remains PR425 until reviewed promotion.

## Position modeling

Open Scenarios → Advanced tools → Position & Workforce Design. Enter current positions and explicitly adopt their scope and date. Edit roles, levels, business units, locations, FTE, annual position costs and occupancy; add or remove proposed positions. The shared planner compares counts, net FTE and annual position cost. Position counts do not imply employee hires or departures. Unknown FTE/cost remains unknown; zero is distinct. Annual costs are entered position costs, not automatically inferred from FTE or external wages.

Attach the draft to a planning goal and explicitly save a revision in the existing browser store. Reopening or resetting preserves the original baseline and older revisions. Invalid records, overflow, storage errors and cross-goal confirmations are guarded. This is a user-entered position model; grouped demo inventory is not converted into fabricated individual position records. Existing grouped tools remain available in a disclosure.

## External evidence boundary

The role/location selector identifies BLS OEWS Software Developers sources for New York and Boston metro areas and links to the US-wide O*NET Business Intelligence Analysts profile. All local employment and wage estimates are unavailable pending a verified official download. Employment is jobs held, not available candidates; O*NET skills are occupational requirements, not local proficiency measurements. No pay, talent-pool or hiring-time figures are invented or automatically applied to plans.

The official BLS catalog at https://www.bls.gov/oes/tables.htm returned an automated-access denial. The exact workbook URL was not verified; no alternate retrieval was attempted after denial. A permitted official workbook supplied by the owner would unblock numeric integration. No paid vendor, credentials, data ingestion or new optimizer is included.

## Verification

Independent review completed. The full runtime suite passes 806 tests. Sixteen focused model/component tests cover unknowns, revision integrity, overflow, goal isolation and source semantics. Local production-build browser checks at 1440 and 390 pixels each passed nine journeys: adoption, edit/cancel, explicit goal/save, reset confirmation, reload/reopen, vacancy/unknown-cost/zero-FTE, removal, invalid-edit recovery and external role/location/source controls. No provider calls. Final staged/public evidence is recorded in the release PR.

Three unrelated aggregate failures reproduced on the released baseline and were corrected as test debt: readable role names, the actual priority-summary component import, and deliberate budget preservation with provenance. Application behavior was not weakened.
