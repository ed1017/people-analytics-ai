/** Offline proposal only. No runtime route, UI import, data write or activation switch. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {aggregateJobCompa} from '../compensation-ranges.ts';
import {rng, integer, digest} from '../ml/synthetic-workforce/common.mjs';

const root = new URL('../../', import.meta.url);
export const calibrationProtocolPath = 'lib/simulation/compa-calibration-v2-protocol.json';
export const calibrationProposalPath = 'lib/data/compa-calibration-v2-proposal.json';
const round = (value, places = 2) => Number(value.toFixed(places));
const bandKey = row => [row.job, row.level, row.country, row.currency].join(':');

function validateProtocol(protocol) {
  assert.equal(protocol.contractId, 'compa-calibration-proposal-v2');
  assert.equal(protocol.version, 2);
  assert.equal(protocol.status, 'proposal-only');
  assert.equal(protocol.activationAllowed, false);
  assert.equal(protocol.publicationApproved, false);
  assert.equal(protocol.range.basis, 'annual_base_1_fte');
  assert.equal(protocol.range.minimumRatio, 0.8);
  assert.equal(protocol.range.maximumRatio, 1.2);
  assert.equal(protocol.pay.basis, 'annual_contracted_base');
  assert.equal(protocol.disclosure.minimumEligiblePerJob, 5);
  assert.equal(protocol.disclosure.minimumExcludedCount, 5);
  assert.equal(protocol.disclosure.companionSuppression, true);
  assert.equal(new Set(protocol.jobs.map(job => job.code)).size, protocol.jobs.length);
  assert.ok(protocol.jobs.length > 1 && protocol.jobs.every(job => typeof job.code === 'string' && job.illustrativeAnchor > 0));
}

export function calibrationBand(protocol, job, level, country) {
  const unit = protocol.range.midpointRoundingUnit;
  const midpoint = Math.round(job.illustrativeAnchor * level.multiplier * country.localMonetaryScale / unit) * unit;
  return {
    version: protocol.rangePolicyVersion, provenance: protocol.rangeProvenance,
    job: job.code, level: level.code, country: country.code, currency: country.currency,
    basis: protocol.range.basis, effectiveFrom: protocol.effectiveFrom, effectiveTo: protocol.effectiveTo,
    minimum: round(midpoint * protocol.range.minimumRatio), midpoint,
    maximum: round(midpoint * protocol.range.maximumRatio),
  };
}

/** New fictional people exist in memory only; never adapt existing source salary records. */
export function constructCalibrationInputs(protocol) {
  validateProtocol(protocol);
  const records = [], bands = [];
  const jobs = [...protocol.jobs].sort((a, b) => a.code.localeCompare(b.code));
  const policy = protocol.distribution;
  for (const [jobIndex, job] of jobs.entries()) {
    const shift = policy.jobInteriorShiftsPct[jobIndex % policy.jobInteriorShiftsPct.length];
    for (const level of protocol.levels) for (const country of protocol.countries) {
      const band = calibrationBand(protocol, job, level, country);
      bands.push(band);
      const ratios = [...policy.fixedTailRatiosPct, ...policy.fixedMidpointRatiosPct,
        ...policy.interiorOffsetsPct.map(offset => 100 + offset + shift)];
      assert.equal(ratios.length, policy.recordsPerMatchedCell);
      assert.equal(protocol.pay.ftePattern.length, ratios.length);
      const random = rng(protocol.seed, `${protocol.contractId}:${bandKey(band)}`);
      for (let index = ratios.length - 1; index > 0; index--) {
        const other = integer(random, 0, index);
        [ratios[index], ratios[other]] = [ratios[other], ratios[index]];
      }
      for (const [index, ratio] of ratios.entries()) {
        const fte = protocol.pay.ftePattern[index];
        const annualContractedBase = round(band.midpoint * ratio / 100 * fte, protocol.pay.decimalPlaces);
        records.push({
          id: `${protocol.contractId}:${bandKey(band)}:${index}`, job: job.code, level: level.code,
          country: country.code, currency: country.currency, date: protocol.snapshotDate,
          basis: protocol.pay.basis, annualContractedBase, fte, active: true,
        });
      }
    }
  }
  return {records, bands};
}

/** Reuse the existing matched individual-ratio arithmetic, including missing/small-cell protection. */
export function aggregateCalibrationProposal(records, bands, protocol) {
  validateProtocol(protocol);
  const jobs = protocol.jobs.map(job => job.code).sort();
  assert.ok(records.every(row => jobs.includes(row.job)), 'Unmapped job in proposal');
  const stats = aggregateJobCompa(records, bands, protocol.snapshotDate);
  const withheld = new Set(jobs.filter(job => stats.find(row => row.job === job)?.status !== 'published'));
  if (withheld.size === 1) withheld.add(jobs.find(job => !withheld.has(job)));
  return jobs.map(job => {
    const value = stats.find(row => row.job === job);
    return {
      contractId: protocol.contractId, job, snapshotDate: protocol.snapshotDate,
      status: withheld.has(job) ? 'withheld' : 'reviewable',
      meanCompaPct: withheld.has(job) ? null : round(value.meanPct, 4),
      coverage: withheld.has(job) ? 'withheld' : value.missing === 0 ? 'complete' : 'partial',
      basePayProvenance: protocol.basePayProvenance, rangePolicyVersion: protocol.rangePolicyVersion,
    };
  });
}

