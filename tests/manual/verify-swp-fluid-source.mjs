/** Offline verification only. The separately supplied digest must come from review. */
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {fixture} from '../fixtures/swp-reference-continuation.mjs';
import {demandReferenceModelContract} from '../../lib/swp-demand-reference.ts';

const root=fileURLToPath(new URL('../../',import.meta.url));
const manifestPath='tests/fixtures/swp-fluid-source-manifest.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const expected=process.argv[2];
if(process.argv.length!==3||!/^[a-f0-9]{64}$/.test(expected??''))throw Error('Supply the externally pinned manifest file SHA256.');
const bytes=readFileSync(join(root,manifestPath));
if(hash(bytes)!==expected)throw Error('Source manifest identity changed.');
const m=JSON.parse(bytes);
if(m.kind!=='swp-fluid-source-v1'||m.paidExecutionAuthorized!==false||m.providerExecutionEntryPoint!==null||m.acceptance.fullAcceptance!==false)throw Error('Expected the unarmed fluid integration source manifest.');
for(const [path,digest] of Object.entries({...m.runtimeFiles,...m.supportFiles})){
 if(path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')||!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid source entry.');
 if(!lstatSync(join(root,path)).isFile()||hash(readFileSync(join(root,path)))!==digest)throw Error('Source changed: '+path);
}
function files(dir){return readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{
 const path=dir+'/'+entry.name;
 if(entry.isDirectory())return files(path);
 if(!entry.isFile())throw Error('Unexpected source entry: '+path);
 return [path];
});}
const found=[...Object.keys(m.runtimeFiles).filter(path=>!path.includes('/')),...['app','components','lib','public'].flatMap(files)].sort();
if(JSON.stringify(found)!==JSON.stringify(Object.keys(m.runtimeFiles).sort()))throw Error('Runtime source membership changed.');
const tests=files('tests').filter(path=>path!==manifestPath).sort();
if(JSON.stringify(tests)!==JSON.stringify(Object.keys(m.supportFiles).filter(path=>path.startsWith('tests/')).sort()))throw Error('Test source membership changed.');
for(const name of ['runtime','support']){
 const table=m[name+'Files'],sorted=Object.fromEntries(Object.keys(table).sort().map(path=>[path,table[path]]));
 if(Object.keys(sorted).length!==m[name+'FileCount']||hash(JSON.stringify(sorted))!==m[name+'Sha256'])throw Error(name+' digest changed.');
}
const frozen=m.preservedReference;
if(fixture.id!==frozen.fixture.id||hash(JSON.stringify(fixture))!==frozen.fixture.objectSha256||fixture.paidExecutionAuthorized!==false||hash(readFileSync(join(root,'tests/fixtures/swp-reference-continuation.mjs')))!==frozen.fixture.fileSha256)throw Error('Frozen reference fixture changed.');
if(hash(JSON.stringify(demandReferenceModelContract))!==frozen.baseModelContractSha256||hash(readFileSync(join(root,'tests/fixtures/swp-reference-source-manifest.json')))!==frozen.frozenManifestFileSha256)throw Error('Frozen reference contract changed.');
console.log(JSON.stringify({verified:true,manifestFileSha256:expected,runtimeCommit:m.runtimeCommit,runtimeFileCount:m.runtimeFileCount,runtimeSha256:m.runtimeSha256,supportFileCount:m.supportFileCount,preservedReference:frozen,historyContracts:m.historyContracts,instructionComposition:m.instructionComposition,providerCalls:0,paidExecutionAuthorized:false,fullAcceptance:false},null,2));
