# Visitor position-planning journey

## Confirmed gap

A fresh public desktop visitor closed the introduction, inspected Workforce risks, opened Talent Inventory through navigation, selected 12 vacant positions and saved an allocation of 3 hire / 6 repurpose / 3 train in General exploration. No goal or saved plan was preseeded. The save succeeded, but **Track saved position scenarios** opened Action plans with only a request to select a goal on Overview. There was no direct continuation to the tracking setup.

The source confirms the mismatch: position allocations support General exploration, while dated result targets require a saved goal. The risk-card action intentionally removed by the owner is not restored.

## Bounded correction

An explicit review and confirmation creates a tracking goal from validated saved position allocation and funding revisions. The existing atomic decision-store transaction preserves General exploration and copies only the saved records, rebinding their outer goal identity. Unsaved position edits, chat and unrelated fields remain in their original workspace. No mandatory written goal, new persistence system or calculation change is introduced.

Cancellation writes nothing. Stale state, malformed records, limits and identity conflicts reject confirmation. Existing storage-failure and cross-tab recovery behavior remains in force. Existing Track and Review handle dated targets and manually recorded results; proposed positions remain distinct from ready capacity in existing vacancies.

## Acceptance

Candidate implementation. Required verification includes independent review, focused and aggregate tests, exact-head CI, isolated production staging, and public desktop/mobile introduction, risk/navigation, compare/save, confirmation/cancel, Track/Review, reload and returning-visitor checks. No paid provider requests. Lab validation remains owner-owned; chart overlays remain preview-only.
