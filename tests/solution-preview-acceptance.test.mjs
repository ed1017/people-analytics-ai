import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkpoint, limits, apiBase, batchPlan, safeFailure, safeText, sourceManifest, unarmedManifest, validateManifest, createPacer, runAcceptance} from './helpers/solution-preview-acceptance.mjs';
import {fictionalScenarios} from './fixtures/fictional-solution-evaluation.mjs';
import {scriptedStepsFor} from './fixtures/preview-acceptance-scripted.mjs';

const start = Date.parse('2026-10-08T12:00:00Z');
function setup(options = {}) {
  let time = start, current = '', steps = [], claimed = false;
  const calls = [], records = [], controller = new AbortController();
  const manifest = {version: 1, checkpoint, runId: '10000000-0000-4000-8000-000000000001', reservationId: '20000000-0000-4000-8000-000000000001', parentReserved: true, plan: batchPlan(options.batch ?? 'core-four'), priorInitialMicrousd: 255960, priorTotalMicrousd: 255960, pricingBasis: 'approved-envelope-input-0.25-output-1.20-per-million', projectId: 'prj_fictional', createdAt: new Date(start).toISOString(), expiresAt: new Date(start + 3600000).toISOString(), files: {fixture: 'offline-only'}};
  const env = {VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: manifest.projectId, VERCEL_DEPLOYMENT_ID: 'dpl_fictional', SOLUTION_ACCEPTANCE_RUN_ID: manifest.runId};
  const scripted = payload => {
    const context = JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
    const scenario = fictionalScenarios.find(s => s.turns.includes(context.currentMessage.text));
    const index = scenario.turns.indexOf(context.currentMessage.text), key = scenario.id + '-' + index;
    if (key !== current) {
      current = key; steps = scriptedStepsFor(scenario.id, index, {working: context.workingProposals});
      if (options.maximumRounds) while (steps.length < 4) steps.unshift({name: 'read_clock', args: {}});
    }
    const step = steps.shift(); assert.ok(step, 'No unscripted provider rounds');
    const output = step.name ? [{type: 'function_call', call_id: 'call-' + calls.length, name: step.name, arguments: JSON.stringify(step.args)}] : [];
    return {status: 'completed', service_tier: 'default', usage: {input_tokens: 9000, output_tokens: 100}, output, output_text: step.name ? '' : JSON.stringify(step), ...options.response};
  };
  const method = name => (payload, settings) => {
    calls.push({name, at: time, payload: structuredClone(payload), settings});
    assert.equal(settings.maxRetries, 0); assert.equal(settings.timeout, 30000); assert.ok(settings.signal);
    return {withResponse: async () => {
      if (options[name + 'Error']) throw options[name + 'Error'];
      if (options.abortAfter === name) controller.abort();
      const data = name === 'count' ? {object: 'response.input_tokens', input_tokens: options.tokens ?? 9000} : scripted(payload);
      return {data, response: {status: 200}, request_id: 'req_fictional'};
    }};
  };
  const client = {baseURL: apiBase, responses: {inputTokens: {count: method('count')}, create: method('generation')}};
  const record = (stage, receipt) => {
    records.push({stage, receipt});
    if (stage === options.abortAtRecord) controller.abort();
    if (stage === options.recordError) throw Error('PRIVATE_DISK_FAILURE');
  };
  const claim = () => { if (claimed) throw Error('Already claimed'); claimed = true; };
  const sleep = async ms => { time += ms; if (options.abortDuringPacing) controller.abort(); };
  const run = () => runAcceptance({manifest, env, client, record, claim, now: () => time, sleep, signal: controller.signal});
  return {manifest, env, client, records, calls, controller, run};
}

