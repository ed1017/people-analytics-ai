# Local Home measures and forecast readiness integration

Local integration preserves source history: success measures `0eb540c6ff7642f778823ba5bc67b72299fb3380` (including attachment audit `707bc17e52278a76b361e9959b77cf984b6bae82` and PR127 `a402304888b65cf6a026e14eda50c174b5118a0a`) merged with remotely verified forecast readiness `91519b462f911f35ae7680033582f4e0aef1b4de`. Merge commit: `a4be069eaa72a627df35512f8b4fb325d966bc31`. No conflicts or product changes were needed. The forecast component fixture now reads either Turbopack or Webpack CSS and resolves the root React instance.

Validation on the combined source:

- 1,027 unit tests, no failures or skips; lint, TypeScript and production Turbopack build pass.
- Both generated forecast artifacts pass their reproduction checks.
- 603 browser assertions: success measures 36; linked attachment 48; recruiter retention/edit acceptance 90; capacity adoption 36; Action Plan pilot 39; capacity flow 72; compact layout 57; forecast readiness fixture 30; synthetic count full shell 63; Action Options fixture 66 and built app 66.
- Desktop, 390px mobile and 683px zoom-equivalent reflow. These checks do not promise every response fits one screen or substitute for every browser's actual zoom behavior.
- Goal discovery through explicit preparation, edit, save, calculation, attachment and reviewed linked updates; immutable prior attachments; duplicate-click protection; storage failure; goal/plan/evidence/scope changes; missing inputs and unsupported capacity scope.
- Goal-specific source/user/illustrative baseline provenance, unknown baselines and targets, renewed scope review, stale calculations and pending acceptance.
- Operational forecast unavailability, conditional synthetic totals, missing operational inputs, and withholding altered/missing evidence. No real-world forecasting qualification or causal retention effect is claimed.

Browser requests used intercepted synthetic fixtures. The local production server ran on port 3143. Logs are `/tmp/combined-unit.log`, `/tmp/combined-lint.log`, `/tmp/combined-tsc.log`, `/tmp/combined-build.log`, and `/tmp/combined-<suite>.log`. No live model or database calls were used for acceptance.

The held eNPS files are unchanged. No DB, auth, security, billing, domain, permissions or model-input boundary changes. Source branches remain intact. This is a local checkpoint only: no combined branch push, PR, hosted preview or main merge. PR127's GitHub release-requirement inventory remains unresolved after forbidden read routes and automatic merge review rejection; those routes and merge were not retried. Exact hosted-head acceptance and authoritative release checks remain outstanding.
