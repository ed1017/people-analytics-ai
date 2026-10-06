import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {buildSyntheticDomainDemo,domainDemoPath} from '../../lib/ml/synthetic-domain-demo.mjs';
const mode=process.argv[2];assert(['--check','--write'].includes(mode));const result=await buildSyntheticDomainDemo();assert.equal(result.status,'verified','Synthetic domain evidence is unavailable or stale');
const file=new URL('../../'+domainDemoPath,import.meta.url),bytes=JSON.stringify(result,null,2)+'\n';
if(mode==='--write')await writeFile(file,bytes);else assert.equal(await readFile(file,'utf8'),bytes,'Synthetic domain projection differs from verified evidence');
console.log(JSON.stringify({status:mode==='--write'?'written':'verified',reportSha256:result.evidence.reportSha256,domains:Object.keys(result.domains)}));