function distributionEvidence(records, bands, rows) {
  const bandMap = new Map(bands.map(band => [bandKey(band), band]));
  assert.equal(bandMap.size, bands.length);
  const ratios = records.map(row => {
    const band = bandMap.get(bandKey(row));
    return 100 * row.annualContractedBase / row.fte / band.midpoint;
  });
  const share = predicate => round(ratios.filter(predicate).length / ratios.length * 100, 4);
  const tolerance = 1e-7; // Floating-point comparison only; never changes a pay, band or displayed ratio.
  return {
    scope: 'Design validation of the new constructed cohort only; not a production workforce statistic',
    constructedRecords: records.length, matchedBands: bands.length,
    belowBandPct: share(value => value < 80 - tolerance),
    withinBandPct: share(value => value >= 80 - tolerance && value <= 120 + tolerance),
    aboveBandPct: share(value => value > 120 + tolerance),
    belowMidpointPct: share(value => value < 100 - tolerance),
    atMidpointPct: share(value => Math.abs(value - 100) <= tolerance),
    aboveMidpointPct: share(value => value > 100 + tolerance),
    jobMeanDistribution: [...new Set(rows.map(row => row.meanCompaPct))].sort((a, b) => a - b)
      .map(meanCompaPct => ({meanCompaPct, jobs: rows.filter(row => row.meanCompaPct === meanCompaPct).length})),
  };
}

function workedExample(protocol, jobCode, levelCode, countryCode, fte, ratio) {
  const band = calibrationBand(protocol, protocol.jobs.find(job => job.code === jobCode),
    protocol.levels.find(level => level.code === levelCode), protocol.countries.find(country => country.code === countryCode));
  const contractedAnnualBase = round(band.midpoint * ratio / 100 * fte);
  const annualBaseAtOneFte = contractedAnnualBase / fte;
  return {
    label: 'Independent invented arithmetic example; not extracted from a person or cohort record',
    job: jobCode, level: levelCode, country: countryCode, currency: band.currency,
    fte, contractedAnnualBase, annualBaseAtOneFte,
    rangeMinimum: band.minimum, rangeMidpoint: band.midpoint, rangeMaximum: band.maximum,
    compaPct: round(100 * annualBaseAtOneFte / band.midpoint, 4),
  };
}

export async function buildCalibrationProposal({read = path => readFile(new URL(path, root))} = {}) {
  const protocol = JSON.parse(await read(calibrationProtocolPath));
  validateProtocol(protocol);
  for (const [path, hash] of Object.entries(protocol.protectedV1Sha256)) {
    assert.equal(digest((await read(path)).toString()), hash, `Protected v1 file changed: ${path}`);
  }
  const {records, bands} = constructCalibrationInputs(protocol);
  const rows = aggregateCalibrationProposal(records, bands, protocol);
  assert.ok(rows.every(row => row.status === 'reviewable' && row.coverage === 'complete'));
  const distribution = distributionEvidence(records, bands, rows);
  assert.equal(distribution.withinBandPct, protocol.distribution.expectedWithinBandPct);
  assert.equal(distribution.belowBandPct, protocol.distribution.expectedBelowBandPct);
  assert.equal(distribution.aboveBandPct, protocol.distribution.expectedAboveBandPct);
  assert.ok(distribution.atMidpointPct >= protocol.distribution.minimumAtMidpointPct);
  assert.deepEqual(distribution.jobMeanDistribution.map(row => row.meanCompaPct), protocol.distribution.expectedJobMeansPct);
  const sourcePaths = [calibrationProtocolPath, 'lib/simulation/compa-calibration-v2.mjs', 'lib/compensation-ranges.ts', 'lib/ml/synthetic-workforce/common.mjs'];
  return {
    version: 2, contractId: protocol.contractId, status: 'proposal-only',
    activationAllowed: false, publicationApproved: false, dataClass: 'constructed-synthetic-proposal',
    snapshotDate: protocol.snapshotDate, population: protocol.population, formula: protocol.formula,
    interpretation: protocol.interpretation, distribution, rows,
    workedExamples: [
      workedExample(protocol, 'SWE-GEN', 'DEMO-IC2', 'US', 0.8, 96),
      workedExample(protocol, 'HR-PA', 'DEMO-IC4', 'CA', 0.5, 100),
      workedExample(protocol, 'BI-ANA', 'DEMO-IC2', 'GB', 1, 108),
    ],
    evidence: {
      generatedCohortRecordsIncluded: false, existingPeopleRead: false, existingPayRead: false,
      databaseChanged: false, liveCatalogMembershipVerified: false, cutoverReady: false,
      protectedV1Sha256: protocol.protectedV1Sha256,
      sourceHashes: Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, digest((await read(path)).toString())]))),
    },
  };
}
