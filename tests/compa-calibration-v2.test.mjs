import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildCalibrationProposal, constructCalibrationInputs, aggregateCalibrationProposal, calibrationProtocolPath, calibrationProposalPath} from '../lib/simulation/compa-calibration-v2.mjs';
import {aggregateJobCompa} from '../lib/compensation-ranges.ts';
import {compensationRelease, validateRelease} from '../lib/compensation-release.ts';

const root = new URL('../', import.meta.url);
const protocol = JSON.parse(await readFile(new URL(calibrationProtocolPath, root)));
const inputs = constructCalibrationInputs(protocol);
const aggregate = records => aggregateCalibrationProposal(records, inputs.bands, protocol);
const bandFor = row => inputs.bands.find(band => band.job === row.job && band.level === row.level && band.country === row.country && band.currency === row.currency);
const originalRows = aggregate(inputs.records);

// Only invented in-memory observations. Never uses a database client or snapshot file.
test('proposed underlying base pay and matching ranges are reproducible and satisfy the declared spread', async () => {
  const first = await buildCalibrationProposal(), second = await buildCalibrationProposal();
  assert.deepEqual(first, second);
  assert.equal(first.activationAllowed, false);
  assert.equal(first.publicationApproved, false);
  assert.equal(first.evidence.cutoverReady, false);
  assert.equal(first.evidence.liveCatalogMembershipVerified, false);
  assert.equal(first.distribution.constructedRecords, 6000);
  assert.equal(first.distribution.matchedBands, 300);
  assert.equal(first.distribution.withinBandPct, 90);
  assert.equal(first.distribution.belowBandPct, 5);
  assert.equal(first.distribution.aboveBandPct, 5);
  assert.equal(first.distribution.belowMidpointPct, 44);
  assert.equal(first.distribution.atMidpointPct, 12);
  assert.equal(first.distribution.aboveMidpointPct, 44);
  assert.deepEqual(first.distribution.jobMeanDistribution, [95.2,97.6,100,102.4,104.8].map(meanCompaPct => ({meanCompaPct,jobs:10})));
  assert.deepEqual(first, JSON.parse(await readFile(new URL(calibrationProposalPath, root))));
});

test('every numerator was constructed from its exact job/level/country/currency band and actual FTE', () => {
  assert.equal(inputs.records.length, 6000);
  assert.equal(new Set(inputs.records.map(row => row.id)).size, inputs.records.length);
  const fte = new Set();
  for (const row of inputs.records) {
    const matches = inputs.bands.filter(band => band.job === row.job && band.level === row.level && band.country === row.country && band.currency === row.currency);
    assert.equal(matches.length, 1);
    const band = matches[0];
    const ratio = 100 * row.annualContractedBase / row.fte / band.midpoint;
    assert.ok(ratio >= 76 - 1e-7 && ratio <= 124 + 1e-7);
    assert.ok(row.date >= band.effectiveFrom && row.date < band.effectiveTo);
    assert.equal(band.minimum, band.midpoint * 0.8);
    assert.equal(band.maximum, band.midpoint * 1.2);
    fte.add(row.fte);
  }
  assert.deepEqual([...fte].sort(), [0.5,0.8,1]);
  assert.deepEqual(protocol.jobs.map(job => job.code), compensationRelease.jobCodes);
});

test('display values are recomputed from pay, never clipped, normalized or fitted after aggregation', () => {
  const changed = inputs.records.map(row => row.job === 'AI-ARCH' ? {...row, annualContractedBase: row.annualContractedBase * 3} : row);
  const rows = aggregate(changed);
  assert.ok(rows[0].meanCompaPct > 200);
  assert.equal(rows[0].meanCompaPct, Number((originalRows[0].meanCompaPct * 3).toFixed(4)));
  assert.deepEqual(rows.slice(1), originalRows.slice(1));
});

test('job mean preserves individual matched ratios; no ratio-of-sums or cross-currency pay arithmetic', () => {
  const changed = inputs.records.map(row => {
    if (row.job !== 'AI-ARCH') return row;
    const band = bandFor(row);
    const ratio = row.level === 'DEMO-IC2' ? 50 : 150;
    return {...row, annualContractedBase: band.midpoint * row.fte * ratio / 100};
  });
  assert.equal(aggregate(changed)[0].meanCompaPct, 100);
  const jobRows = changed.filter(row => row.job === 'AI-ARCH');
  const wrongRatioOfSums = 100 * jobRows.reduce((sum,row) => sum + row.annualContractedBase / row.fte, 0) / jobRows.reduce((sum,row) => sum + bandFor(row).midpoint, 0);
  assert.notEqual(wrongRatioOfSums, 100);
  const parity = aggregateJobCompa(changed, inputs.bands, protocol.snapshotDate);
  for (const row of aggregate(changed)) assert.equal(row.meanCompaPct, Number(parity.find(stat => stat.job === row.job).meanPct.toFixed(4)));
});

