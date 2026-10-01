# Guide & Data — content record

The user confirmed a separate Guide & Data page linked from the overall overview. This content is implemented in the local page; publication remains subject to release checks. No giant toolbar was added.

## Start with a question

The overall overview brings together a short AI briefing and a conversation. Use a guided question, ask about a finding, or describe the workforce problem you want to understand. Follow-up questions can clarify dates, populations and missing evidence. The composer can be resized vertically.

Open the source details to see where a finding comes from. The existing Workforce, Talent and Planning sections remain available for the underlying views. A source reference supports a factual observation; it does not turn an AI suggestion into an approved decision.

## What the overview reads

| Reference | Source | Scope and population | Dates and limitations |
| --- | --- | --- | --- |
| W1 | Workforce overview | Unfiltered enterprise workforce. Headcount counts people; FTE measures capacity; open positions count positions. | Uses the returned snapshot date and observed trend dates. A snapshot is not a forecast. Do not treat snapshot headcount as the denominator for every rate. |
| T1 | Skills Intelligence | Enterprise skill requirements. Counts below attainment thresholds count skills with recorded role demand, not employees. | Uses the source's returned date and population. Missing proficiency evidence is not proof of inability. Skills gaps are not automatically convertible to positions or hires. |
| P1 | Stored Planning Baseline | Enterprise modeled workforce under stored assumptions. | Shows the model's horizon dates. A source refresh date is not supplied. It is not a new model run, an observed outcome or an approved plan. |

The app uses synthetic workforce data. The currently verified Workforce and Skills snapshots report September 30, 2026; the stored Baseline spans October 2026 through December 2027. The interface should always display the returned dates rather than treating these examples as permanently current.

Dashboard country, business-unit and level filters do not narrow the overall overview or enterprise Talent sources. Read the scope shown for each source. Different populations, measures and time horizons must not be combined into unsupported rates or growth comparisons.

## Reading AI answers

- Facts should refer to a supplied source. The overall briefing uses W1, T1 and P1 references.
- Investigative questions and suggested follow-ups are interpretation, not proven causes or priority rankings.
- A missing or failed source is unavailable, not a count of zero. Independent sources can still be shown.
- The overview does not build arbitrary custom charts, invent country-level forecasts or produce unsupported hiring-cost estimates.
- Visible conversation is preserved. Model history is separated when the page or evidence context changes so old answers do not stand in for current evidence. The overview uses its own conversation context.

## Moving from evidence into Planning

Skills evidence moves into Planning only through the explicit **Carry to Planning** control and a user-stated business goal. Carried evidence remains context; it is not an allocation or a model run. Check its freshness status before relying on it.

Within Workforce Response, select a role and enter a goal, then explicitly choose **Compare evidence for this role**. Comparison loads the existing aggregate learning and movement sources. It does not change Build/Move/Buy allocations or run a scenario. Existing role-plan results are reused only when the selected role matches.

- **Build:** catalog coverage and course hours do not prove completion, proficiency improvement or time to readiness.
- **Move:** preference and proficiency thresholds do not establish eligibility, willingness or available movers. Historical movement events are enterprise context, not a role-specific supply pool.
- **Buy:** completed requisitions and historical time to fill are descriptive. The median is not a forecast; its contributing sample count is not supplied in the existing response.
- Comparison costs and future readiness, availability and hiring timing remain unavailable when the source does not support them.

Editing a comparison goal does not silently re-compare it. Compare again to use the new goal. Changing roles clears the previous comparison evidence. Planning assumptions and effective dates must be explicitly supplied for the relevant deterministic model; the AI should not invent them.

## Actions and limits

The overall overview is read-only: it retrieves existing aggregates and generates explanations. Its chat cannot invoke workforce tools or alter source records. Existing Planning controls are separate, explicit interactions; a briefing or carried evidence packet does not trigger them automatically.

Do not use these aggregate views to identify, rank or recommend employment decisions about individual employees. Current source coverage does not establish causes, individual suitability or a complete career path. Check dates, populations, scope and missing evidence before interpreting a finding.

## Version direction

V2 is a proposed direction for machine learning and predictive analytics. It is not implemented and has no agreed release date. V3 is undefined: no features, scope or date have been agreed.
