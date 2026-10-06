# Home conversation tools

This change builds on main `c0c76de87435dc26c31666f1874b69c4ab67f59c` (PR157). It is independent of the held workforce-rating proposal in PR158.

## Behavior

- Forecast turnover displays the existing verified monthly chart beside the exact local answer. Its population is the fixed simulated company-wide demonstration; goals and filters do not change its values. The chart retains the September gap, cutoff and October–December projection boundary. No extra request, model execution or forecast calculation is introduced.
- Compare prediction methods immediately describes all three implemented domains, method meanings, December values and held-out evaluation case counts. Different metrics/periods are not ranked. Method-specific error metrics are absent from this display artifact, so none are invented. Unsupported exclusions and horizons remain unavailable.
- Home and the shared page AI panel expose Reset conversation at their top. Reset aborts/invalidates conversation requests, clears the active draft and transient review state, and hides the preceding transcript in that page context. It preserves the original transcript in reference history, saved goals, plans, attachments and filters. Per-page reset boundaries persist with saved-goal conversations. General exploration retains its existing tab-only lifetime; the existing 200-message storage limit is unchanged. Reset suppresses the page's automatic goal takeaway so clearing a conversation cannot immediately issue a replacement request.
- The hiring-versus-training decision question and narrow paraphrases offer a proposed discovery goal even when investigation metadata is empty or malformed. Pin remains explicit, prepares plans once and retains the original question in goal context. It assumes no actual skill gap, budget, deadline or winning approach. Informational questions retain the existing route.
- Generated suggested goals append one rationale sentence to the description and offer Pin as goal / Find another issue. Explicit user goals retain Pin / Edit. Another issue preserves drafts, requires a different focus and supporting evidence, and keeps the current suggestion if the response is unsupported or merely a rewrite. Request/context/epoch guards and button gating prevent duplicate and late adoption.

## Delivery assumptions

New Home plans include editable local starting assumptions: two staff hours per participant, eight coordination hours per component, USD60 per hour, and proposed acceptance criteria. Existing participant, timing, expense and user/adopted values take priority. Existing employee-time lines override the hours-based time allowance. Cash and employee time remain separate. The preview explicitly assumes listed costs are distinct and sufficient; funding and actual costs remain unverified.

Analysis first steps may yield concrete assessment/pathway deliverables; intervention delivery steps remain named work packages and retain any existing conditional what-if outcomes. Deliverable targets do not establish completed work, skill growth or retention effects. Component owner roles remain proposals, not assignments. Component finish and planning horizon are displayed separately. A 10-person, two-component skills/pathway review proposes 36 staff hours and USD2,160 employee time, with USD3,000 existing domain cash allowances; changing the rate to USD75 yields USD2,700 employee time.

Hours per participant, Coordination hours, Staff hourly rate and Acceptance criteria are editable in chat through Send → review → Apply changes. A narrowly recognized request to fill all assumptions adds this estimate to an older draft through the same review. It does not silently discard explicit amounts or additional edits. Existing saved drafts are not upgraded on load. The optional estimate is included in new calculation snapshots; old snapshots without it retain their exact calculation shape.

The exact optional helper sentence is appended to the existing bottom plan status: “Try including your budget, timeline, stakeholders and desired outcome for a more tailored plan.” The Home composer hint is hidden while a goal/plan is active to avoid duplicate hints.

## Preserved boundaries

No database, auth, security, access, billing, domain, credential or model-input envelope changes. No live model requests are used by tests. All browser API responses are intercepted synthetic fixtures. The held eNPS files and PR158 changes are excluded. Current option toggles, explicit planner scope/calculation, saved attachments, chat edits and stale-context safeguards remain in place.

The analysis demonstration's implementation receipt is regenerated because it fingerprints the reconciliation source. Only its implementation/analysis identities change; numerical analysis output and all three forecast-domain artifacts remain unchanged.

## Empty-panel investigation

Initial Home and the exercised conversation states did not reproduce an empty tinted section. The initial-page browser assertion checks visible substantial tinted sections for actual content or controls. The unidentified cropped screenshot does not establish which component produced it. No useful panel was removed speculatively; reproducing that exact state remains an open follow-up if it recurs.

## Verification

Production-webpack build, TypeScript, lint and full unit suite are required for this branch. Browser checks cover Home discovery/reset/Pin/assumed delivery/attachment, forecasts, existing plan editing/staleness, section goal isolation, and the added-capacity workflow. Responsive cases use 1366px desktop, 390px phone and 683px reflow (200% equivalent). Screenshots were visually inspected locally. No claim is made that every response fits on one screen.
