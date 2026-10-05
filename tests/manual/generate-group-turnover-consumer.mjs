import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildGroupTurnoverConsumer,groupTurnoverConsumerPath} from '../../lib/ml/group-turnover-consumer.mjs';
export async function runGroupTurnoverConsumer(mode){
 assert(['--write','--check'].includes(mode),'Use --write or --check only');
 const result=await buildGroupTurnoverConsumer();assert.equal(result.status,'current',result.reasonCodes.join(','));
 const file=new URL('../../'+groupTurnoverConsumerPath,import.meta.url),bytes=JSON.stringify(result,null,2)+'\n';
 if(mode==='--write')await writeFile(file,bytes);else assert.equal(await readFile(file,'utf8'),bytes,'Consumer projection is stale');
 return {status:mode==='--write'?'written':'verified',identity:result.identity,evidenceCommit:result.evidence.commit,cases:result.cases.length};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.length>3)throw Error('Use --write or --check only');console.log(JSON.stringify(await runGroupTurnoverConsumer(process.argv[2]??'--check')));
}
