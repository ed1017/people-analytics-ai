# PR438 release verification

Status: live and verified. Exact promoted alias and public desktop/mobile checks passed.

- Runtime: `5d52980ea5dd2218125d81ca62f92947784291d9`
- Source head: `a5cd9ccdd72651387946361e73b3f5152cf43e4d`
- Stage: `https://people-analytics-6f4n77br2-ed-56dc.vercel.app`
- Deployment: `dpl_BZ8Qx6VWwwj7F7J2ZnZAhSxXqwMy`
- Exact-head CI: `40455787985` — successful.
- Merge: `79d5e152932c416decc9df2f9b2652480becdf91`

## Scope and completed checks

The visible duplicate worked-example heading is removed. Shared Scenario levers and screen-reader labels remain; two guidance references were updated. Six existing tests and independent review passed. This is a presentation cleanup, with no calculation, persistence or model changes.

Protected desktop/mobile checks at 1440px and 390px passed, including heading visibility and actual $325,000/$200,000 calculations. Public checks at 1440px and 390px both exited successfully with no page errors: exactly one Scenario levers heading, no Adjust assumptions heading, and retained screen-reader labels and inputs. Actual $325,000/$200,000 priority, cost, uncovered-hours and readiness results remained unchanged. The manifest URL was corrected to the tested stage; all 930 source files verify. PR436's diagnostic/recovery acceptance and original incident uncertainty remain unchanged; this change supplies no fresh provider-answer evidence. No paid AI calls or financial/access changes are included.
