# Visitor position-planning journey

## Confirmed gap

A fresh public desktop visitor closed the introduction, inspected Workforce risks, opened Talent Inventory through navigation, selected 12 vacant positions and saved an allocation of 3 hire / 6 repurpose / 3 train in General exploration. No goal or saved plan was preseeded. The save succeeded, but **Track saved position scenarios** opened Action plans with only a request to select a goal on Overview. There was no direct continuation to the tracking setup.

The source confirms the mismatch: position allocations support General exploration, while dated result targets require a saved goal. The risk-card action intentionally removed by the owner is not restored.

## Bounded correction

An explicit review and confirmation creates a tracking goal from validated saved position allocation and funding revisions. The existing atomic decision-store transaction preserves General exploration and copies only the saved records, rebinding their outer goal identity. Unsaved position edits, chat and unrelated fields remain in their original workspace. No mandatory written goal, new persistence system or calculation change is introduced.

Cancellation writes nothing. Stale state, malformed records, limits and identity conflicts reject confirmation. Existing storage-failure and cross-tab recovery behavior remains in force. Existing Track and Review handle dated targets and manually recorded results; proposed positions remain distinct from ready capacity in existing vacancies.

The staged journey also exposed a presentation ambiguity: a comparable position-ready-capacity shortfall used the green result treatment. Position results now distinguish below-target capacity from met/above targets and use a neutral state when no compatible comparison exists. Other metric semantics and all calculations remain unchanged.

## Acceptance

PR483 merged as `2a4fc1e46bb3dd32789dff9764a86257a426b183`. Runtime `021fa8f0f14cc24dc12ad899182785dab217b082` was promoted as deployment `dpl_FCRHwgs8dy8gcV9WwW9Q8AxhvbzG`, https://people-analytics-7s2o711gm-ed-56dc.vercel.app. Final direct public desktop (1440px) and mobile (390px) each passed seven grouped full-journey checks; final-build intro testing passed three grouped checks at each width. Both journey processes exited successfully with zero page errors, bridge errors or blocked/provider requests, and clean teardown.

Independent source/package review, 47 affected tests and exact-head CI `41139814806` passed. The full production build, TypeScript, generated-artifact checks and asset audit passed. Package SHA-256 `3ea988fae570cab14c86c30a41ebc1050cd99bd71d51b9f6cbf25146d2beea70`: 1,188 entries, 1,043 versioned source files and seven changed source files; private inputs unchanged.

The initial staged build passed seven grouped full-journey checks on each width using UI-created scenarios, not preseeded goals. The final presentation candidate passed six focused checks per width, including actual manually recorded below/equal/above results and neutral unrecorded state. Protected-browser transport teardown exceeded its 15-second drain limit and produced late route-handled entries after assertions; this is retained separately from the functional results. Desktop/mobile intro testing passed ordinary dismissal/reload, explicit opt-out/manual reopen/uncheck, and interrupted demo launch. No paid provider requests. Lab validation remains owner-owned; chart overlays remain preview-only.

Public acceptance used fresh isolated browser state and UI-created scenarios: risk Details and navigation, 12 vacancies, 3/6/3 versus 4/5/3 saved alternatives, a separate proposed 0.5-FTE position/funding revision, explicit goal review/cancel/repeated confirmation, original exploration and copied-record equality, target review/cancel, manual result, Review, reload and Back/Forward. The public 7-FTE target / 6-FTE result correctly displays 1 FTE below target. Actual desktop/mobile screenshots were inspected. Evidence: `integration-evidence/visitor-journey-20261030-public-021fa8f0-settled-*`. An initial harness assertion ran before verified risk data loaded; the settled run explicitly awaited it and passed. This is not a fresh live-model acceptance claim.
