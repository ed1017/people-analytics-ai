# Row 16: two-tab recovery investigation

The reported Perspective-only conflict did not reproduce. Two real browser tabs shared localStorage and had separate sessionStorage journals. Opening tab B, navigating it to Home, Planning overview or Brief, and changing HR to Finance left the saved envelope byte-identical and tab A's unsent request, selected goal and conflict state unchanged. The fixture mounts the actual Page, header, conversation hook, DatasetBoundary and recovery controls; transport is intercepted offline. No model request was allowed.

Two product defects did reproduce:

1. B saves a new nonempty request; A edits its stale request. Retry correctly blocks. Choosing “Keep saved versions and my request” preserves the local request and immutable attachments but drops B's saved request from shared saved data. This occurred on Home, Planning and Brief.
2. A edits an existing nonempty request while browser saving fails. On reload, Retry reports a competing-request conflict even though the saved text still equals the recovery base. That is a false conflict, separate from Perspective.

The shared correction compares remote text with the saved base before declaring a competing request. Explicit resolution of a genuine conflict preserves the displaced remote request in a separate per-goal `recoveredRequestsV1` copy with its original goal text and recovery date. An optional disclosure in the shared goal control makes copies readable on all three surfaces. Copies never become transcript messages, model inputs or plan instructions. Existing copies are retained; malformed/full histories fail without overwriting either request. The existing three-way plan/catalog merge and transaction guards are unchanged.

The browser regression uses storage-event and saved-byte barriers, not timed guesses, for competing saves. It covers unchanged Perspective state, genuine request conflicts and explicit resolution, readable copies, reload, stale attachment rejection before candidate construction, exact prior attachment retention, explicit reattachment, different-goal recovery, quota failure and actual dataset isolation. Attachment actions in the offline harness invoke the production attachment builder and atomic store transaction; no model-generated proposal or paid call is used.

Scope limits: saved-goal request recovery, not a redesign of General exploration. Ordered interleavings and stale actions are tested; no claim is made that localStorage provides an atomic compare-and-swap or that every possible simultaneous write race is eliminated. Planning data endpoints are deliberately unavailable fixtures; these checks concern persistence and recovery rather than source-data quality.

The pilot candidate fa15d5b and test repair 71b7ec9 remain unchanged. This work is a separate local commit, with no publication, live database access, authentication/RLS change or paid call.