test('all eighteen scripted turns exercise actual service, schema, tools, state and selection without network', async () => {
  const originalFetch = globalThis.fetch; let attempts = 0;
  globalThis.fetch = () => { attempts++; throw Error('Network forbidden in offline checks'); };
  try {
    let turns = 0;
    for (const batch of ['core-four', 'corrections-two']) {
      const x = setup({batch}), result = await x.run();
      assert.equal(result.failure, undefined, JSON.stringify(result.failure));
      assert.equal(result.executionComplete, true); assert.equal(result.fullAcceptance, false);
      assert.equal(result.semanticReview, 'pending'); assert.equal(result.browserPersistenceVerified, false);
      assert.equal(result.turns.length, x.manifest.plan.turns); turns += result.turns.length;
      assert.deepEqual(result.pendingTurns, []);
      assert.equal(result.reservedMicrousd, x.manifest.plan.reservedMicrousd);
      assert.ok(x.calls.length <= x.manifest.plan.maxProviderCalls);
      for (let i = 0; i < x.calls.length; i += 2) {
        const [count, generation] = x.calls.slice(i, i + 2);
        assert.equal(count.name, 'count'); assert.equal(generation.name, 'generation');
        assert.deepEqual(generation.payload, {...count.payload, max_output_tokens: 5000, service_tier: 'default'});
        assert.equal(count.payload.model, 'gpt-5.6-luna');
        assert.ok(count.payload.tools.length > 0);
      }
      for (const call of x.calls) assert.ok(x.calls.filter(c => c.at > call.at - 60000 && c.at <= call.at).length <= 6);
      for (const turn of result.turns) assert.ok(Object.values(turn.checks).every(Boolean));
      const firstCalls = x.calls.filter(call => call.name === 'generation' && call.payload.input.length === 1);
      assert.equal(firstCalls.length, x.manifest.plan.turns);
      for (const call of firstCalls) {
        const context = JSON.parse(call.payload.input[0].content.split('\n').slice(1).join('\n'));
        const n = Number(context.currentMessage.id.replace('user-', ''));
        assert.equal(context.recentTurns.length, (n - 1) * 2);
        if (n === 1) { assert.deepEqual(context.workingProposals, []); assert.deepEqual(context.analyses, []); }
      }
      if (batch === 'core-four') {
        assert.equal(result.projectionReads, 3);
        const selection = result.turns.find(t => t.selection)?.selection;
        assert.equal(selection.passed, true); assert.equal(selection.mode, 'in_memory_product_helper_simulation');
        assert.equal(selection.browserPersistenceVerified, false);
        const projections = result.turns.filter(t => t.analyses.length);
        assert.equal(projections.length, 2); assert.equal(projections[1].analyses[0].revision, 2);
        assert.equal(projections[0].analyses[0].points.length, 3);
        assert.match(result.turns.at(-1).toolReceipts[0].boundary.text, /company-wide/);
      }
      await assert.rejects(x.run(), /Already claimed/);
    }
    assert.equal(turns, 18); assert.equal(attempts, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('conservative reservation includes every count and four rounds per turn; remaining batch is blocked after A', () => {
  const a = batchPlan('core-four'), b = batchPlan('corrections-two');
  assert.equal(a.countCalls, 48); assert.equal(a.generationCalls, 48); assert.equal(a.maxProviderCalls, 96);
  assert.equal(limits.generationMicrousd, limits.inputTokens * .25 + limits.outputTokens * 1.2);
  assert.equal(a.reservedMicrousd, 48 * (limits.countAllowanceMicrousd + limits.generationMicrousd));
  assert.equal(a.reservedMicrousd + b.reservedMicrousd, 5832000);
  assert.equal(255960 + a.reservedMicrousd, 4143960);
  const x = setup({batch: 'corrections-two'}); x.manifest.priorInitialMicrousd = x.manifest.priorTotalMicrousd = 4143960;
  assert.throws(() => validateManifest(x.manifest, x.env, start), {code: 'budget_exhausted'});
});

test('maximum permitted rounds consume at most 48 count/generation pairs; a fourth-round tool call stops', async () => {
  const x = setup({maximumRounds: true}), result = await x.run();
  assert.equal(result.failure, undefined, JSON.stringify(result.failure));
  assert.equal(result.executionComplete, true); assert.equal(x.calls.length, 96);
  assert.equal(result.attemptedCountStages, 48); assert.equal(result.attemptedGenerationStages, 48);
  assert.ok(result.turns.every(turn => turn.modelRounds === 4));
  assert.equal(result.reservedMicrousd, 3888000);
  const y = setup({maximumRounds: true, response: {output: [{type: 'function_call', call_id: 'call_repeat', name: 'read_clock', arguments: '{}'}], output_text: ''}}), stopped = await y.run();
  assert.equal(y.calls.length, 8); assert.equal(y.calls.at(-1).payload.tool_choice, 'none');
  assert.ok(stopped.failure); assert.equal(stopped.completedTurns.length, 0); assert.equal(stopped.pendingTurns.length, 12);
});

test('count and generation auth/timeout failures stop all follow-ups, retain full reservation and sanitize output', async () => {
  for (const phase of ['count', 'generation']) for (const status of [401, 403, 408, 429, 500]) {
    const error = Object.assign(new Error('PRIVATE_BODY'), {status, code: 'invalid_request_error', request_id: 'req_safe', headers: {authorization: 'PRIVATE_HEADER'}});
    const x = setup({[phase + 'Error']: error}), result = await x.run();
    assert.equal(x.calls.length, phase === 'count' ? 1 : 2);
    assert.equal(result.failure.status, status); assert.equal(result.reservedMicrousd, 3888000);
    assert.equal(result.pendingTurns.length, 12); assert.equal(result.executionComplete, false);
    assert.ok(!JSON.stringify(x.records).includes('PRIVATE'));
  }
});

test('input counts, usage bounds, tier drift and invalid output stop before a subsequent request', async () => {
  for (const tokens of [100001, -1, Infinity, 1.1]) {
    const x = setup({tokens}), result = await x.run();
    assert.equal(x.calls.length, 1); assert.equal(result.failure.code, 'input_token_limit');
  }
  for (const response of [{usage: null}, {usage: {input_tokens: 100001, output_tokens: 100}}, {usage: {input_tokens: 100, output_tokens: 5001}}, {status: 'incomplete'}, {service_tier: 'priority'}, {output: [], output_text: 'invalid'}, {output: [], output_text: JSON.stringify({answer: 'missing schema'})}]) {
    const x = setup({response}), result = await x.run();
    assert.equal(x.calls.length, 2); assert.ok(result.failure); assert.equal(result.completedTurns.length, 0);
  }
});

test('persistence failures or cancellation stop before the next SDK call, including after pacing', async () => {
  for (const [stage, count] of [['start', 0], ['before-count-1', 0], ['count-1', 1], ['before-generation-1', 1], ['generation-1', 2]]) {
    for (const kind of ['recordError', 'abortAtRecord']) {
      const x = setup({[kind]: stage}), result = await x.run();
      assert.equal(x.calls.length, count); assert.ok(result.failure); assert.equal(result.executionComplete, false);
    }
  }
  for (const phase of ['count', 'generation']) {
    const x = setup({abortAfter: phase}), result = await x.run();
    assert.equal(x.calls.length, phase === 'count' ? 1 : 2); assert.ok(result.failure);
  }
  const x = setup({abortDuringPacing: true}), result = await x.run();
  assert.equal(x.calls.length, 6); assert.ok(result.failure);
  const y = setup({recordError: 'turn-clock-deadline-1'}), stopped = await y.run();
  assert.equal(y.calls.length, 4); assert.deepEqual(stopped.completedTurns, []); assert.equal(stopped.pendingTurns.length, 12);
});

test('pacer bounds count and generation together and honors cancellation after the sleep', async () => {
  let now = 0; const controller = new AbortController();
  const pace = createPacer({now: () => now, sleep: async ms => { now += ms; controller.abort(); }});
  for (let i = 0; i < 6; i++) await pace(controller.signal);
  await assert.rejects(pace(controller.signal), {name: 'AbortError'});
  assert.ok(now <= 1000);
});

test('reservation changes, wrong Preview, expired launch window and endpoint overrides stop before any call', async () => {
  const mutations = [x => x.manifest.parentReserved = false, x => x.manifest.runId = null, x => x.manifest.plan.sequenceIds.reverse(), x => x.manifest.plan.countCalls++, x => x.manifest.priorInitialMicrousd = 3000000, x => x.manifest.priorTotalMicrousd = 49000000, x => x.manifest.pricingBasis = 'unverified', x => x.manifest.expiresAt = new Date(start).toISOString(), x => x.env.VERCEL_ENV = 'production', x => x.env.VERCEL_PROJECT_ID = 'prj_wrong', x => x.env.SOLUTION_ACCEPTANCE_RUN_ID = 'wrong', x => x.env.OPENAI_BASE_URL = 'https://example.invalid', x => x.env.OPENAI_LOG = 'debug', x => x.client.baseURL = 'https://example.invalid'];
  for (const mutate of mutations) { const x = setup(); mutate(x); await assert.rejects(x.run()); assert.equal(x.calls.length, 0); }
});

test('bounded receipt text marks redaction and truncation; raw exception text and credentials stay out', () => {
  const text = safeText('\u001b[31mFictional answer\u0000 Bearer SECRET sk-proj-123456789\n' + 'x'.repeat(2000), 80);
  assert.equal(text.redacted, true); assert.equal(text.truncated, true); assert.equal(text.text.length, 80);
  assert.match(text.sha256, /^[a-f0-9]{64}$/); assert.ok(!text.text.includes('SECRET')); assert.ok(!text.text.includes('sk-proj-'));
  assert.deepEqual(safeFailure({status: 401, code: 'sk_secret', type: 'Bearer SECRET', request_id: 'PRIVATE'}), {status: 401, category: 'Object', code: null, type: null, requestId: null});
});

test('prepare is unarmed and source-bound; normal builds have no paid hook', () => {
  const prepared = unarmedManifest(process.cwd());
  assert.equal(prepared.parentReserved, false); assert.equal(prepared.runId, null); assert.equal(prepared.reservationId, null);
  assert.deepEqual(prepared, unarmedManifest(process.cwd()));
  assert.deepEqual(prepared.files, sourceManifest(process.cwd()));
  for (const path of ['lib/home-solution-conversation-service.ts', 'lib/home-solution-conversation-schema.ts', 'lib/openai-proxy-transport.ts', 'lib/local-decisions.ts', 'tests/fixtures/fictional-solution-evaluation.mjs', 'package-lock.json']) assert.match(prepared.files[path], /^[a-f0-9]{64}$/);
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  assert.ok(!JSON.stringify(scripts).includes('solution-preview-acceptance'));
});
