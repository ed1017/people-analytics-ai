/** Offline source verification only; never executes a model or a continuation. */
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {fixture} from '../fixtures/swp-period-contract-continuation.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=fileURLToPath(new URL('../../',import.meta.url));
const expected=process.argv[2],path='tests/fixtures/swp-period-contract-source-manifest.json';
if(process.argv.length!==3||!/^[a-f0-9]{64}$/.test(expected??''))throw Error('Supply the externally pinned manifest file SHA256.');
const bytes=readFileSync(join(root,path));if(hash(bytes)!==expected)throw Error('Source manifest identity changed.');
const m=JSON.parse(bytes);if(m.kind!=='swp-period-contract-source-v1'||m.paidExecutionAuthorized!==false||m.providerExecutionEntryPoint!==null)throw Error('Expected an unarmed period-contract manifest.');
for(const [path,digest] of Object.entries({...m.runtimeFiles,...m.supportFiles}))if(hash(readFileSync(join(root,path)))!==digest)throw Error('Source changed: '+path);
const found=Object.keys(m.runtimeFiles).filter(path=>!path.includes('/'));
function visit(dir){for(const e of readdirSync(join(root,dir),{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())visit(path);else if(e.isFile())found.push(path);else throw Error('Unexpected runtime source entry: '+path);}}
for(const dir of ['app','components','lib','public'])visit(dir);
if(JSON.stringify(found.sort())!==JSON.stringify(Object.keys(m.runtimeFiles).sort()))throw Error('Runtime source membership changed.');
const runtime=Object.fromEntries(Object.entries(m.runtimeFiles).sort(([a],[b])=>a.localeCompare(b,'en')));
// Manifest paths are ASCII; use code-point sorting to match its pinned convention.
const sorted=Object.fromEntries(Object.keys(runtime).sort().map(path=>[path,runtime[path]]));
if(Object.keys(sorted).length!==m.runtimeFileCount||hash(JSON.stringify(sorted))!==m.runtimeSha256)throw Error('Runtime digest changed.');
if(hash(JSON.stringify(fixture))!==m.fixture.objectSha256||fixture.id!==m.fixture.id||fixture.paidExecutionAuthorized!==false)throw Error('Fixture identity changed.');
console.log(JSON.stringify({verified:true,manifestFileSha256:expected,runtimeFileCount:m.runtimeFileCount,runtimeSha256:m.runtimeSha256,fixture:m.fixture,contract:m.contract,providerCalls:0,paidExecutionAuthorized:false},null,2));
