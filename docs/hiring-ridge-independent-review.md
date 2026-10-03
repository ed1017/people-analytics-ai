# Independent ridge candidate review

Historical review of the original candidate. The subsequent [holdout-boundary slice](hiring-holdout-boundary.md) addresses the development wrapper limitation below; it still does not establish globally untouched data or real performance.

Reviewed remote candidate `8f1b4d172b4f61396f2d28338a19a6e567502851` against its direct base `be582c66b183c3d590d0b515e4d5a110d282139e`. The exact candidate was present at `refs/heads/cloud-hiring-ridge-review` and was fetched without modifying remote refs. Review occurred in the separate `local-hiring-ridge-review` worktree. The contextual-prompt branch was left at `2e38e7a40a77a0f0253e85cc595ab81d34136235`.

No concrete implementation defect found. No solver, evaluator, protocol, product, database or dependency source changes were needed. The candidate's sum-squared log-duration loss plus lambda times squared coefficients, population-standardized opening-month sine/cosine predictors, unpenalized intercept and augmented Givens QR agree with the described estimator. Only the fixed penalties 0.1, 1 and 10 are accepted. Calendar constants, finite arithmetic and output range checks match the declared method.

Five independent synthetic tests in `tests/hiring-ridge-review.test.mjs` add:

- Verification of the zero residual-sum intercept condition and both penalized normal-equation gradients, across all nine fold/penalty combinations on imbalanced calendar data. Population scales and inverse-transformed predictions are checked independently using trigonometric features.
- Perturbation of every nontraining target separately for all three development folds, with unchanged fitted output when eligibility is preserved.
- Perturbation of scored opening months within their development window, which changes scoring features without changing training means, scales or coefficients.
- Excluded internal-population rows cannot change fitting, preprocessing or predictions.
- A boundary test demonstrating that holdout eligibility still gates the wrapper.

The last point is a material protocol limitation, already disclosed in the candidate: the wrapper calls the existing whole-dataset evaluator, including holdout eligibility and baseline computations. This is **not an untouched-holdout experiment**. The selected solver's preprocessing and coefficients use only the evaluator's training IDs, but this module does not implement settings locking, final holdout fitting, penalty selection or a complete acceptance artifact. Synthetic declarations are not verified company provenance. No company-model performance or deployment readiness is established.

Full repository validation: 509 unit tests pass (504 candidate tests plus five independent review tests). Full lint, standalone TypeScript and genuine production build also pass. Logs: `/tmp/ridge-review-{unit,lint,ts,build}.log`. No browser behavior or product integration changed; no browser/device validation is claimed for this Node-only review. No live API, authentication, Supabase, OpenAI, private data or status-API request was made. No push, PR, merge or deployment was performed during review.
