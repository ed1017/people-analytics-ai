import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
test('published accounting scripts match the repository-byte manifest',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'database/accounting-history/manifest.json')));
 assert.equal(m.migrations.length,12);
 for(const item of m.migrations.filter(x=>x.source))assert.equal(hash(item.source),item.sha256,item.source);
});
test('current no-seed bootstrap is the exact PostgreSQL-rehearsed artifact',()=>{
 assert.equal(hash('database/fresh-accounting/bootstrap-current.sql'),'6198f07dfb7af9273c518755bd4d54a13f032a479f4148bb7c57ed0fa7528f83');
});
