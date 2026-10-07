# Automatic Home staffing calculations

Home starts a local staffing search for a current capacity plan and repeats it when that plan's source assumptions change. The existing Apply changes and Attach Action Plan controls review and save proposals. There is no separate search or calculation button. Explanation, comparison and attachment reuse the current verified search.

## Sources and limits

The Home source is explicitly tagged `home-assumptions`; it never manufactures saved Workforce Solution evidence. A draft with mapped Build/Move/Buy paths uses the numerical adapter's complete finite bounds, up to 1,000 calculator evaluations including the reference and 64 displayed results. Objective selection considers every evaluated feasible candidate before display truncation. The selected candidate is retained in the displayed set.

Fresh full-period external-hire scenarios can execute their existing arithmetic through the staffing calculator. They use a labeled hypothetical Home scope, the stated whole-role target, the scenario's assumed arrival at the planning start and its monthly USD rate multiplied by twelve. The default added-employee ceiling is the role target and the default coverage deadline is the horizon end. These defaults are visible planning assumptions. Recruiting fees and complete component cost coverage remain unknown.

This initial search contains **one external-hire combination**. It does not establish a better staffing mix. Build and Move stay outside those initial bounds because fresh drafts have no reviewed internal groups or whole-flow mappings. A mapped source can explore internal alternatives; merely having a learning or mobility activity does not establish internal availability. Unsupported FTE, fractional schedules, currency conversion, missing flow mappings and conflicting scenario periods remain unresolved. No global optimality, observed capacity or intervention effect is claimed.

Cash includes existing mapped obligations and activity/vendor costs. Existing employee effort stays in hours. Unknown costs or overlapping training and delivery hours cannot create a successful budget or effort check. The existing five-role scenario retains its $487,500 assumption-based subtotal and $477,500 overage against a $10,000 ceiling.

## Edits and execution

The plan's chat edits support budget, role cost, horizon, added-employee ceiling, staff-hour ceiling, coverage deadline and a named search objective. Mapped staffing sources additionally support annual hire/backfill costs, recruiting fees, total internal salary change, total training cash/hours and effective/arrival dates. A horizon edit does not silently move component dates or funding schedules; the existing explicit what-if period confirmation still applies.

A module worker executes source resolution, enumeration, report verification, candidate preparation and historical replay. The injected coordinator deduplicates exact source identities, debounces constraint changes and discards superseded work. Currentness includes the goal, evidence/planning binding, selected plan, revision, input content and preparation identity. Browser tests use the real production module worker, with only evidence and model responses intercepted.

A feasible candidate is a proposed revision. Apply saves its reconciled draft and search receipt in one local transaction. Attach saves the exact revision, receipt and immutable attachment through the existing transaction and conflict review. Applying never replaces an attachment; replacement remains explicit. Changed cash ownership reopens the affected cost reviews.

## Historical records

`homeMixHistoryV1` preserves the original draft, exact report and optional verified proposal. Each report is stored once with lossless `gzip-base64` compression. Decoding is bounded to 2 MiB before JSON validation and exact numerical replay; corrupt, stale or unsupported reports cannot be adopted. The existing 512 KiB decision limit and 3 MiB browser-store limit are unchanged. A full history blocks further saves without deleting earlier records.

Reload verifies the saved reports in a worker and displays their historical status. Prior entries and attachments remain byte-identical. Neither historical replay nor candidate staging writes to storage; the caller's explicit Apply/Attach transaction owns the write. Existing saved-workforce search reports keep their prior version and replay behavior.

## Verification

The integration tests exercise actual initial and changed-input enumeration, a 21-combination mapped source, exact cash and hour constraints, cancellation/currentness, explicit candidate application and attachment, immutable history, compressed-record tampering and decode-size limits. Browser checks cover desktop, 390px mobile and 683px reflow, plus the existing Home, answer, exit-reason and forecast-chart suites.
