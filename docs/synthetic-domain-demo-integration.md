# Synthetic domain demonstration integration

This integration starts from production `6717d8ffc24973ac6d69f07cf81069fc4cfb5d9b` and imports only the four required commits from `feat/synthetic-domain-predictions-v1`, ending at `978b3bb0b9b8db2ae3291af9df564f4886bae6c1`: the frozen protocol (`113971a`), domain adapters (`b01b083`), optimizer abstention (`279c9e4`) and reproducible evidence (`978b3bb`). Existing generator and model files already matched the source branch. Unrelated experimental commits were not imported.

## Display and interpretation

Attrition, Talent Acquisition and Survey Sentiment show a compact **SIMULATED DEMO** table with all three prespecified methods. This is a fixed simulated company-wide population, independent of recorded-data cohorts and dashboard filters. No candidate is selected as a winner. The original source qualification remains separate, including when recorded-data loading fails.

- Turnover: expected monthly voluntary-exit counts for October–December 2026, not rates. Latest released support is August; the reporting gap is retained.
- Hiring: opening-cohort start percentage within 90 days. All openings remain in the denominator, including cancellation, no-show and unresolved outcomes. November and December follow-up extends into 2027. Fractions are converted to percentages once.
- Satisfaction: one December quarterly mean respondent favorable-answer share, not monthly interpolation or the percentage of satisfied employees. Latest released support is June. Scoring requires comparable instruments, items, eligibility and populations.

The cutoff is September 30, 2026. Details disclose assumptions, source-readiness requirements, the fixed case, scenario limits, abstentions and the source report hash. Evidence contains 150 histories of 72 months each: 50 development histories and 100 test histories. The future reserve quarter is unscored. All 20 test survey instrument-break cases have conditional predictions but zero scored cases; this does not mean zero error. Intervals and causal effects remain null. No general superiority, operational qualification or real-world accuracy is claimed.

## Evidence and AI boundary

The build verifier checks the original report, compressed scores and every implementation hash pinned by the report before creating the compact browser artifact. `prebuild` checks this projection as well as the existing group-turnover consumer. The report SHA-256 is `5e4a2f441b9577d51deb7a6605b96503e8a5e5706f1c025d888ae7f58c0bc6e5`. A full offline reproduction regenerated all 150 histories and 750 evaluation rows with the same report hash.

Missing or mismatched evidence suppresses numerical output. The consumer rejects missing or altered projection objects, including objects carrying copied provenance. Client bundles do not include Node verification code, the generator or raw scores.

AI context is supplied only when a user explicitly asks about the simulated demonstration on its matching domain page. Ordinary recorded-data questions, Home, Workforce and automatic summary requests receive no demonstration context. The server owns the verified artifact; there is no new request input field. Instructions prohibit using these numbers as a filtered planning baseline, avoided exits, capacity, savings, ROI or an intervention effect. UI navigation and Details do not call a model or calculator.

## Validation

- Full unit suite: **1,355 passed**, including source adapter tests, corrupt/missing evidence, copied-provenance stale projections, actual chat-route context boundaries and percentage conversion.
- New production-page browser checks: **126 passed** across desktop, mobile and 200% zoom in both palettes. Coverage includes all three domains, country/business-unit/level filters, keyboard Details, recorded-source failure, overflow and absence of model/external requests.
- Unavailable-evidence browser checks: **12 passed** across the three viewport configurations.
- Existing Home plan-edit and incomplete-plan recovery browser checks: **63 + 63 passed**.
- **264 browser checks total**; lint, standalone TypeScript, production build, both generated consumer checks and full source report reproduction passed.

Tests stubbed API responses and blocked external/model requests. No live model, OpenAI credential diagnostic, database, auth, security, billing, domain, permission or model-input-boundary changes were performed. eNPS remains disabled; both held eNPS files are untouched. Hosted acceptance of the exact draft PR preview is required before release.
