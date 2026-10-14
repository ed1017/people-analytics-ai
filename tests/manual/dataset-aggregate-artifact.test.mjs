import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createAggregateArtifactProvider, MAX_AGGREGATE_ARTIFACT_BYTES } from '../../lib/dataset-aggregate-artifact.mjs';
import { ANALYTICS_QUERIES } from '../../lib/dataset-analytics-source.mjs';
import { DatasetRouter } from '../../lib/dataset-router.mjs';
import { createLocalDatasetIntegration } from '../../lib/dataset-local-integration.mjs';
import { createDatasetRequestBoundary } from '../../lib/dataset-request-boundary.mjs';
import { LOCAL_PARITY_ROUTES } from '../../lib/dataset-local-api.mjs';
import { validateAggregateRows } from '../../lib/dataset-aggregate-validation.mjs';

// Manual review uses explicit private fixture locations; no fixture bytes or
// operational configuration is included in this repository.
assert.ok(process.env.DATASET_REVIEW_CONFIG && process.env.DATASET_REVIEW_CASES,
  'Manual reader tests require reviewed artifact configuration and operation cases');
const root = new URL('../../', import.meta.url);
const config = JSON.parse(fs.readFileSync(process.env.DATASET_REVIEW_CONFIG));
const artifactPath = path.join(config.directory, 'candidate-aggregate-artifact.json');
const bytes = fs.readFileSync(artifactPath);
const pin = { datasetId: 'workforce-demo-9847-2026-09-30-local-final-v1',
  datasetDigest: config.expectedDatasetDigest, artifactDigest: config.expectedArtifactDigest };
const hash = value => createHash('sha256').update(value).digest('hex');
const load = (data = bytes, artifactDigest = pin.artifactDigest, datasetDigest = pin.datasetDigest) =>
  createAggregateArtifactProvider({ bytes: data, expectedArtifactDigest: artifactDigest, expectedDatasetDigest: datasetDigest });
