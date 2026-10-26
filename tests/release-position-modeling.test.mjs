import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('published position and external-evidence contracts',()=>{const result=spawnSync(process.execPath,['--test','releases/2026-10-21/source/tests/position-design-scenario.test.mjs','releases/2026-10-21/source/tests/position-goal-isolation.test.mjs','releases/2026-10-21/source/tests/external-workforce-evidence.test.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);});
