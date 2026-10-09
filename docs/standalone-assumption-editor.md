# Standalone planning assumption editor

`/planning/assumptions` offers an optional, deterministic managed-services illustration, linked from Planning Overview in a new tab. Users explicitly open the editor, change assumptions, review the calculated workload/capacity gap, cancel, or reset. Unknown inputs and units remain unknown. Changes are held only in the page's React state and are not saved as goals, plans, observations or workforce records.

The calculation and editor derive from the reviewed `a8c08d1` source. The calculation has only two pure runtime dependencies: the existing bounded shape validator and dataset-token syntax validation. A request identity type is narrowed to the two fields actually read; no conversation service, provider, store or dataset resolver is imported. The editor's explanatory copy is adapted to this standalone lifetime, without promising unavailable chat or plan-saving actions.

This release deliberately exposes only the conditional effort illustration. It does not infer available capacity from workforce headcount and does not assess complete staffing, source release, manager feasibility, delivery coverage, costs or measured progress. It does not enable the pending Home conversation runtime, goal-progress entry or workload save/link functionality.

The production base is `f7a8f237de280b247822c8389f39813730bf3c64`. Existing API routes, app flags, storage formats, data bindings, model settings and public release contents are unchanged. The Planning Overview addition is a navigation link; the root conversation behavior is preserved.

Validation: eight calculator/editor regressions, TypeScript, affected lint and a Next 16.3.6 production build with Webpack passed. The actual rendered route passed 34 desktop/mobile browser assertions, including cancellation, invalid input, unresolved units, reload semantics, unchanged saved decision bytes and zero application API calls. The local default Turbopack build could not follow the shared dependency-directory symlink outside the worktree; hosted build verification is separate. The optional editor has a specific whole-month validation message; calculation and provenance rules are preserved.
