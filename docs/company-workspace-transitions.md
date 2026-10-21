# Local synthetic company/snapshot transitions

This adapter is an unpublished acceptance increment after PR323. It does not add a company picker, HTTP selector, private ingestion, production session changes or a deployment. It reuses the exact versioned current-release `DatasetSession` and `DecisionStore`.

`CompanyWorkspaceSession` accepts a finite, prevalidated registry of synthetic partial dashboards. The original immutable `invented-company-<digest>:1` identifies a snapshot and its saved workspace. Each activation gets a monotonically increasing transport generation, so A → B → A reopens A's workspace while rejecting the response captured during the first A activation. Repeated selection of the current snapshot is a no-op. Reload creates a new browser session; its earlier page requests no longer exist.

Company and source revisions have separate saved envelopes. No goals, conversations, assumptions, evidence or plans transfer automatically—even within the same company when source bytes change. Returning to the exact old snapshot reopens its work. This deliberately avoids treating old evidence as current; an explicit stale-source review/copy workflow remains future integration work.

Unsaved source changes block departure. Target corruption or storage failure blocks activation and preserves the active company. `pendingWorkspace(snapshotToken)` exposes the target's recovery state without activating it, allowing explicit existing `recoverDraft()` or `retry()` flows. The handle is removed only after successful activation. Existing cross-tab conflict checks run before departure and activation; no destructive clear/reset operation is used as recovery.

Reproduce the focused acceptance with Node's native TypeScript support:

```sh
node --test tests/company-workspace-session.test.mjs
```

Nine tests cover activation/return, real DecisionStore persistence and zero values, source revision isolation, stale and mismatched responses, registry rejection, corrupt/quota-failed targets, unsaved source, cross-tab conflicts and explicit target recovery. Targeted TypeScript checking passes against ES2023. Separate local browser evidence verifies the same adapter with real localStorage/sessionStorage and a full page reload; it does not establish integrated Home picker/recovery UI acceptance.

Remaining before UI acceptance: bind server-selected activation identity to requests, add explicit source selection/recovery controls, keep chat/chart unmounted until workspace and transport agree, and run browser transitions through those controls. An activation token is not authentication. Do not expose this local registry as a production tenant selector or imply authorization from a matching digest.

Publication is held. The next publication action would be an explicitly coordinated source-only branch/PR for this adapter and tests, with Git deployment disabled and required CI; no production rollout is part of it. Actual private-company source and access approvals remain separate.
