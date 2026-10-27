import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('published position and external-evidence contracts',()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap','releases/2026-10-21/source/tests/position-design-scenario.test.mjs','releases/2026-10-21/source/tests/position-goal-isolation.test.mjs','releases/2026-10-21/source/tests/external-workforce-evidence.test.mjs'],{cwd:root,encoding:'utf8',env});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 // Confirm all three contract families actually ran; new tests may increase the total.
 for(const name of ['current/proposed positions retain stable identity','saved status and revision selection do not leak','source selections preserve exact vintage'])assert.ok(result.stdout.includes(name),name);
 assert.match(result.stdout,/# fail 0\b/);assert.match(result.stdout,/# skipped 0\b/);
 assert.doesNotMatch(result.stderr,/skipping running files/);
});
