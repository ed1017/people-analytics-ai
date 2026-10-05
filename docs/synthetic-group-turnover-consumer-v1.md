# Verified synthetic group turnover consumer

This is a Node-only verifier plus a serializable display projection of the tested evidence at `2d9dd96329c42cac89024f7f8f64fb67f18bb502`. It does not regenerate the synthetic datasets, rerun the 500 validation histories, alter model outputs or create a live source/model endpoint.

`lib/ml/group-turnover-consumer-pins.json` fixes the SHA-256 values of the original workforce manifest and group forecast report. The verifier checks these bytes, their protocol/config relationships, all 63 original evidence files (including compressed truth/release files and validation audit), and 13 recorded implementation files. It recomputes the 20 uncertainty gates from the pinned validation audit and projects only the 60 reviewed demo cases. Truth, individual records, raw validation rows, stock/exposure data and per-seed diagnostic candidate ranges are not emitted.

`lib/data/synthetic-group-turnover-consumer-v1.json` is the saved projection. Its identity also binds the consumer implementation and pins. A saved identity alone is insufficient: loading compares the entire saved projection with newly verified local evidence. Missing or altered evidence returns `unavailable`; an edited/stale projection returns `stale`. Both clear every case and all numerical evidence payloads.

Human-readable status accompanies the data:

- Synthetic evidence verified; operational forecasting remains unavailable.
- 500 separately seeded histories describe this simulation; they do not establish real workforce accuracy.
- Two of 20 family/group uncertainty checks passed; 18 remain unavailable.
- Qualified assessment ranges apply only to the July–September quarter total and are retrospective at the simulated July 1, 2027 scoring cutoff. They were not available at the historical forecast origin.
- Every October–December interval and actual total remains null; that quarter is reserved and unscored.
- Small-group rows retain unavailable status and reasons, with no counts, comparison metrics or ranges. Regime-reversal failures retain zero covered out of 100 available ranges for both large groups. Reporting stress distinguishes available count forecasts from unavailable calibration ranges.

## Integration for the UI owner

Use the server/offline entrypoint and pass its serializable return value to a separately reviewed client component:

```js
import {loadGroupTurnoverConsumer} from '../lib/ml/group-turnover-consumer.mjs';
const view = await loadGroupTurnoverConsumer();
// Render no cases unless view.status === 'current'.
```

The Node verifier must not enter a client bundle. If the UI uses a statically imported JSON projection instead, run the consumer `--check` as a mandatory prebuild/CI step so stale evidence cannot silently ship. Do not treat the client-supplied copy as fresh evidence. A deployed runtime loader needs the local pinned evidence files packaged alongside the verifier; absence deliberately returns unavailable. No such UI/build integration is included here.

Use `evidenceStatus`, `dataset.sourceEvidenceStatus`, `validation.label`, and the uncertainty label/reasons alongside figures. Keep family, seed, group, calendar targets, cutoff and last released month visible in the explanation. The two count methods remain a fixed comparison; no new winner selection occurs. The 500 histories do not become 500 independent real observations, and groups/months must not be presented as independent validation samples. Do not substitute these synthetic values into the existing hiring, satisfaction or operational forecast outputs.

## Verification and update policy

```sh
node --test tests/synthetic-workforce/group-consumer.test.mjs
node tests/manual/generate-group-turnover-consumer.mjs --check
# Regenerates only the new consumer projection, never the source evidence:
node tests/manual/generate-group-turnover-consumer.mjs --write
```

Changed model/generator evidence requires its own evaluation and review, then an explicit pin update. `--write` cannot bless changed source evidence. The test suite covers source/report/artifact hash mismatch, changed pins, missing files, stale caches retaining a valid-looking identity, suppression, reversal failures, retrospective qualification and unavailable year-end ranges. All 1,251 repository tests pass, including ten new consumer tests; targeted ESLint, TypeScript, projection reproduction and whitespace checks pass. Independent read-only review confirmed the checks and did not rerun the 500-history experiment.

Main, Home/navigation, production, database/security settings and eNPS are outside this milestone. Existing generator evidence and hiring/satisfaction outputs remain byte-identical.
