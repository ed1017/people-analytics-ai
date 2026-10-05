import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
test('public producer handles actual file, parse and regeneration failures in an isolated checkout',async()=>{
 const root=await mkdtemp(join(tmpdir(),'analysis-demo-failures-'));
 try{
  await Promise.all(['lib','tests','docs'].map(dir=>cp(new URL('../'+dir,import.meta.url),join(root,dir),{recursive:true})));
  const artifact=join(root,'docs/evidence/satisfaction-wave-change-v1.json'),saved=await readFile(artifact,'utf8');
  const producer=join(root,'tests/manual/report-satisfaction-wave-change.mjs'),producerText=await readFile(producer,'utf8');
  const source=join(root,'tests/manual/forecast-consumer.mjs'),sourceText=await readFile(source,'utf8');
  const moduleUrl=pathToFileURL(join(root,'tests/manual/action-plan-analysis-demo.mjs')).href;
  const run=async()=>{const {stdout}=await exec(process.execPath,['--input-type=module','-e',
   `import {actionPlanAnalysisDemo,analysisDemoDraft} from ${JSON.stringify(moduleUrl)};const r=await actionPlanAnalysisDemo(await analysisDemoDraft());console.log(JSON.stringify({status:r.status,forecastBaseline:r.forecastBaseline,domains:r.domains&&Object.fromEntries(Object.entries(r.domains).map(([k,v])=>[k,{status:v.status,payloadPresent:v.payload!==null,reasonCodes:v.reasonCodes}]))}));`],{maxBuffer:1024*1024});return JSON.parse(stdout);};
  const checkPartial=(r,reason)=>{assert.equal(r.status,'current');assert.equal(r.domains.turnover.status,'available');assert.equal(r.domains.hiring.status,'available');
   assert.equal(r.domains.satisfaction.payloadPresent,false);assert.deepEqual(r.domains.satisfaction.reasonCodes,[reason]);assert.equal(r.forecastBaseline,null);};
  await rm(artifact);checkPartial(await run(),'satisfaction-artifact-missing-or-invalid');
  await writeFile(artifact,'{ invalid JSON');checkPartial(await run(),'satisfaction-artifact-missing-or-invalid');
  const tampered=JSON.parse(saved);tampered.example.waves[0].scorePct=1;await writeFile(artifact,JSON.stringify(tampered));
  checkPartial(await run(),'satisfaction-artifact-stale');
  await writeFile(artifact,saved);
  await writeFile(producer,producerText.replace('export async function satisfactionWaveChangeReport(){','export async function satisfactionWaveChangeReport(){throw Error("isolated-test-fault");'));
  checkPartial(await run(),'satisfaction-regeneration-or-projection-failed');
  await writeFile(producer,producerText);
  await writeFile(source,sourceText.replace('export async function exitForecastForConsumer() {','export async function exitForecastForConsumer() {throw Error("isolated-test-fault");'));
  const failed=await run();assert.equal(failed.status,'unavailable');assert.equal(failed.domains,null);assert.equal(failed.forecastBaseline,null);
 }finally{await rm(root,{recursive:true,force:true});}
});
