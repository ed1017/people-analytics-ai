/** Explicit CLI only. Never reference from package scripts, routes or framework hooks. */
import {readFileSync, mkdirSync, writeFileSync, openSync, closeSync, fsyncSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {unarmedManifest, sourceManifest, sha256, validateReservation, runPreviewOneShot, safeFailure} from '../helpers/solution-preview-one-shot.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [mode, manifestPath] = process.argv.slice(2);
if (mode === '--prepare' && !manifestPath) {
  console.log(JSON.stringify(unarmedManifest(root), null, 2));
} else if (mode === '--execute-reserved-once' && manifestPath && process.argv.length === 4) {
  try {
    const bytes = readFileSync(resolve(manifestPath));
    if (bytes.length > 200000 || sha256(bytes) !== process.env.SOLUTION_PREVIEW_MANIFEST_SHA256) throw Error('Unbound manifest.');
    const manifest = JSON.parse(bytes);
    validateReservation(manifest, process.env);
    if (JSON.stringify(sourceManifest(root)) !== JSON.stringify(manifest.files)) throw Error('Source changed.');
    if (process.versions.node.split('.')[0] !== '24' || !process.env.OPENAI_API_KEY) throw Error('Runtime unavailable.');
    if (JSON.parse(readFileSync(join(root, 'node_modules/openai/package.json'))).version !== '7.23.0' || JSON.parse(readFileSync(join(root, 'node_modules/undici/package.json'))).version !== '7.30.0') throw Error('Dependency version changed.');
    const output = join(tmpdir(), 'solution-preview-one-shot-' + manifest.runId);
    const claim = () => mkdirSync(output, {mode: 0o700});
    const record = (stage, receipt) => {
      const text = JSON.stringify({stage, ...receipt}) + '\n';
      const fd = openSync(join(output, stage + '.json'), 'wx', 0o600);
      try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
      console.log('SOLUTION_PREVIEW_RECEIPT ' + text.trim());
    };
    const {default: OpenAI} = await import('openai');
    const {openAIProxyTransport} = await import('../../lib/openai-proxy-transport.ts');
    const client = new OpenAI({...openAIProxyTransport(), apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, logLevel: 'off'});
    const result = await runPreviewOneShot({manifest, env: process.env, client, claim, record});
    if (result.serviceValidated) {
      // Empty static deployment only. No application routes or result receipts.
      const staticOutput = join(root, '.preview-probe-empty');
      mkdirSync(staticOutput, {mode: 0o700});
      writeFileSync(join(staticOutput, 'index.html'), '<!doctype html><html><head><title></title></head><body></body></html>\n', {flag: 'wx', mode: 0o600});
    }
    process.exitCode = result.serviceValidated ? 0 : 1;
  } catch (error) {
    console.log('SOLUTION_PREVIEW_STOP ' + JSON.stringify(safeFailure(error)));
    process.exitCode = 1;
  }
} else {
  console.error('Use --prepare (offline), or --execute-reserved-once MANIFEST (explicit manual preview only).');
  process.exitCode = 1;
}
