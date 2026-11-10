import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as publicPolicy from '../releases/2026-10-21/source/lib/public-9037-options.mjs';
import * as previewPolicy from '../releases/2026-10-21/source/lib/dataset-9037-preview-options.mjs';
import * as aiPolicy from '../releases/2026-10-21/source/lib/public-ai-capabilities.mjs';
import {PUBLIC_9037_ENABLED} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';

const hostname = 'people-analytics-test-ed-56dc.vercel.app';
const env = {NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production', VERCEL_PROJECT_ID: 'prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF', VERCEL_ORG_ID: 'team_UNDjIdAbXXQZ63p0YuNQQ9zp', VERCEL_URL: hostname};
const request = (url, method = 'GET') => new Request(url, {method});
const denied = [
  ['/case-study', 'POST'], ['/case-study', 'PUT'], ['/case-study', 'PATCH'], ['/case-study', 'DELETE'], ['/case-study', 'OPTIONS'],
  ['/case-study/private', 'GET'], ['/case-study/', 'GET'], ['/case-study-other', 'GET'], ['/Case-Study', 'GET'],
  ['/api/case-study', 'GET'], ['/api/case-study', 'POST'], ['/.private-9037/components.json', 'GET'],
  ['/%63ase-study', 'GET'], ['/case-study%2fprivate', 'GET'], ['/case-study%252fprivate', 'GET'], ['/case-study%ZZ', 'GET'],
];

function loadProxy({environment = env, publicEnabled = true} = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../releases/2026-10-21/source/proxy.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const modules = {
    './lib/public-9037-options.mjs': publicEnabled ? publicPolicy : {...publicPolicy, public9037Options: () => null},
    './lib/dataset-9037-preview-options.mjs': previewPolicy,
    './lib/public-ai-capabilities.mjs': aiPolicy,
    './lib/public-qa-diagnostic-options.mjs': {publicQaDiagnosticAllowed: () => false},
    './lib/dataset-9037-request-policy.mjs': {local9037RequestAllowed: () => assert.fail('Public case route must not enter local mode')},
    'next/server': {NextResponse: {next: () => ({status: 200, allowed: true}), json: (body, options) => ({status: options.status, body}), redirect: () => assert.fail('Case route must not redirect')}},
  };
  vm.runInNewContext(source, {exports, URL, Request, process: {env: environment}, require: name => {assert.ok(Object.hasOwn(modules, name), name); return modules[name];}});
  return exports.proxy;
}

test('exact case-study page accepts GET and HEAD on existing production and preview hosts', () => {
  const prod = publicPolicy.public9037Options(env);
  const preview = publicPolicy.public9037Options({...env, VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview'});
  for (const method of ['GET', 'HEAD']) {
    for (const host of [hostname, 'people-analytics-9037review-ed-56dc.vercel.app', 'www.ed-ai.app', 'ed-ai.app', 'ed-workforce-ai.vercel.app', 'people-analytics-ai-git-main-ed-56dc.vercel.app']) assert.equal(publicPolicy.public9037RequestAllowed(prod, request(`https://${host}/case-study`, method)), true, `${method} ${host}`);
    for (const host of [hostname, 'people-analytics-9037review-ed-56dc.vercel.app']) assert.equal(publicPolicy.public9037RequestAllowed(preview, request(`https://${host}/case-study`, method)), true);
    assert.equal(publicPolicy.public9037RequestAllowed(preview, request('https://www.ed-ai.app/case-study', method)), false);
  }
});

test('case page addition does not permit writes, private/API routes, encoded paths or foreign origins', () => {
  const options = publicPolicy.public9037Options(env);
  for (const [path, method] of denied) assert.equal(publicPolicy.public9037RequestAllowed(options, request(`https://www.ed-ai.app${path}`, method)), false, `${method} ${path}`);
  for (const url of ['https://other.example/case-study', 'http://www.ed-ai.app/case-study', 'https://www.ed-ai.app:444/case-study', 'https://www.ed-ai.app.evil.example/case-study']) assert.equal(publicPolicy.public9037RequestAllowed(options, request(url)), false, url);
  for (const path of ['/', '/about', '/planning/headcount-demo', '/planning/assumptions', '/favicon.ico']) assert.equal(publicPolicy.public9037RequestAllowed(options, request(`https://www.ed-ai.app${path}`)), true);
});

test('actual public proxy admits case-study reads and keeps rejected routes blocked before execution', () => {
  const proxy = loadProxy();
  for (const method of ['GET', 'HEAD']) assert.equal(proxy(request('https://www.ed-ai.app/case-study', method)).allowed, true);
  for (const [path, method] of denied) assert.equal(proxy(request(`https://www.ed-ai.app${path}`, method)).status, 503, `${method} ${path}`);
  assert.equal(proxy(request('https://foreign.example/case-study')).status, 503);
  const previewProxy = loadProxy({environment: {...env, VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview'}});
  assert.equal(previewProxy(request(`https://${hostname}/case-study`)).allowed, true);
  assert.equal(previewProxy(request('https://www.ed-ai.app/case-study')).status, 503);
});

test('protected-preview fallback stays unchanged; enabled public release owns this page', () => {
  assert.equal(PUBLIC_9037_ENABLED, true);
  const environment = {...env, VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview'};
  assert.ok(publicPolicy.public9037Options(environment));
  const options = previewPolicy.preview9037Options(environment, true);
  for (const method of ['GET', 'HEAD']) assert.equal(previewPolicy.preview9037RequestAllowed(options, request(`https://${hostname}/case-study`, method)), false);
  assert.equal(previewPolicy.preview9037RequestAllowed(options, request(`https://${hostname}/`)), true);
  assert.equal(loadProxy({environment, publicEnabled: false})(request(`https://${hostname}/case-study`)).status, 503);
});
