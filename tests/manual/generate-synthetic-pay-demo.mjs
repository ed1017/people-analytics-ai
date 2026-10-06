import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {buildSyntheticPayDemo,payDemoPath} from '../../lib/simulation/pay-demo.mjs';
const mode=process.argv[2];assert(['--write','--check'].includes(mode));const data=await buildSyntheticPayDemo(),bytes=JSON.stringify(data,null,2)+'\n',file=new URL('../../'+payDemoPath,import.meta.url);
if(mode==='--write')await writeFile(file,bytes);else assert.equal(await readFile(file,'utf8'),bytes,'Synthetic pay artifact differs from the local qualified generator');
console.log(JSON.stringify({status:mode==='--write'?'written':'verified',dataset:data.dataset,cohorts:data.cohorts.length,published:data.cohorts.filter(row=>row.status==='published').length,rowRecordsPublished:false}));