const changed = edit => {
  const value = JSON.parse(bytes); edit(value);
  const data = Buffer.from(JSON.stringify(value));
  return load(data, hash(data));
};
const candidate = await load();
const id = pin.datasetId, token = id + ':1';
const selected = { datasetId: id, digest: pin.datasetDigest, generation: 1 };
const router = new DatasetRouter({ [id]: candidate.provider }, { read: async () => selected });
const integration = createLocalDatasetIntegration({ router, candidateDatasetId: id, analytics: candidate.analytics });
let originalCalls = 0;
const boundary = createDatasetRequestBoundary({ router,
  retained: { 'legacy-v1': { assertAvailable: async () => true } },
  candidate: { datasetId: id, handle: integration.handle },
});
const req = (path, body, expectedToken = token) => new Request('https://fixture.invalid' + path, {
  method: body === undefined ? 'GET' : 'POST', headers: { 'x-workforce-dataset': expectedToken,
    ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const call = (path, body, expectedToken) => boundary(req(path, body, expectedToken), () => {
  originalCalls++; throw Error('Original handler must never run for a candidate');
});

test('original seal and all eight components retain local-only semantics', async () => {
  assert.equal(candidate.provider.digest, pin.datasetDigest);
  assert.equal(candidate.provider.certificate, 'LOCAL-ONLY-SEALED:' + pin.datasetDigest);
  assert.equal(candidate.artifact.publicationApproved, false);
  assert.equal(candidate.artifact.independentForecastValidation, false);
  assert.equal(candidate.artifact.hostedPreservationVerified, false);
  await router.request(req('/api/workforce'), async () => {
    const b = await integration.bundle();
    assert.equal(Object.keys(b.components).length, 8);
    assert.equal(b.components.workforce.data[0].headcount, 9847);
    assert.equal(b.publicationApproved, false);
    return Response.json({});
  });
});

test('all 62 fixed aggregate reads are served by the artifact without SQL', async () => {
  for (const name of Object.keys(ANALYTICS_QUERIES)) {
    const rows = await candidate.analytics.read(name, name === 'dashboard' ? [null, null, null] : []);
    assert.ok(Array.isArray(rows), name);
    assert.ok(Object.isFrozen(rows), name);
  }
});

test('missing or changed byte pins reject data before a provider exists', async () => {
  const corrupted = Buffer.from(bytes); corrupted[100] ^= 1;
  await assert.rejects(load(corrupted), /digest mismatch/);
  await assert.rejects(load(bytes, '0'.repeat(64)), /digest mismatch/);
  await assert.rejects(load(bytes, null), /reviewed pins/);
});

test('bounded byte input rejects unbounded or non-byte artifacts', async () => {
  for (const bad of ['', {}, new Uint8Array(0), new Uint8Array(MAX_AGGREGATE_ARTIFACT_BYTES + 1)])
    await assert.rejects(load(bad), /Bounded artifact bytes/);
});

test('a new outer pin cannot relabel the original seal or corrupt a sealed component', async () => {
  await assert.rejects(load(bytes, pin.artifactDigest, 'f'.repeat(64)), /incompatible/);
  await assert.rejects(changed(v => { v.seal.dataset_sha256 = 'f'.repeat(64); }), /seal/i);
  await assert.rejects(changed(v => { v.components.workforce.payload[0].headcount = 10000; }), /integrity/);
});

test('publication, forecast, cutoff, query-version and scope changes fail closed', async () => {
  for (const [key, value] of Object.entries({ publicationApproved: true, independentForecastValidation: true,
    cutoff: '2026-10-31', queryContractDigest: 'a'.repeat(64), dashboardScope: 'all-filters', dataClass: 'observed' }))
    await assert.rejects(changed(v => { v[key] = value; }), /incompatible/);
  await assert.rejects(changed(v => { v.components.ratings.publication_approved = true; }), /component/);
});

test('missing and unknown aggregates are rejected even with a matching new outer pin', async () => {
  await assert.rejects(changed(v => { delete v.aggregates.finance_current_summary; }), /incompatible/);
  await assert.rejects(changed(v => { v.aggregates.raw_employees = []; }), /incompatible/);
  await assert.rejects(changed(v => { v.aggregates.finance_current_summary = {}; }), /incompatible/);
});

for (const name of ['attrition_current_summary', 'attrition_business_unit_summary',
  'attrition_level_summary', 'attrition_monthly_trend', 'attrition_tenure_summary']) {
  test(name + ' rejects regrettable exits above voluntary exits after rehashing', async () => {
    await assert.rejects(changed(v => {
      const row = v.aggregates[name][0]; row.regrettable_exits = row.voluntary_exits + 1;
    }), new RegExp(name + ' regrettable exits exceed voluntary exits'));
  });
  test(name + ' rejects voluntary exits above all exits after rehashing', async () => {
    await assert.rejects(changed(v => {
      const row = v.aggregates[name][0]; row.voluntary_exits = (row.total_exits ?? row.exits) + 1;
    }), new RegExp(name + ' voluntary exits exceed exits'));
  });
}

for (const name of ['attrition_business_unit_summary', 'attrition_level_summary', 'attrition_tenure_summary']) {
  for (const metric of ['voluntary_exits', 'regrettable_exits']) {
    test(name + ' reconciles YTD ' + metric + ' even when the row remains within bounds', async () => {
      await assert.rejects(changed(v => {
        const row = v.aggregates[name].find(r => r.voluntary_exits > 1);
        row[metric] += metric === 'voluntary_exits' ? -1 : 1;
      }), new RegExp(name + ' YTD ' + metric + ' reconciliation'));
    });
  }
}

test('monthly voluntary and regrettable counts reconcile to the matching YTD summary', async () => {
  await assert.rejects(changed(v => {
    const row = v.aggregates.attrition_monthly_trend.find(r => r.month === '2026-09-01');
    row.voluntary_exits--; row.involuntary_exits++;
    const hc = v.aggregates.dashboard_headcount_trend.at(-1).headcount;
    row.monthly_voluntary_turnover_pct = Math.round(10000 * row.voluntary_exits / hc) / 100;
  }), /attrition YTD voluntary_exits reconciliation/);
  await assert.rejects(changed(v => {
    v.aggregates.attrition_monthly_trend.at(-1).regrettable_exits++;
  }), /attrition YTD regrettable_exits reconciliation/);
});

test('a current regret count and matching fractional share still require matching YTD counts', async () => {
  await assert.rejects(changed(v => {
    const row = v.aggregates.attrition_current_summary[0];
    row.regrettable_exits = 1;
    row.regrettable_share_of_voluntary_pct = Math.round(1000 / row.voluntary_exits) / 10;
  }), /attrition YTD regrettable_exits reconciliation/);
});

test('pre-2026 monthly regret counts do not enter the current YTD comparison', async () => {
  await assert.doesNotReject(changed(v => {
    const row = v.aggregates.attrition_monthly_trend.find(r => r.month < '2026-01-01' && r.voluntary_exits > 0);
    row.regrettable_exits = 1;
  }));
});

test('current, monthly and reason percentages use their own declared denominators', async () => {
  for (const [name, field, message] of [
    ['attrition_current_summary', 'annualized_voluntary_turnover_pct', 'annualized company turnover'],
    ['attrition_current_summary', 'regrettable_share_of_voluntary_pct', 'regrettable share of voluntary exits'],
    ['attrition_monthly_trend', 'monthly_turnover_pct', 'attrition monthly turnover'],
    ['attrition_monthly_trend', 'monthly_voluntary_turnover_pct', 'attrition monthly turnover'],
    ['attrition_reason_summary', 'pct_of_exits', 'attrition reason share'],
  ]) await assert.rejects(changed(v => { v.aggregates[name][0][field] += 1; }), new RegExp(message));
});

test('monthly exit partitions and dates cannot break matched-window reconciliation', async () => {
  await assert.rejects(changed(v => { v.aggregates.attrition_monthly_trend.at(-1).involuntary_exits++; }), /exit type partition/);
  await assert.rejects(changed(v => { v.aggregates.attrition_monthly_trend[0].month = '2023-12-01'; }), /attrition monthly calendar/);
});

for (const name of ['survey_dimensions', 'survey_business_units', 'survey_waves']) {
  test(name + ' rejects out-of-contract scores and shares independently after rehashing', async () => {
    for (const [field, value] of [['avg_score', 0.99], ['avg_score', 5.01], ['avg_score', 6],
      ['favorable_pct', -0.01], ['favorable_pct', 100.01], ['favorable_pct', 101]]) {
      await assert.rejects(changed(v => { v.aggregates[name][0][field] = value; }),
        error => error.message.startsWith('Aggregate contract: ') && error.message.includes(name) && error.message.includes(field));
    }
    await assert.rejects(changed(v => {
      Object.assign(v.aggregates[name][0], { avg_score: 6, favorable_pct: 101 });
    }), new RegExp(name + ' avg_score outside 1..5'));
  });

  test(name + ' includes both endpoints of its score and favorable-share bounds', () => {
    // Exercise only the bounds here; a changed wave's share separately needs to
    // match its sealed component before a serving provider can be constructed.
    for (const [avg_score, favorable_pct] of [[1, 0], [5, 100]]) {
      const value = JSON.parse(bytes);
      Object.assign(value.aggregates[name][0], { avg_score, favorable_pct });
      assert.doesNotThrow(() => validateAggregateRows(value.aggregates, value.components));
    }
  });
}

test('caller byte mutation and result mutation cannot change a serving instance', async () => {
  const mutable = Buffer.from(bytes), own = await load(mutable); mutable.fill(0);
  const first = await own.analytics.read('workforce_current_summary');
  assert.equal(first[0].headcount, 9847);
  assert.throws(() => { first[0].headcount = 10000; }, TypeError);
  const second = await own.analytics.read('workforce_current_summary');
  assert.notEqual(first, second); assert.equal(second[0].headcount, 9847);
});

test('filters and unknown query keys never fall back to company or legacy data', async () => {
  await assert.rejects(candidate.analytics.read('dashboard', ['US', null, null]), /scope unavailable/);
  await assert.rejects(candidate.analytics.read('SELECT * FROM public.employees'), /Unknown aggregate/);
  assert.equal((await call('/api/dashboard?country=US')).status, 503);
  assert.equal((await call('/api/finance?country=US')).status, 400);
  assert.equal(originalCalls, 0);
});

const postOnly = new Set(['/api/time-phased-workforce-execution', '/api/workforce-response-constraints',
  '/api/constraint-aware-workforce-scheduler', '/api/workforce-solution', '/api/workforce-response-plan',
  '/api/role-workforce-response-plan', '/api/workforce-response-portfolio', '/api/business-unit-response-allocation']);
for (const path of LOCAL_PARITY_ROUTES) test('candidate route ' + path, async () => {
  const suffix = ['/api/internal-talent-readiness', '/api/role-buy-feasibility'].includes(path) ? '?job_profile=AI-ARCH' : '';
  const response = await call(path + suffix);
  assert.equal(response.status, postOnly.has(path) ? 405 : 200);
  assert.equal(response.headers.get('x-workforce-dataset'), token);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(originalCalls, 0);
});

const cases = JSON.parse(fs.readFileSync(process.env.DATASET_REVIEW_CASES));
for (const [i, c] of cases.entries()) test('retained operation case ' + i + ' ' + c.path, async () => {
  const response = await call(c.path, c.body);
  assert.equal(response.status, c.status);
  assert.equal(response.headers.get('x-workforce-dataset'), token);
  assert.equal(originalCalls, 0);
});

test('company, group and movement totals reconcile with preserved countries and cutoff', async () => {
  const stock = await (await call('/api/workforce')).json();
  assert.equal(stock.summary.headcount, 9847);
  const countries = await candidate.analytics.read('workforce_country_summary');
  assert.equal(countries.reduce((sum, r) => sum + r.headcount, 0), 9847);
  assert.ok(countries.some(r => r.country_code === 'BR'));
  assert.ok(!countries.some(r => r.country_code === 'NL'));
  const orgs = await candidate.analytics.read('workforce_business_unit_summary');
  assert.equal(orgs.length, 8); assert.equal(orgs.reduce((s, r) => s + r.headcount, 0), 9847);
  await router.request(req('/api/workforce'), async () => {
    const p = await integration.projectionInputs();
    assert.equal(p.history.length, 32); let opening = 8400, hires = 0, exits = 0, internal = 0;
    for (const r of p.history) {
      assert.equal(r.opening_headcount, opening);
      assert.equal(opening + r.external_starts - r.exits, r.headcount);
      opening = r.headcount; hires += r.external_starts; exits += r.exits; internal += r.promotions + r.transfers;
    }
    assert.equal(opening, 9847); assert.equal(hires, 4327); assert.equal(exits, 2880); assert.equal(internal, 619);
    assert.equal(p.baseline.snapshot_date, '2026-09-30'); assert.equal(p.independent_forecast_validation, false);
    return Response.json({});
  });
});

test('stale requests and unavailable model ports never invoke the original handler', async () => {
  assert.equal((await call('/api/workforce', undefined, 'legacy-v1:0')).status, 409);
  const r = await call('/api/chat', { message: 'What changes?', page: 'workforce' });
  assert.equal(r.status, 503);
  assert.equal(originalCalls, 0);
});

test('a legacy-default composition performs no candidate reads or selector writes', async () => {
  let candidateCalls = 0, original = 0, writes = 0;
  const legacy = { datasetId: 'legacy-v1', digest: 'uncertified-live-v1', generation: 0 };
  const both = new DatasetRouter({ 'legacy-v1': { digest: legacy.digest, client: {} },
    [id]: candidate.provider }, { read: async () => legacy, compareAndSwap: async () => { writes++; return false; } });
  const inactive = createDatasetRequestBoundary({ router: both,
    retained: { 'legacy-v1': { assertAvailable: async () => true } },
    candidate: { datasetId: id, handle: () => { candidateCalls++; throw Error('Inactive candidate'); } },
  });
  const r = await inactive(new Request('https://fixture.invalid/api/workforce'), () => {
    original++; return Response.json({ headcount: 10000, fixture: true });
  });
  assert.equal((await r.json()).headcount, 10000);
  assert.equal(r.headers.get('x-workforce-dataset'), 'legacy-v1:0');
  assert.equal(original, 1); assert.equal(candidateCalls, 0); assert.equal(writes, 0);
});

test('runtime activation is absent and the retained artifact bytes remain unchanged', () => {
  const runtime = fs.readFileSync(new URL('lib/dataset-runtime.ts', root), 'utf8');
  assert.doesNotMatch(runtime, /aggregate-artifact/);
  assert.match(runtime, /\{ 'legacy-v1': provider \}/);
  assert.equal(hash(fs.readFileSync(artifactPath)), pin.artifactDigest);
  assert.equal(globalThis.__offlineNetworkAttempts, 0);
});
