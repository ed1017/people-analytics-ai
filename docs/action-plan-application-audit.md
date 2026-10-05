# Action Plan application: read-only mapping and policy proposal

Status: audit only. No automatic adoption, defaults, destination writes or source-data changes implemented. Home Action Plans currently start with unknown numeric fields. Editing marks results stale; Calculate refreshes local results explicitly.

## Existing destinations and available values

| Requested field | Existing destination | Available in current Action Plan | Safe mapping / gap |
| --- | --- | --- | --- |
| Goal | goal workspace and development.goal | Exact binding.goal | Carry exact text into same-goal development draft; never switch/overwrite another goal |
| Vendor / coach | development.custom, draft, selected; DevelopmentQuote | No provider or quote identity | Cannot infer from component name/owner. Retain an explicitly selected compatible quote with original simulated/user-provided provenance; otherwise missing |
| Sessions / hours per session | development.options[].inputs and quote | Aggregate training hours only | Cannot derive sessions, attendance or per-person hours from aggregate hours; leave missing |
| Participants | development.options[].inputs.participants | Component aggregate group memberships and counts | Only complete reviewed unique membership for the target component, not company headcount or overall bundle participants; unresolved overlap blocks mapping |
| Cost / fee | DevelopmentInputs fee, additionalFees, hourlyCost | Shared cash ledger; capacity trainingCash and loadedHourlyCost | Exact compatible hourly rate can carry. Total cash is not a per-session fee. No inversion of aggregate costs; preserve quote currency and fee basis |
| Capacity scenario inputs | workforceSolution versioned SolutionInputs | Optional single-BU/role WorkforcePlanInput | Use existing adapter to create a reviewed new draft/version, only for exact same goal/scope and confirmed added capacity; retain previous versions/results |
| Hiring / backfill counts and dates | workforceSolution | Explicit buy/backfills/arrival dates | Exact supported values can carry; internal transitions do not become added company employees |
| Scenario selection | selectedPlanningScenario goal field | Option identity A/B/C (displayed 1/2/3) | Different identity contract: cannot rename a baseline/source scenario or claim a stored scenario exists |
| Workforce headcount / source metrics | API-backed overview/planning datasets | Conditional roles and planned added employees | Read-only evidence; never overwrite with planned counts |
| Stakeholders | Home component ownerRole | Suggested role and component first step | Display responsibility; no identity assignments, notifications or operational approval |

The DevelopmentSession lives under goal field `development` via `useGoalWorkspace` in app/page.tsx. Its option array is limited to three in the current UI. Workforce capacity is separately versioned under `workforceSolution`. The PlanningSession context controls navigation and goal key; it is not a common numeric planning store. No current cross-destination transaction or apply receipt exists.

## Minimal Save and apply plan preview

Start from the exact reviewed Action Plan attachment (goal, binding, revision, input key, source IDs). Show destination, current value, proposed value, provenance and missing/blocked reason for each supported mapping. Default to preserving existing values. Offer explicit add (when capacity permits), fill-empty, or replace selected conflicting values; never silently replace an option or quote. Preserve replaced versions and original simulated/unverified labels. Recheck source and destination fingerprints immediately before committing; a changed goal, evidence, draft or destination requires a fresh preview. Apply no calculation or model call. Return an application receipt with destination revisions and skipped fields. This requires a reviewed adapter/atomicity contract before implementation.

## Proposed starting-assumption policy (not implemented)

1. Adopt exact compatible, explicitly confirmed saved inputs, recording source field and revision; do not copy an alternative's allocations merely because its goal matches.
2. Reuse a selected development quote only when the component, scope, currency and fee basis match. Keep fictional/simulated or user-provided/unverified labels. Sessions and hours can then come from that quote; participants cannot.
3. Structural catalogue costs are annual USD per position by BU, role and level, from the stored Baseline December 2027 basis. Current bundle scope has no level. Do not choose or average levels silently, treat wages as loaded cost, or present the baseline as a current vendor/hiring quote. A specific compatible level/cost basis must be reviewed first.
4. Illustrative dates, staffing mixes and program budgets require an agreed labelled starter policy. None are currently supplied. Never default unknown cost to zero, infer internal availability, or guess efficacy/retention effects.
5. One policy question: Should a missing compatible saved plan use an explicitly labelled fixed starter scenario, or first ask the user for the planning scope and budget? Any fixed scenario needs its actual proposed values and rationale reviewed before implementation.

## Finding follow-up contract audit

Current Home answer content is Markdown passed through GoalConversationMessages and ChatContent. It has presentation bullets and navigation references, not per-finding structured action bindings. Do not heuristically activate every bullet. A separate bounded contract should pair each designated finding's exact visible text with validated issue/source IDs and an explicit `Explore this finding` prompt. Click uses the existing Home context, preserves typed text, sends once and rejects stale bindings. Limited samples or unavailable segments stay limitations in the prompt; no fabricated drilldown. This change is pending, not implemented.
