# Bounded Home requests and business-unit association

Runtime source: f77b238f63f98a0da4b432c9af8701ad5b68cb43.

Home now enforces a 4,000-token output maximum (including reasoning), with a $4.686 conservative per-round reservation. Input remains bounded by the full 1,050,000-token context. Existing long-context upper rates, margin, per-round admission, verified settlement and the cumulative $20 cap remain unchanged. Incomplete or unverified calls retain their holds. This does not guarantee every multi-round answer can finish when remaining funds are low.

The corresponding guarded database migration adds a policy to the existing reservation and settlement functions, retaining older policies, permissions and accounting records. It is deployment-specific and deliberately refuses mismatched baseline hashes; do not apply it blindly to a fresh database.

Home recognizes engagement/turnover association intent and retrieves the complete eight-business-unit partitions. It reports an unweighted descriptive correlation using September engagement favorability and January-September voluntary turnover, explicitly disclosing different windows, synthetic data, small sample and non-causal interpretation. Unsupported populations or periods produce a specific limitation. No provider call is needed for this comparison.

Validation: 49 focused route/policy tests, 24 application tests, TypeScript, focused independent review, 13 local PostgreSQL checks plus actual-admission rollback and two-session cap race. No paid acceptance call was made for this increment. Production verification is recorded separately after deployment.
