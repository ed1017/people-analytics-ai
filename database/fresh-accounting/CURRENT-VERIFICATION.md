# October 22 accounting reconstruction

The exact bootstrap-current.sql SHA-256 is 6198f07dfb7af9273c518755bd4d54a13f032a479f4148bb7c57ed0fa7528f83.

PostgreSQL 17.11 isolated localhost rehearsal passed **23/23** checks on October 22. No production connection or provider call occurred. The temporary process was stopped after testing.

- bootstrap transaction rolls back completely
- exact bootstrap installs with no records or allowance
- all columns match the current-release schema receipt
- repeat bootstrap refuses existing schema without changing it
- uninitialized database refuses admission
- all six tables have RLS and API roles cannot read
- disabled fresh rollout refuses admission
- empty SUM regression admits first call without invented seed hold
- policy and expiry mismatch refuse admission without new rows
- unknown or invalid usage retains full hold
- verified receipt preserves gross and settles conservative cost
- identical replay no-op and conflicting replay rejected
- least privilege denies raw receipts cap reset and operator settlement
- receipt and settlement histories reject owner mutation
- duplicate provider response rolls back and preserves hold
- settlement rollback preserves all accounting
- old unmatched hold cannot automatically settle
- second model uses its own pinned rate
- bounded4k policy admits its exact maximum and settles verified usage
- bounded4k receipt rejects output above enforced ceiling
- concurrent receipt settles exactly once
- concurrent admission preserves cap including uncertain hold
- append-only correction debit halts admission at overrun

The bounded policy boundary uses 1,050,000 input tokens and 4,000 output tokens, charging 4,686,000 microUSD. The next output token is rejected. These are historical pinned policy tests, not a fresh pricing certification.