test('FTE basis is invariant and currency mismatches cannot match a convenient other-country range', () => {
  const halfTime = inputs.records.map(row => ({...row, annualContractedBase: row.annualContractedBase / 2, fte: row.fte / 2}));
  assert.deepEqual(aggregate(halfTime), originalRows);
  const wrong = inputs.records.map(row => row.job === 'AI-ARCH' ? {...row, currency: 'EUR'} : row);
  const result = aggregate(wrong);
  assert.equal(result[0].status, 'withheld');
  assert.equal(result[0].meanCompaPct, null);
  assert.equal(result[1].status, 'withheld'); // Deterministic companion, not an invented zero.
  assert.deepEqual(result.slice(2), originalRows.slice(2));
});

test('missing, mismatched or ambiguous sources never become zero; missing cells retain withholding', () => {
  for (const change of [{annualContractedBase:null},{annualContractedBase:0},{annualContractedBase:Infinity},{fte:null},{fte:0},{fte:2},{date:'2027-09-30'},{basis:'total_labor_cost'},{country:'GLOBAL'},{level:'unknown'}]) {
    const records = inputs.records.map((row,index) => index === 0 ? {...row,...change} : row);
    const result = aggregate(records);
    assert.equal(result[0].status,'withheld',JSON.stringify(change));
    assert.equal(result[0].meanCompaPct,null);
    assert.equal(result[1].status,'withheld');
  }
  const allAmbiguous = aggregateCalibrationProposal(inputs.records, [...inputs.bands, ...inputs.bands], protocol);
  assert.ok(allAmbiguous.every(row => row.status === 'withheld' && row.meanCompaPct === null));
  assert.throws(() => aggregate([...inputs.records, inputs.records[0]]), /Duplicate/);
  assert.throws(() => aggregate([{...inputs.records[0],job:'unmapped'}]), /Unmapped/);
});

test('larger unknown cells have explicit partial coverage and small eligible cells remain wholly withheld', () => {
  const partial = aggregate(inputs.records.map((row,index) => index < 5 ? {...row,annualContractedBase:null} : row));
  assert.equal(partial[0].status,'reviewable');
  assert.equal(partial[0].coverage,'partial');
  assert.ok(partial[0].meanCompaPct > 0);
  assert.ok(!('eligible' in partial[0]) && !('missing' in partial[0]) && !('coveragePct' in partial[0]));
  const small = aggregate(inputs.records.filter((row,index) => row.job !== 'AI-ARCH' || index < 4));
  assert.equal(small[0].status,'withheld');
  assert.equal(small[0].coverage,'withheld');
  assert.equal(small[1].status,'withheld');
});

test('worked examples use contracted base divided by FTE and the local-currency matched midpoint', async () => {
  const {workedExamples} = await buildCalibrationProposal();
  assert.deepEqual(workedExamples.map(row => row.compaPct), [96,100,108]);
  assert.deepEqual(workedExamples.map(row => row.currency), ['USD','CAD','GBP']);
  for (const row of workedExamples) {
    assert.equal(row.annualBaseAtOneFte, row.contractedAnnualBase / row.fte);
    assert.equal(row.compaPct, 100 * row.annualBaseAtOneFte / row.rangeMidpoint);
    assert.match(row.label, /not extracted/);
  }
});

test('v1 manifests, fixtures, formulas and generated artifacts stay byte-for-byte frozen', async () => {
  for (const [path,expected] of Object.entries(protocol.protectedV1Sha256)) {
    assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),expected,path);
  }
  await assert.rejects(buildCalibrationProposal({read:async path=>path==='lib/data/compensation-release-v1.json' ? Buffer.from('changed') : readFile(new URL(path,root))}),/Protected v1 file changed/);
  assert.throws(() => validateRelease(originalRows)); // A v2 proposal is not accepted by the active v1 wire contract.
});

test('no cohort records or active flags enter the artifact, and no route/UI/default imports the proposal', async () => {
  const proposal = await buildCalibrationProposal();
  assert.equal(proposal.evidence.generatedCohortRecordsIncluded,false);
  assert.equal(proposal.evidence.existingPeopleRead,false);
  assert.equal(proposal.evidence.existingPayRead,false);
  assert.doesNotMatch(JSON.stringify(proposal), /"annualContractedBase"|"employee_id"|"base_salary"|"id":"compa-calibration/);
  for (const path of ['app/api/compensation-job-release/route.ts','app/api/compensation-ranges/route.ts','components/compensation-job-ranges.tsx','components/pages/compensation-page.tsx','package.json']) {
    assert.doesNotMatch(await readFile(new URL(path,root),'utf8'),/compa-calibration-v2|compa-calibration-proposal-v2/);
  }
  assert.throws(() => constructCalibrationInputs({...protocol,activationAllowed:true}));
  assert.throws(() => constructCalibrationInputs({...protocol,publicationApproved:true}));
});
