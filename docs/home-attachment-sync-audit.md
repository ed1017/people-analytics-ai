# Local attachment synchronization audit — 2026-10-05

Base: PR127 head `a402304888b65cf6a026e14eda50c174b5118a0a`. Audit branch: `review/home-attachment-sync`. No product defect reproduced; no product code, mappings, schema or behavior changed. PR127 remains unchanged and release-blocked. Forecast branches remain separate. No hosted mutation, remote publication, forbidden-read retry or database action occurred.

## Verified supported journey

| Requirement | Evidence |
| --- | --- |
| Selected goal → reviewed attachment | Browser review requires exact source acknowledgement. Switching goals closes the review; returning requires a fresh review. Current and other-goal planning fields remain intact. Visiting a goal may initialize its empty chat record; this is separate from planning isolation. |
| Populate supported planning fields | One atomic browser-storage write publishes attachment, receipt, link ownership, compatible Development participants and explicitly selected workforce inputs. Quote/rate compatibility and additional-capacity scope require review. Nonempty manual costs default to Preserve. |
| Revise → review linked updates | Chat edit changes the working draft; explicit Save/Calculate precede attachment update. Only prior receipt-owned values still matching the destination follow automatically into the proposed replacement choice. Confirmation writes the new revision, not the prior snapshot. |
| Manual conflicts | Manually changed Development participants and linked workforce inputs survive reload. Conflict is visible and defaults to Preserve. Explicit replace records new ownership; unrelated manual fees remain unchanged. |
| Reload and stale results | Own application transitions revalidate without another model request. Previous attachments and workforce versions survive reload. Edited/stale calculations cannot be reused as current. New external evidence disables editing until explicit re-preparation; re-preparation does not apply old links. |
| Repeated clicks | Two immediate DOM clicks on initial Confirm produce exactly one storage write, attachment, receipt and link entry. Two update clicks produce one new attached version and one linked participant update. Unit tests additionally reject concurrent and replayed commits. |
| Atomic failure | Quota failure leaves attachment/receipt/destinations unchanged. Unit tests cover source/destination changes during async validation, external-tab writes, changed selection and current-context guards. |
| Unsupported or unknown mapping | Missing mapping may attach without invented destination fields/receipt. Unknown source values cannot clear known destinations. Changed component mapping does not inherit prior ownership. |

Implementation inspected: `components/home-linked-attachment.tsx`, `lib/home-linked-attachment.ts`, `lib/action-plan-application.ts` and `lib/action-plan-application-preview.ts`. Component pending/mounted/current guards and store-level in-flight/revision checks protect the transaction. Model and destination calculations are not implicit side effects.

## Fresh validation

- **46 unit tests**: linked attachment, application/preview and bundle records; `/tmp/attachment-audit-unit.log`.
- **48 attachment browser assertions**: `/tmp/attachment-audit-linked.log`.
- **36 capacity-adoption browser assertions**: `/tmp/attachment-audit-capacity.log`.
- **90 retention/edit browser assertions**: `/tmp/attachment-audit-retention.log`.
- All **174 browser assertions** pass across desktop/mobile/200% reflow with intercepted synthetic APIs. Targeted ESLint and diff checks pass.
- The only source change is stronger browser coverage: goal-switch cancellation and repeated initial/update clicks. Production build was reused because product/dependency/type source is identical to the already-built PR127 tree. No fresh build or hosted acceptance is claimed.

The browser owns synthetic prepared plans, quote selections and destination assumptions. This establishes local interaction and transaction behavior, not live model plan quality, hosted storage behavior, provider validity, real intervention effectiveness or operational approval.

## Remaining agreed outcome

The supported attachment/update contract has no demonstrated local functional gap after this audit. Do not broaden it to create providers, derive per-session fees from aggregate cash, write source headcount or treat internal moves as added company employees.

A separate concrete planning gap remains: `components/home-bundle-plans.tsx` always renders “How success is measured: Not yet assessed; confirm measures and a baseline before acting.” The agreed complete delivery-plan outcome therefore still lacks a reviewed goal-specific measurement/baseline presentation. `lib/home-plan-integration.ts` revises only existing distinct methods and makes no effectiveness guarantee; meaningful alternative diversity and complete delivery prose still require semantic acceptance. These are not repaired by attachment synchronization, and this audit adds no new fields or intervention-effect estimates.

Hosted attachment acceptance remains unverified and was deliberately not attempted under the prior denial. Edwin is handling GitHub release evidence separately; this local audit is not a merge or release approval.
