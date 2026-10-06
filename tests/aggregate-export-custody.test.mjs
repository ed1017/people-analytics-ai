import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { captureAggregateExport, verifyAggregateExport } from '../lib/ml/aggregate-export-custody.mjs';
import { runCustody } from './manual/aggregate-export-custody.mjs';
const bytes = await readFile(new URL('./fixtures/aggregate-exit-history.json', import.meta.url));
const now = '2026-10-06T12:00:00.000Z';
const clock = () => now;
const fixture = () => JSON.parse(bytes.toString('utf8'));
const encode = value => Buffer.from(JSON.stringify(value));
const capture = value => captureAggregateExport(value, { clock });

test('custody: exact-byte deterministic packaging never upgrades source truth or historical readiness', () => {
  const sidecar = capture(bytes);
  assert.deepEqual(capture(bytes), sidecar);
  assert.equal(sidecar.payload.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(sidecar.payload.byteLength, bytes.length);
  assert.equal(sidecar.capture.capturedAt, now);
  assert.equal(sidecar.capture.sourceFirstObservedAt, null); assert.equal(sidecar.capture.sourceRevisionHistory, null);
  assert.equal(sidecar.capture.completion, null); assert.equal(sidecar.source.observationBasis, 'unknown');
  assert.equal(sidecar.readiness.history.length, 0); assert.equal(sidecar.readiness.forecastEligibility.status, 'blocked');
  assert.ok(sidecar.readinessContract.records.every(row => row.observedAt === null));
  const verified = verifyAggregateExport(bytes, sidecar, { clock });
  assert.equal(verified.status, 'verified'); assert.equal(verified.availableHistoryRows, 0);
  assert.equal(verified.sourceTruthVerified, false); assert.equal(verified.operationallyQualified, false);
  const recaptured = captureAggregateExport(bytes, { clock: () => '2026-10-06T12:00:00.001Z' });
  assert.notEqual(recaptured.captureId, sidecar.captureId); assert.equal(recaptured.payload.sha256, sidecar.payload.sha256);
  const reformatted = encode(fixture());
  assert.notEqual(capture(reformatted).payload.sha256, sidecar.payload.sha256);
});
test('custody: altered payload, hash, metadata, readiness and source-observation promotion all reject', () => {
  const sidecar = capture(bytes);
  const altered = fixture(); altered.months[1].monthEndHeadcount += 1;
  assert.throws(() => verifyAggregateExport(encode(altered), sidecar, { clock }), /mismatch/);
  for (const mutate of [
    value => { value.payload.sha256 = '0'.repeat(64); },
    value => { value.payload.byteLength += 1; },
    value => { value.source.declaredProvenance = 'verified-real-world'; },
    value => { value.reporting.recordCount -= 1; },
    value => { value.readiness.forecastEligibility.status = 'contract-pass'; },
    value => { value.readinessContract.records[1].observedAt = value.capture.capturedAt; },
    value => { value.capture.sourceFirstObservedAt = value.capture.capturedAt; },
    value => { value.sourceTruthVerified = true; },
    value => { value.operationallyQualified = true; },
    value => { value.captureId = '0'.repeat(64); },
  ]) {
    const changed = structuredClone(sidecar); mutate(changed);
    assert.throws(() => verifyAggregateExport(bytes, changed, { clock }), /mismatch/);
  }
});
test('custody: missing required and added person-level fields reject without a broader input boundary', () => {
  for (const mutate of [
    value => { delete value.manifest.sourceDefinitionVersion; },
    value => { delete value.months[0].totalExits; },
    value => { value.months[0].employeeId = 'example-person'; },
    value => { value.manifest.employeeRecords = []; },
    value => { value.people = []; },
    value => { value.months.push(structuredClone(value.months[0])); },
  ]) {
    const input = fixture(); mutate(input); assert.throws(() => capture(encode(input)));
  }
  assert.throws(() => capture(Buffer.from('month,voluntaryExits\n2026-01,0')));
});
test('custody: duplicate JSON keys including escaped aliases and invalid UTF-8 reject', () => {
  const text = bytes.toString('utf8');
  const duplicates = [
    text.replace('"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1'),
    text.replace('"schemaVersion": 1', '"schemaVersion": 1, "schema\\u0056ersion": 1'),
    text.replace('"source": "public.attrition_monthly_trend"', '"source": "public.attrition_monthly_trend", "so\\u0075rce": "public.attrition_monthly_trend"'),
    text.replace(/"voluntaryExits": (\d+)/, '"voluntaryExits": $1, "voluntaryExits": $1'),
  ];
  for (const input of duplicates) assert.throws(() => capture(Buffer.from(input)), /Duplicate JSON key/);
  assert.throws(() => capture(Buffer.concat([Buffer.from([0xc3, 0x28]), bytes])));
  assert.throws(() => capture(Buffer.alloc(262145, 32)), /bounded UTF-8/);
});
test('custody: date precision retained and future capture, extraction, insertion or periods reject', () => {
  const sidecar = capture(bytes);
  assert.equal(sidecar.source.extractedOn, '2026-10-05'); assert.equal(sidecar.source.extractionPrecision, 'calendar-day');
  assert.equal(sidecar.source.insertedAt, fixture().manifest.sourceInsertedAt);
  assert.throws(() => verifyAggregateExport(bytes, sidecar, { clock: () => '2026-10-06T11:59:59.999Z' }), /future/);
  assert.throws(() => captureAggregateExport(bytes, { clock: () => '2026-10-06T12:00:00Z' }), /Invalid UTC/);
  for (const mutate of [
    value => { value.manifest.extractedOn = '2026-10-07'; },
    value => { value.manifest.extractedOn = '2026-10-05T00:00:00.000Z'; },
    value => { value.manifest.sourceInsertedAt = '2026-10-07T00:00:00.000Z'; },
    value => { value.manifest.sourceDefinitionVersion = 'inspected-2026-10-06'; },
    value => { Object.assign(value.months[0], { month: '2026-10', snapshotDate: '2026-10-31' }); },
    value => { value.months[0].snapshotDate = '2024-01-30'; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => capture(encode(input))); }
});
test('custody: unknown January and confirmed zero remain distinct; gaps and source ordering are preserved', () => {
  const initial = capture(bytes);
  const january = initial.readinessContract.records.find(row => row.value.period === '2024-01');
  assert.equal(january.value.voluntaryExits, null); assert.equal(january.value.countStatus, 'unknown');
  const input = fixture();
  const observed = input.months.find(row => row.totalExits > 0); observed.voluntaryExits = 0;
  const omitted = input.months[2].month; input.months.splice(2, 1); input.months.reverse();
  const reorderedBytes = encode(input), result = capture(reorderedBytes);
  const zero = result.readinessContract.records.find(row => row.value.period === observed.month);
  assert.equal(zero.value.voluntaryExits, 0); assert.equal(zero.value.countStatus, 'recorded');
  assert.deepEqual(result.reporting.missingCalendarPeriods, [omitted]);
  assert.equal(result.reporting.recordCount, input.months.length);
  assert.deepEqual(result.reporting.periods, input.months.map(row => row.month).sort());
  assert.equal(result.payload.sha256, createHash('sha256').update(reorderedBytes).digest('hex'));
  assert.equal(result.readiness.forecastEligibility.status, 'blocked');
});
test('custody: unknown provenance stays unknown, and unsupported completion or vintage claims reject', () => {
  const input = fixture(); input.manifest.provenance = 'unknown';
  const result = capture(encode(input));
  assert.equal(result.source.declaredProvenance, 'unknown'); assert.equal(result.sourceTruthVerified, false);
  assert.equal(result.source.generatorVersion, null); assert.equal(result.source.completeness, 'unknown');
  for (const mutate of [value => { value.manifest.provenance = 'real'; }, value => { value.manifest.vintageHistory = true; },
    value => { value.manifest.completionEvidence = 'complete'; }, value => { value.manifest.generatorVersion = 'invented'; }]) {
    const changed = fixture(); mutate(changed); assert.throws(() => capture(encode(changed)));
  }
});
test('custody: malformed source values reject even when readiness would exclude unobserved records', () => {
  for (const change of [row => { row.voluntaryExits = -1; }, row => { row.totalExits = '79'; },
    row => { row.voluntaryExits = row.totalExits + 1; }, row => { row.monthEndHeadcount = 1.5; },
    row => { row.firstEvent = '2024-03-01'; }, row => { row.lastEvent = '2024-02-30'; }]) {
    const input = fixture(); change(input.months[1]); assert.throws(() => capture(encode(input)));
  }
  const lateSource = fixture(); lateSource.manifest.extractedOn = '2026-10-07';
  assert.throws(() => verifyAggregateExport(encode(lateSource), capture(bytes), { clock: () => '2026-12-01T00:00:00.000Z' }), /Extraction is after capture/);
});
test('custody CLI: exact payload round trip, exclusive output and invalid-input no-creation', async () => {
  assert.ok(new Date().toISOString().slice(0, 10) >= '2026-10-05', 'CLI uses actual clock, not injected historical time');
  const directory = await mkdtemp(join(tmpdir(), 'custody-unit-'));
  try {
    const input = join(directory, 'input.json'), output = join(directory, 'captured');
    await writeFile(input, bytes);
    const captured = await runCustody(['capture', input, output]);
    assert.equal(captured.status, 'captured');
    const payloadPath = join(output, 'payload.json'), sidecarPath = join(output, 'custody.json');
    assert.deepEqual(await readFile(payloadPath), bytes);
    const before = await readFile(sidecarPath);
    const verified = await runCustody(['verify', payloadPath, sidecarPath]);
    assert.equal(verified.status, 'verified'); assert.equal(verified.captureId, captured.captureId);
    await assert.rejects(runCustody(['capture', input, output]), error => error.code === 'EEXIST');
    assert.deepEqual(await readFile(payloadPath), bytes); assert.deepEqual(await readFile(sidecarPath), before);
    const badInput = join(directory, 'invalid.json'), neverCreated = join(directory, 'must-not-exist');
    const invalid = fixture(); invalid.months[0].employeeId = 'not-allowed';
    await writeFile(badInput, encode(invalid));
    await assert.rejects(runCustody(['capture', badInput, neverCreated]));
    await assert.rejects(stat(neverCreated), error => error.code === 'ENOENT');
    await writeFile(payloadPath, Buffer.concat([bytes, Buffer.from('\n')]));
    await assert.rejects(runCustody(['verify', payloadPath, sidecarPath]), /mismatch/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('custody CLI: sidecar duplicate and escaped keys, invalid UTF-8 and oversized bytes reject', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'custody-sidecar-unit-'));
  try {
    const input = join(directory, 'input.json'), output = join(directory, 'capture');
    await writeFile(input, bytes);
    await runCustody(['capture', input, output]);
    const payload = join(output, 'payload.json'), sidecar = join(output, 'custody.json');
    const valid = await readFile(sidecar), text = valid.toString('utf8');
    assert.equal((await runCustody(['verify', payload, sidecar])).status, 'verified');
    const malformed = [
      Buffer.from(text.replace('"operationallyQualified": false', '"operationallyQualified": true, "operationallyQualified": false')),
      Buffer.from(text.replace('"operationallyQualified": false', '"operationally\\u0051ualified": true, "operationallyQualified": false')),
      Buffer.from(text.replace('"sourceFirstObservedAt": null', '"sourceFirstObservedAt": "2024-01-01T00:00:00.000Z", "sourceFirstObservedAt": null')),
      Buffer.concat([Buffer.from([0xc3, 0x28]), valid]),
      Buffer.alloc(262145, 32),
    ];
    for (const candidate of malformed) {
      await writeFile(sidecar, candidate);
      await assert.rejects(runCustody(['verify', payload, sidecar]));
      assert.deepEqual(await readFile(payload), bytes);
    }
    await writeFile(sidecar, valid);
    assert.equal((await runCustody(['verify', payload, sidecar])).status, 'verified');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('custody CLI: rejected payload contents are not printed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'custody-diagnostic-unit-'));
  try {
    const marker = 'PRIVATE-PAYLOAD-MUST-NOT-BE-ECHOED', input = join(directory, 'bad.json');
    await writeFile(input, '{"unexpected": "' + marker);
    const result = spawnSync(process.execPath, [new URL('./manual/aggregate-export-custody.mjs', import.meta.url).pathname, 'capture', input, join(directory, 'absent')], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.ok(result.stderr.includes('Aggregate custody failed'));
    assert.ok(!result.stderr.includes(marker));
    await assert.rejects(stat(join(directory, 'absent')), error => error.code === 'ENOENT');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
