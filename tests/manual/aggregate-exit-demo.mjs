// Offline reproduction only. No configuration, credentials, database or model calls.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluateAggregateExitDemo } from '../../lib/ml/aggregate-exit-forecast.ts';

if (process.argv.length !== 2) throw new Error('This runner accepts no source, live mode or prediction overrides.');
const fixtureUrl = new URL('../fixtures/aggregate-exit-history.json', import.meta.url);
const codeUrl = new URL('../../lib/ml/aggregate-exit-forecast.ts', import.meta.url);
const [fixture, code] = await Promise.all([readFile(fixtureUrl), readFile(codeUrl)]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
console.log(JSON.stringify({
  identities: { fixtureSha256: sha256(fixture), evaluatorSha256: sha256(code) },
  report: evaluateAggregateExitDemo(JSON.parse(fixture.toString('utf8'))),
}, null, 2));
