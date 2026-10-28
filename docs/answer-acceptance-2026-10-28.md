# Answer acceptance — October 28

PR446 fixes an incomplete business-unit turnover comparison: seven available values must not be presented as a complete eight-unit ranking. Runtime `3698d2395aa004b498a63a1ad991681de9f7c200` is live on deployment `dpl_6Bq9iGkUAk6yBHV15kf6jQ7SpwWQ`; merge `3cc8b7eb6c9e68e3b0c03908716a203ce99abc8e`, exact-head CI `40702349750` passed. Independent review, 947 runtime tests, TypeScript and protected/public desktop/mobile regression checks passed.

Four actual public chat requests subsequently passed with zero model rounds: historical-period clarification, explicit acceptance of available YTD data, investigation guidance and an explicit current-period question. All eight chart values matched the public Attrition response. Earlier harness failures were pre-submit timing or omitted response headers; they are not evidence of a provider failure.

One authorized fresh provider response completed, but failed answer-quality acceptance: it said a Managed Services turnover baseline was unavailable. The captured packet contained BU engagement comparisons but only company-level turnover evidence. This is a confirmed grounding omission, not proof of a provider outage.

The follow-up candidate `d3263b1a6c50398641cc7be7b621109c28b9cb64` adds complete, dated BU voluntary-turnover rates and exit counts to the shared evidence packet and citation catalogue. It retains missing/suppressed-data and source-verification checks. It does not infer total turnover rates or causes from exit counts. Independent review, 959 runtime tests and TypeScript passed. Fresh provider retesting and final production verification of this candidate remain pending at source publication.

## Remaining boundaries

Mocks and configured readiness do not establish fresh answer quality. The original reviewer failure has no correlated request/output in the retrieved telemetry. No claim is made that every business question passes.

Official Australian recruitment-outcomes definitions are accessible, but the CSV retrieval timed out before bytes arrived. No new role/location candidate-availability or hiring-duration estimate was verified or added. Existing pay and vacancy references are not available-applicant counts. BLS access restrictions were not bypassed.

No credentials, accounting policy, access, pricing windows or saved-plan formats were changed by these fixes.
