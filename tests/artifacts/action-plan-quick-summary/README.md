# Action Plan quick summary

The summary precedes plan details in working proposals, saved alternatives and the editable plan panel. It consumes one current checked result only. No model or external data call is required.

- 8 unit cases: complete/partial/unknown/zero costs, stale results, currency/horizon mismatch, non-reconciling ledger, date endpoints and incomplete monthly series.
- 21 desktop/phone UI assertions, including a resized narrow desktop panel.
- 40 full-client conversation assertions covering revisions, discard, alternatives, pinning and reload.
- TypeScript, scoped ESLint and production webpack build passed.

Known/partial/unknown and scenario screenshots use explicit offline fixtures. Monthly scenario points in the browser fixture are deterministic test inputs, never a generated forecast or observed workforce data. The component displays only supplied checked values. The full-client screenshots show integration into the current chat layout.

FTE has no source in the checked result contract and stays Unknown. Delivery effort is not combined with staffing training effort without a reviewed basis. Monthly charts require a complete matching series; no interpolation fills missing months.

Original Library screenshot pixel download failed in this workspace. Its contents were not inferred. Placement follows the explicit top-of-plan, three-column request; final visual review remains pending.

Publication polish: the all-unknown layout uses compact rows, keeping cost/breakdown, duration/start/finish, and people/FTE/hours explicitly unknown. Both phone and desktop pass a summary height bound below 260 px. This change has no arithmetic effect. Independent review approved the main feature; chart coverage here applies to plan cards, not general chat or turnover time-series.
