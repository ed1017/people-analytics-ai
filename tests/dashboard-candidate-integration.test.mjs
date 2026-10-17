/** Synthetic ports only: these invented values/pins are not private seals or loader validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import './fixtures/dataset-review-offline.mjs';
import {DatasetRouter} from '../lib/dataset-router.mjs';
import {createDatasetRequestBoundary} from '../lib/dataset-request-boundary.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {datasetRouter as productionRouter} from '../lib/dataset-runtime.ts';

const out = await fs.mkdtemp(path.join(os.tmpdir(), 'dashboard-candidate-'));
const isolation = path.resolve('tests/fixtures/dashboard-grounding-isolation.ts');
const runtime = path.resolve('tests/fixtures/dashboard-candidate-runtime.ts');
const compiler = webpackPackage.webpack({mode: 'development', devtool: false, target: 'node',
  plugins: [new webpackPackage.webpack.optimize.LimitChunkCountPlugin({maxChunks: 1})],
  entry: path.resolve('tests/fixtures/dashboard-candidate-entry.ts'),
  output: {path: out, filename: 'fixture.cjs', library: {type: 'commonjs2'}},
  resolve: {extensions: ['.ts', '.mjs', '.js'], alias: {
    'next/server$': isolation, './supabase-server$': isolation,
    '../../../lib/supabase-server$': isolation, '@/lib/supabase-server$': isolation,
    './dataset-runtime$': runtime, '@/lib/dataset-runtime$': runtime, '@': process.cwd()}},
  module: {rules: [{test: /\.ts$/, exclude: /node_modules/, use: path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]},
});
await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() =>
  error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({all: false, errors: true}))) : resolve())));
const source = await fs.readFile(path.join(out, 'fixture.cjs'), 'utf8');
const id = 'workforce-demo-9847-2026-09-30-local-final-v1';
const digest = 'a'.repeat(64), jointDigest = 'b'.repeat(64);
const metricContract = 'voluntary-ytd-nine-month-average-stock-v2';
const dates = Array.from({length: 33}, (_, i) => new Date(Date.UTC(2024, i + 1, 0)).toISOString().slice(0, 10));
const options = {countries: [{value: 'US', label: 'Synthetic US'}],
  business_units: [{value: 'BU-TECH', label: 'Synthetic technology'}],
  levels: [{value: 'L6', label: 'Synthetic populated level'}, {value: 'L12', label: 'Synthetic empty level'}]};
const scoped = {country: 'US', org: 'BU-TECH', level: 'L6'};
const token = generation => `${id}:${generation}`;
function payload(filters) {
  const headcount = filters.level === 'L12' ? 0 : filters.country === 'US' ? 14 : 9847;
  return {overview: {snapshot_date: dates.at(-1), headcount, fte: headcount,
    labor_cost_usd: headcount * 100, open_positions: 0, voluntary_turnover_ytd_pct: headcount ? 0 : null},
    trend: dates.map(snapshot_date => ({snapshot_date, headcount, fte: headcount})), filter_options: options};
}
function fixture() {
  const calls = {analytics: [], presenter: [], releases: [], legacy: 0, credentials: 0, external: 0};
  let selected = {datasetId: id, digest, generation: 2}, beforeRead = async () => {};
  const forbidden = key => () => {calls[key]++; throw Error(`Forbidden ${key}`);};
  const provider = {digest, approved: true, complete: true, certificate: 'SYNTHETIC-TEST-ONLY', client: {}};
  const retained = {digest: 'synthetic-retained', approved: true, complete: true, certificate: 'SYNTHETIC-RETAINED-ONLY'};
  const providers = {[id]: provider, 'retained-fixture': retained};
  const selector = {read: async () => ({...selected}), compareAndSwap: async (expected, next) => {
    if (JSON.stringify(expected) !== JSON.stringify(selected)) return false;
    selected = {...next}; return true;
  }};
  const router = new DatasetRouter(providers, selector);
  const analytics = {datasetId: id, bundleDigest: digest, dashboardAggregateDigest: jointDigest,
    dashboardMetricContract: metricContract,
    async read(name, tuple) {
      calls.analytics.push({name, tuple, token: router.current().token});
      await beforeRead(); assert.equal(name, 'dashboard');
      return [{payload: payload(Object.fromEntries(['country', 'org', 'level'].map((key, i) => [key, tuple[i] ?? 'all'])))}];
    },
    dashboardResponse(filters) {
      calls.presenter.push({...filters}); const data = payload(filters);
      return {...data, workforce_filter_scope: {version: 2, status: 'verified_aggregate',
        requested: {...filters}, effective: {...filters}, label: 'Synthetic fixture scope',
        basis: 'Invented in-memory test receipt; no private seal or reconciliation claim.',
        artifactDigest: jointDigest, metricContract, stockStatus: data.overview.headcount ? 'positive' : 'known-empty'},
        turnover_evidence: {contract: metricContract, voluntary_exits: 0, calendar_months: 9,
          sum_month_end_headcount: data.overview.headcount * 9, average_month_end_headcount: data.overview.headcount,
          status: data.overview.headcount ? 'available' : 'unavailable-zero-denominator', rate_pct: data.overview.voluntary_turnover_ytd_pct}};
    }};
  const nativeRequire = createRequire(import.meta.url);
  const sandbox = {exports: {}, require: name => {
    // Pure equality primitive used by reviewed providers; no filesystem/network capability.
    if (name === 'node:async_hooks') return {AsyncLocalStorage: nativeRequire(name).AsyncLocalStorage};
    if (name === 'node:util') return {isDeepStrictEqual: nativeRequire(name).isDeepStrictEqual};
    if (name !== 'node:crypto') return forbidden('external')();
    return nativeRequire(name);
  }, Response, Request, URL, URLSearchParams,
    TextEncoder, TextDecoder, AbortController, AbortSignal, setTimeout, clearTimeout, structuredClone,
    console, fetch: globalThis.fetch, __rpc: forbidden('legacy'),
    process: {env: new Proxy({}, {get: forbidden('credentials')})}};
  sandbox.module = {exports: sandbox.exports}; vm.runInNewContext(source, sandbox);
  const api = sandbox.module.exports;
  // Exercise the rejection branch without counting these intentional probes as application attempts.
  for (const name of ['node:fs', 'node:net', 'node:https']) {
    const before = calls.external;
    assert.throws(() => sandbox.require(name), /Forbidden external/);
    assert.equal(calls.external, before + 1);
    calls.external = before;
  }
  const presenter = api.createLocalApiPresenter({router, analytics, releases: {read: async name => {
    calls.releases.push(name); assert.equal(name, 'ratings');
    return {data: {counts: {population: 9847}, fixture: 'synthetic-rating'}};
  }}});
  sandbox.__boundary = createDatasetRequestBoundary({router,
    retained: {'retained-fixture': {assertAvailable: async () => false}},
    candidate: {datasetId: id, handle: request => presenter.handle(request)}});
  return {api, calls, router, setBeforeRead: value => {beforeRead = value;},
    async select(target) {return router.select({expected: await selector.read(), target, approval: {
      reference: 'synthetic-test', implementationCommit: 'synthetic-test', configurationFingerprint: 'synthetic-test',
      bundleDigest: providers[target].digest, preservationCertificate: providers[target].certificate}});}};
}
const request = (filters = scoped, header = token(2)) => {
  const url = 'https://offline.invalid/api/dashboard?' + new URLSearchParams(filters);
  return Object.assign(new Request(url, {headers: header === null ? {} : {'x-workforce-dataset': header}}), {nextUrl: new URL(url)});
};
async function body(response, expectedToken = token(2), status = 200) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('x-workforce-dataset'), expectedToken);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}
function isolated(f) {
  assert.equal(f.calls.legacy, 0); assert.equal(f.calls.credentials, 0);
  assert.equal(f.calls.external, 0); assert.equal(globalThis.__offlineNetworkAttempts, 0);
  assert.throws(() => f.router.current(), /context required/);
}

test('actual GET and Home reader dispatch to the candidate presenter with matching scoped identity', async () => {
  const f = fixture();
  const dashboard = await body(await f.api.GET(request()));
  const home = await body(await f.api.readDashboardOverview(request()));
  assert.deepEqual(home, dashboard); assert.equal(home.overview.headcount, 14);
  assert.equal(home.performance_rating, null); assert.equal(home.data_meta.datasetToken, token(2));
  assert.equal(home.data_meta.bundleDigest, digest); assert.equal(home.data_meta.dashboardAggregateDigest, jointDigest);
  assert.deepEqual(home.workforce_filter_scope.effective, scoped);
  const pack = data => buildHomePack({dashboard: {status: 'loaded', data}}, '?'+new URLSearchParams(scoped));
  assert.deepEqual(pack(home), pack(dashboard));
  assert.deepEqual(pack(home).datasetContext.filters, scoped);
  assert.equal(pack(home).datasetContext.datasetToken, token(2));
  assert.equal(pack(home).datasetContext.dashboardAggregate.artifactDigest, jointDigest);
  assert.deepEqual(f.calls.analytics.map(call => Array.from(call.tuple)), [[null, null, null], ['US', 'BU-TECH', 'L6'], [null, null, null], ['US', 'BU-TECH', 'L6']]);
  assert.equal(f.calls.presenter.length, 2);
  assert.deepEqual(f.calls.releases, []); isolated(f);
});

test('known-empty retains every month and zero counts, while zero-denominator turnover remains null', async () => {
  const f = fixture(), filters = {...scoped, level: 'L12'};
  for (const read of [f.api.GET, f.api.readDashboardOverview]) {
    const data = await body(await read(request(filters)));
    assert.equal(data.overview.headcount, 0); assert.equal(data.overview.fte, 0);
    assert.deepEqual(data.trend.map(row => row.snapshot_date), dates);
    assert.ok(data.trend.every(row => row.headcount === 0 && row.fte === 0));
    assert.equal(data.workforce_filter_scope.stockStatus, 'known-empty');
    assert.equal(data.overview.voluntary_turnover_ytd_pct, null);
    assert.equal(data.turnover_evidence.rate_pct, null);
    assert.equal(data.turnover_evidence.status, 'unavailable-zero-denominator');
    const pack = buildHomePack({dashboard: {status: 'loaded', data}}, '?'+new URLSearchParams(filters));
    assert.equal(pack.datasetContext.filters.level, 'L12');
    const workforce = pack.sources.find(item => item.id === 'W1');
    assert.equal(workforce.status, 'loaded');
    assert.equal(workforce.facts.headcount, 0);
    assert.equal(workforce.facts.voluntary_turnover_ytd_pct, null);
    assert.equal(pack.datasetContext.dashboardAggregate.metricContract, metricContract);
  }
  isolated(f);
});

test('company release stays synthetic; unknown codes and malformed filters cannot fall back', async () => {
  const f = fixture();
  for (const read of [f.api.GET, f.api.readDashboardOverview]) {
    const company = await body(await read(request({})));
    assert.equal(company.performance_rating.fixture, 'synthetic-rating');
    for (const key of ['country', 'org', 'level']) {
      const data = await body(await read(request({...scoped, [key]: 'UNKNOWN'})));
      assert.equal(data.overview, null); assert.deepEqual(data.trend, []);
      assert.equal(data.workforce_filter_scope.status, 'unsupported'); assert.equal(data.performance_rating, null);
      const pack = buildHomePack({dashboard: {status: 'loaded', data}}, 'Scope unavailable');
      assert.equal(pack.sources.find(item => item.id === 'W1').facts, null);
    }
    for (const filters of [{...scoped, unexpected: 'x'}, new URLSearchParams('country=US&country=US')]) {
      const before = f.calls.analytics.length;
      await body(await read(request(filters)), token(2), 503);
      assert.equal(f.calls.analytics.length, before);
    }
  }
  assert.deepEqual(f.calls.releases, ['ratings', 'ratings']); isolated(f);
});

test('missing/stale tokens reject before readers; candidate reader failures never reach legacy', async () => {
  const f = fixture();
  for (const read of [f.api.GET, f.api.readDashboardOverview]) {
    for (const header of [null, token(1), 'legacy-v1:0']) await body(await read(request(scoped, header)), token(2), 409);
  }
  assert.deepEqual(f.calls.analytics, []); assert.deepEqual(f.calls.presenter, []); assert.deepEqual(f.calls.releases, []);
  f.setBeforeRead(async () => {throw Error('SYNTHETIC_INTERNAL_FAILURE');});
  for (const read of [f.api.GET, f.api.readDashboardOverview]) {
    const data = await body(await read(request()), token(2), 503);
    assert.doesNotMatch(JSON.stringify(data), /SYNTHETIC_INTERNAL_FAILURE/);
  }
  isolated(f);
});

test('in-flight GET retains its scope/epoch while Home sees rollback generation and rejects old tokens', {timeout: 5000}, async () => {
  const f = fixture(); let entered, release;
  const ready = new Promise(resolve => {entered = resolve;}), gate = new Promise(resolve => {release = resolve;});
  let first = true;
  f.setBeforeRead(async () => {if (first) {first = false; entered(); await gate;}});
  const pending = f.api.GET(request()); await ready;
  try {
    assert.equal((await f.select('retained-fixture')).generation, 3);
    assert.equal((await f.select(id)).generation, 4);
    const before = f.calls.analytics.length;
    await body(await f.api.readDashboardOverview(request()), token(4), 409);
    assert.equal(f.calls.analytics.length, before);
    const fresh = await body(await f.api.readDashboardOverview(request({...scoped, level: 'L12'}, token(4))), token(4));
    assert.equal(fresh.overview.headcount, 0); assert.equal(fresh.data_meta.datasetToken, token(4));
  } finally {release();}
  const old = await body(await pending);
  assert.equal(old.overview.headcount, 14); assert.equal(old.data_meta.datasetToken, token(2));
  assert.deepEqual(f.calls.analytics.map(call => call.token), [token(2), token(4), token(4), token(2)]);
  isolated(f);
});

test('production remains legacy-only with selector writes disabled', async () => {
  assert.equal(await productionRouter.bootstrapToken(), 'legacy-v1:0');
  const runtimeSource = await fs.readFile(new URL('../lib/dataset-runtime.ts', import.meta.url), 'utf8');
  assert.match(runtimeSource, /compareAndSwap: async \(\) => false/);
  assert.doesNotMatch(runtimeSource, /artifact-loader|createLocalApiPresenter|createPreparedJointCandidateLoader/);
  assert.doesNotMatch(source, /supabase-js|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.equal(globalThis.__offlineNetworkAttempts, 0);
});
