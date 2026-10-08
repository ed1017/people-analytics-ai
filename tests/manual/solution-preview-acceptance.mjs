/** Explicit manual Preview build entry; never add to package scripts or routes. */
import {readFileSync, mkdirSync, writeFileSync, openSync, closeSync, fsyncSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {sourceManifest, unarmedManifest, sha256, validateManifest, runAcceptance, safeFailure} from '../helpers/solution-preview-acceptance.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const [mode, argument] = process.argv.slice(2);
if (mode === '--prepare' && process.argv.length <= 4) {
  console.log(JSON.stringify(unarmedManifest(root, argument ?? 'core-four'), null, 2));
} else if (mode === '--execute-reserved-batch' && argument && process.argv.length === 4) {
  try {
    const bytes = readFileSync(resolve(argument));
    if (bytes.length > 200000 || sha256(bytes) !== process.env.SOLUTION_ACCEPTANCE_MANIFEST_SHA256) throw Error('Unbound manifest.');
    const manifest = JSON.parse(bytes); validateManifest(manifest, process.env);
    if (JSON.stringify(sourceManifest(root)) !== JSON.stringify(manifest.files)) throw Error('Source changed.');
    if (process.versions.node.split('.')[0] !== '24' || !process.env.OPENAI_API_KEY) throw Error('Runtime unavailable.');
    if (JSON.parse(readFileSync(join(root, 'node_modules/openai/package.json'))).version !== '7.23.0' || JSON.parse(readFileSync(join(root, 'node_modules/undici/package.json'))).version !== '7.30.0') throw Error('Dependency version changed.');
    const output = join(tmpdir(), 'solution-preview-acceptance-' + manifest.runId);
    const claim = () => mkdirSync(output, {mode: 0o700});
    const record = (stage, receipt) => {
      const text = JSON.stringify({stage, ...receipt}) + '\n';
      const fd = openSync(join(output, stage + '.json'), 'wx', 0o600);
      try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
      console.log('SOLUTION_ACCEPTANCE_RECEIPT ' + text.trim());
    };
    const {default: OpenAI} = await import('openai');
    const {openAIProxyTransport} = await import('../../lib/openai-proxy-transport.ts');
    const client = new OpenAI({...openAIProxyTransport(), apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, logLevel: 'off'});
    const report = await runAcceptance({manifest, env: process.env, client, claim, record});
    if (report.executionComplete) {
      const path = join(root, '.preview-acceptance-empty'); mkdirSync(path, {mode: 0o700});
      writeFileSync(join(path, 'index.html'), '<!doctype html><html><head><title></title></head><body></body></html>\n', {flag: 'wx', mode: 0o600});
    }
    process.exitCode = report.executionComplete ? 0 : 1;
  } catch (error) { console.log('SOLUTION_ACCEPTANCE_STOP ' + JSON.stringify(safeFailure(error))); process.exitCode = 1; }
} else { console.error('Use --prepare [core-four|corrections-two], or --execute-reserved-batch MANIFEST.'); process.exitCode = 1; }
