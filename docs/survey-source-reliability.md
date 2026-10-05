# Survey source request reliability — local review checkpoint

## Confirmed behavior and remaining unknown

Home reads `/api/survey-sentiment` independently from the app's Attrition/Employee Listening effect. The previous page effect had no in-flight guard or cleanup and could issue another request when navigating between those pages before completion. Each endpoint request starts five existing aggregate-view queries concurrently. A single dimensions-query error causes the endpoint to reject the full response, so Listening and Exit Survey Feedback can both become unavailable. These are confirmed code paths and are reproduced with intercepted requests; they do not establish the database timeout's root cause.

No live database query, source log extraction, schema/index/access change, credentials diagnostic or model call was used. The five-query endpoint, tool/model evidence boundaries, allowlists and numeric normalization are unchanged. The database may still time out on one request. Query cost, locks, load, execution plan and source freshness remain unknown; this change is not a database-performance fix.

## Application change

A single browser-session survey request coordinator is shared by Home and the two page destinations. It has one fixed source identity: the company-wide `/api/survey-sentiment` URL, without Country/Business Unit/Level or goal parameters. It shares pending requests, reuses successful results for at most five minutes, and retains timeout/unavailable results for 30 seconds to prevent navigation-triggered retry bursts. Expiration causes no work on its own; a later read starts a request. Existing explicit Home Refresh evidence invalidates a settled entry but still joins an in-flight request.

The existing 12-second Home transport timeout bounds the shared request. Cancelling a Home subscriber does not abort another page's request. Late results cannot replace a timed-out result. A browser transport abort does not prove that an already-running database statement was cancelled. No response is persisted in browser storage, and no cross-user/server cache is introduced. Source dates and scopes are unchanged; a cached success is not relabeled as fresh or filtered.

Page effects ignore completion after departure. Re-entry consults the shared cache instead of keeping an independent successful copy indefinitely. Failed reads clear the previous survey data; errors show a generic unavailable message rather than raw source error text. Home's other source blocks and administrative Attrition remain independent. The endpoint remains all-or-nothing: this slice does not turn failed dimensions into empty/zero survey facts or expose partial query results under a loaded label.

## Optional read-only database diagnosis, not executed

If one request still times out after app-level review, inspect only definitions and estimated plans first, without executing the aggregate query:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SELECT pg_get_viewdef('public.survey_listening_dimension_summary'::regclass, true);
EXPLAIN (FORMAT JSON, COSTS true)
SELECT * FROM public.survey_listening_dimension_summary;
ROLLBACK;
```

Keep output to view structure and plan/timing metadata, not rows or raw sensitive logs. `EXPLAIN ANALYZE` is deliberately excluded. No DDL is proposed without the underlying definition, existing indexes and plan evidence; any index/view change would be a separately reviewed task.

## Validation and release boundary

Based on released main `f198c57c6d2d1ff06d2e22e877fcfb40f8a9123d`, including PR140's separately accepted contrast fix. All 1,265 unit tests pass (seven request-sharing tests). Browser checks total 526: survey reliability 30, outage fallback 78, source-scope honesty 48, unified attachment 117, phone workspace 80, palette selector 117 and retained planning-input contrast 56. Build with mandatory ML evidence guard, TypeScript, ESLint, existing analysis-artifact reproduction, consumer projection verification and whitespace checks pass. Browser requests were intercepted; no live source or model request was used.

The targeted browser sequence observes exactly one survey transport through Home → Attrition → Listening → Attrition while pending, no immediate retry after failure, one additional request on explicit Home refresh, no extra survey request when selecting US/Data & AI workforce filters, and old survey counts removed after a subsequent refresh failure. Source labels remain company-wide for surveys/administrative attrition and selected-scope for W1. Goal, owner and unanswered draft survive. Unit checks additionally cover 12-second transport behavior through a short injected timeout, cancellation isolation, aborted-before-start, expiry without automatic work, exceptions and late-response rejection.

Only six files differ from main: the Home and page consumers, one client coordinator, two regression files and this report. No API route, model tool, Home source allowlist, evidence artifact, database file or held eNPS file changes. This checkpoint is local only: no source push, PR or production release until review. PR140's remote source head remains `19d752503e45d9de6a62d6725fe6b4645d289151`.
