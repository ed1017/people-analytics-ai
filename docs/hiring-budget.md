# Hiring budget estimates and salary-source boundary

Home can call `review_hiring_budget` for a direct headcount-and-budget question. It does not require a fabricated workload calculation. Ten proposed hires and a budget of one million yield a budget-period allowance of 100,000 per hire. They do not establish a currency, annual salary, hiring date or affordability.

The review card keeps all inputs editable and shows the base-pay subtotal, listed period costs, complete period cost, recurring annual rate, arrivals within the period and affordable headcount when supported. Blank values stay unknown. Annual recurring costs use calendar-month proration; the recruiting fee occurs once on arrival. Later starts reduce in-period spending while delaying staffing, with the annual recurring rate shown separately. No productivity, ramp, internal availability or causal savings are calculated. A budget check is conditional on explicitly supplied costs and coverage. A known cost over the cap is reported even when other costs remain unknown.

The model interprets and explains; code performs arithmetic. Tool edits retain omitted inputs and their provenance, and existing premises require a current-user correction. The local editor recalculates without a model request, retains explicit user-entry provenance, and makes the edited state available to the next conversation. Currency changes cannot relabel prior money amounts. Reload preserves the estimate through the existing conversation store. Clearing removes only this estimate. Nothing creates a saved Action Plan, approves hiring or applies an operational change.

## Salary contract prepared, live source not connected

The existing company labor-cost/FTE and frozen compa-ratio contracts do not supply comparable annual base-salary means. Neither is converted into a salary. The independent compensation demonstration and public market reference are not used as company data. This change makes no source query, endpoint, RPC, grant, policy, credential, authentication or frozen-release change. The ordinary Home grounding checks still run before model dispatch.

`resolveSalaryReference` is a pure validator for a future **separately approved** aggregate source. It requires a matching dataset token, versioned release, exact role/level/location and snapshot; one matching currency; eligible and covered counts with complete coverage and a minimum cohort of five; a positive annual base-pay mean; covered FTE and FTE range; explicit annual pay semantics and aggregation method. A contracted-pay employee mean is comparable only when cohort and proposed-hire FTE fractions match. A full-time-equivalent rate requires an explicitly normalized, FTE-weighted aggregation. Mixed currencies, small or withheld cohorts, partial coverage, unknown basis and broader-scope substitutions fail closed. Only allowlisted aggregate fields can leave the validator.

The validator does not certify or authorize a release. No aggregate input is accepted from a browser, model or saved conversation, and no live salary loader is connected. Current Home therefore displays salary unavailable and supports an explicitly labelled scenario override. The future source must be server-resolved under the existing request-pinned dataset and independently validated; client-supplied release labels would not establish authenticity.

## Scope needed before connecting a source

1. Approve the audience and exact salary disclosure: the present public app would expose newly released role/level/location salary means and cohort metadata. Existing server credentials do not authorize that new disclosure.
2. Establish annual base-pay semantics, active snapshot eligibility, employment/FTE normalization, effective dates and original-currency/FX treatment from documented source provenance. Complete fields alone do not establish these semantics.
3. Review a versioned aggregate release with minimum-cohort **and complementary suppression** across all exposed intersecting groups, a frozen population identity/digest, coverage counts and source date. Preserve existing frozen compensation and ratings releases. Do not reuse their population or denominators for a new release.
4. Approve the server-side aggregate reader and its dataset/scope binding, release attestation and fail-closed access behavior. Prefer a precomputed reviewed release to unrestricted dynamic cohort queries. Any database or access change needs its own review; this PR contains none.

Private inspection evidence and any operational SQL remain outside the repository. Tests use fictional salary aggregates and costs, not actual employee pay. The review branch has automatic Vercel deployment disabled; this is preparation for review, not a production release.
