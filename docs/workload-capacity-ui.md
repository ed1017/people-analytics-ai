# Workload & Capacity Planning UI slice

Source successor to reviewed pure calculator commit
`0d583e3a97ecf637d1420f781f7515553c973b76`. The reviewed calculator and frozen
Home SWP conversational acceptance implementations remain unchanged.

## Supported flow

The existing Planning catalog/sidebar and `?page=workload-capacity` URL expose
one focused Limited preview. A pinned/selected goal is required. Opening the
configured illustration is explicit; there is no automatic calculation on entry.
The current goal and dataset pair determine an illustrative ActionBinding,
separate from observed workforce evidence. Report identity includes the exact
revision. Goal, dataset, revision, route or generation changes cannot publish
an old preparation or apply its editor/review into a new context.

The illustrative configuration is OPS-CLIENT / Technical Support Specialist,
January–March 2027, 5,760 monthly tickets at 20 minutes, 160 productive hours per
role, zero target baseline, and two mixed proposals: hire eight/train and
redeploy four, or hire four/train and redeploy eight. Each option has one distinct
source cohort and a shared source/manager pool. These are scenario assumptions,
not recommendations, observations, measured shortages or verified eligibility.
Every displayed calculated total/gap comes from `calculateWorkloadCapacity`.
The view shows its exact monthly workload, target available hours/gap, source
gap, manager hours/count gaps and reconciled complete cash. Details show source
removal/restoration, readiness, required/available management effort, training
program units, cash components and the calculator's checks. Unknowns display as
Unknown, with no zero-fill or trajectory claims.

Natural-language editing is the default. The local bounded interpreter accepts
one displayed assumption per message, such as “Use 6000 tickets per month” or
“Set uncommitted manager hours per month to unknown”. It does not invoke a model
or pretend to understand unsupported requests. “Open the editor” explicitly
opens the optional form; Escape/Cancel discard edits and restore chat focus.
Changes are proposed first and applied only on explicit assumption acceptance.
Only changed values gain user-entered provenance; untouched values/origins
remain intact. Applying an edit increments every option's exact revision and
invalidates plan selection/review. Selection is a proposed option, never plan
acceptance, implementation or a measured outcome.

## Integration boundary

The existing `HomePlanSummary` renders the reviewed draft's proposed tasks,
owners, scope and readiness. The app's existing `SelectedGoalProgress` continues
to display independently verified saved records. Neither receives a fabricated
workload save or link.

Current SWP save/goal-link contracts do not retain this new report's ticket,
source-team and manager constraints. The plan review therefore explicitly says
not accepted/saved and disables saving. Assumption acceptance stays local to the
view. No persistence schema is widened, no accepted-plan marker is written and
no workload observation is invented. The integration owner must authorize a
contract preserving the report and its exact current binding before saving or
linking can be enabled. This is the remaining functional boundary, not a claimed
complete plan-save journey. Changing staffing/timing/cohort configuration via
natural language is also unsupported in this first slice.

## Offline verification

`tests/browser/workload-capacity-ui.mjs` bundles the real view, shared plan
summary, illustration, edit adapter, calculator and production navigation/URL
helpers with a small synthetic navigation host. The production app shell and
its source-loading services are not started. Generated HTML/script/style bytes
fulfill only top-frame GET `http://127.0.0.1:3100/`; all unrelated requests abort.
No HTTP server or Chromium policy change is used. Provider/database transports
are blocked in the generated fixture. This is isolated component browser
acceptance, not full application or physical-device acceptance.

Desktop (1280×900) and mobile (390×844) cover initial empty view, proposed options,
calculator totals, separate assumption acceptance/plan review, real plan summary
and disabled save boundary, explicit editor focus, cancellation without mutation,
chat preview/acceptance, empty inputs/unknowns, Details, scroll/44px targets,
stale goal/dataset, route switching/repeated entry, interrupted preparation,
unsupported part-month/multiple-pool configuration and zero storage/network writes.
Screenshots and an exact source/artifact receipt are emitted under `/tmp`.

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node tests/browser/workload-capacity-ui.mjs
node --experimental-strip-types --test --test-isolation=none tests/workload-capacity-ui.test.mjs tests/workload-capacity.test.mjs tests/workforce-increment.test.mjs tests/home-mix-integration.test.mjs tests/planning-destinations.test.mjs
```

Never run: provider/model/token-count diagnostics, the inherited diagnostic API
harness, database/auth/permission changes, user desktop actions, production
startup/deployment, merge or release. Full production navigation/runtime and a
workload plan save/link remain untested; the latter is deliberately unavailable.
