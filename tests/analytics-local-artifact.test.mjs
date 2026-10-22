import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const root=new URL('../database/analytics-local/',import.meta.url);
test('local analytics SQL matches the rehearsed byte identity',()=>{const bytes=fs.readFileSync(new URL('schema.sql',root));assert.equal(createHash('sha256').update(bytes).digest('hex'),fs.readFileSync(new URL('schema.sha256',root),'utf8').trim());});
