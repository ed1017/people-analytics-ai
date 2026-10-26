import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('published position and external-evidence contracts',()=>{const env={...process.env};delete env.NODE_TEST_CONTEXT;const result=spawnSync(process.execPath,['--test','releases/2026-10-21/source/tests/position-design-scenario.test.mjs','releases/2026-10-21/source/tests/position-goal-isolation.test.mjs','releases/2026-10-21/source/tests/external-workforce-evidence.test.mjs'],{cwd:root,encoding:'utf8',env});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.match(result.stdout,/(?:tests 16|# tests 16)/);assert.doesNotMatch(result.stderr,/skipping running files/);});
