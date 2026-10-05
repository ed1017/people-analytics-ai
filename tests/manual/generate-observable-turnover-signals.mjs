import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {buildGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
import {generateSignalHistory} from '../../lib/ml/observable-turnover-signals/generator.mjs';
import {signalProtocol as protocol,trainingRows,fitSignalModels,evaluateSignalHistory,summarizeSignalRows} from '../../lib/ml/observable-turnover-signals/model.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-observable-signals-v1/',root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const packed=value=>gzipSync(Buffer.from(canonical(value)+'\n'),{level:9});
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const priorReports={'docs/evidence/synthetic-paired-prefix-v1/report.json':'fb17a87d61ad74b20f188ec1f9cc4e4b90c4d8bb30cdf2b561566e39203015fe',
 'docs/evidence/synthetic-turnover-adaptation-v1/report.json':'18876092e44d00c849536351d3c37e51b1729ff52a279b44af450832e58883d6'};
async function custody(){
 const prior=await buildGroupTurnoverConsumer();assert.equal(prior.status,'current');
 for(const [path,expected]of Object.entries(priorReports))assert.equal(sha(await readFile(new URL(path,root))),expected,'Prior evidence changed');
 const previous=JSON.parse(await readFile(new URL('docs/evidence/synthetic-paired-prefix-v1/report.json',root)));
 const paths=[...new Set([...Object.keys(previous.implementationFiles),'lib/ml/observable-turnover-signals/protocol.json','lib/ml/observable-turnover-signals/generator.mjs','lib/ml/observable-turnover-signals/model.mjs','tests/manual/generate-observable-turnover-signals.mjs'])];
 const implementationFiles=Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await readFile(new URL(path,root)))])));
 return {protocol,protocolSha256:digest(protocol),protocolFrozenCommit:'5794c64b0b7857df0d1d0b26529ae54513f831b7',priorReports,priorConsumerIdentity:prior.identity,
  implementationFiles,implementationSha256:digest(implementationFiles),runtime:{node:process.versions.node,timezone:'UTC',compression:'gzip-level-9-zero-mtime'}};
}
function fingerprint(history){return {seed:history.seed,signalSha256:digest(history.signalRelease),assignments:history.assignments,
 branches:Object.fromEntries(Object.entries(history.branches).map(([name,branch])=>[name,{truthSha256:digest(branch.groups.truth),releasesSha256:digest(branch.groups.releases)}]))};}
async function trainingArtifacts(onProgress){
 const source=await custody(),rows=[],fingerprints=[];
 for(let seed=protocol.training.firstSeed;seed<=protocol.training.lastSeed;seed++){
  const history=generateSignalHistory(seed,'training');fingerprints.push(fingerprint(history));
  for(const scenario of protocol.models.trainingScenarios)rows.push(...trainingRows(history,scenario));
  if(fingerprints.length%25===0)onProgress({stage:'training',histories:fingerprints.length});
 }
 const fits=fitSignalModels(rows),training=packed({kind:'frozen-training-evidence',rows,fits});
 const report={kind:'synthetic-observable-signals-training',...source,histories:100,scenarioGroupRows:rows.length,fingerprints,
  trainingLabelsAsOf:protocol.training.labelsAsOf,testOrigin:protocol.test.origin,fits,
  artifacts:{'training.json.gz':{sha256:sha(training),bytes:training.length}},operationallyQualified:false,publishedInterval:null};
 return new Map([['training.json.gz',training],['training-report.json',json(report)]]);
}
async function testArtifacts(onProgress){
 const source=await custody(),freeze=JSON.parse(await readFile(new URL('training-freeze.json',dir)));
 assert(/^[a-f0-9]{40}$/.test(freeze.commit));assert.equal(freeze.protocolFrozenCommit,source.protocolFrozenCommit);
 const reportBytes=await readFile(new URL('training-report.json',dir));assert.equal(sha(reportBytes),freeze.trainingReportSha256);
 const trainingReport=JSON.parse(reportBytes);assert.deepEqual(trainingReport.implementationFiles,source.implementationFiles,'Implementation changed after training fit');
 const trainingBytes=await readFile(new URL('training.json.gz',dir));assert.equal(sha(trainingBytes),trainingReport.artifacts['training.json.gz'].sha256);
 const training=JSON.parse(gunzipSync(trainingBytes));assert.deepEqual(fitSignalModels(training.rows),training.fits);assert.deepEqual(training.fits,trainingReport.fits);
 const rows=[],fingerprints=[];
 for(let seed=protocol.test.firstSeed;seed<=protocol.test.lastSeed;seed++){
  const history=generateSignalHistory(seed,'test');fingerprints.push(fingerprint(history));rows.push(...evaluateSignalHistory(history,training.fits));
  if(fingerprints.length%25===0)onProgress({stage:'test',histories:fingerprints.length});
 }
 const scores=packed({kind:'held-out-synthetic-signal-scores',rows}),summaries=['informative','no-signal','reversed'].flatMap(scenario=>['group-a','group-b','group-c','group-d'].map(groupId=>
  summarizeSignalRows(rows.filter(r=>r.scenario===scenario&&r.forecast.groupId===groupId),scenario,groupId)));
 const report={kind:'synthetic-observable-signals-held-out',...source,trainingFreeze:freeze,trainingArtifactSha256:sha(trainingBytes),histories:100,scenarioGroupRows:rows.length,fingerprints,
  artifacts:{'scores.json.gz':{sha256:sha(scores),bytes:scores.length}},summaries,
  controls:{prefixEqualityHistories:100,lateSignalExactFallbacks:rows.filter(r=>r.delayedSignalControl.equalsIntercept).length},
  publishedInterval:null,rateForecast:null,individualRisk:null,causalEffect:null,reservedQuarterScore:null,operationallyQualified:false,realWorldPerformanceValidated:false};
 return new Map([['scores.json.gz',scores],['report.json',json(report)]]);
}
export async function runSignalExperiment(mode,{onProgress=()=>{}}={}){
 assert(['--train','--check-training','--test','--check'].includes(mode),'Use --train, --check-training, --test or --check');
 const files=mode==='--train'||mode==='--check-training'?await trainingArtifacts(onProgress):await testArtifacts(onProgress);
 const check=mode.startsWith('--check');if(!check)await mkdir(dir,{recursive:true});
 for(const [path,bytes]of files){if(check)assert.deepEqual(await readFile(new URL(path,dir)),bytes,`Stale observable signal artifact: ${path}`);else await writeFile(new URL(path,dir),bytes);}
 return {status:check?'verified':'written',stage:mode==='--train'||mode==='--check-training'?'training':'test',histories:100,files:[...files.keys()]};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){assert(process.argv.length===3,'Supply one explicit mode');console.log(JSON.stringify(await runSignalExperiment(process.argv[2],{onProgress:p=>console.error(JSON.stringify(p))})));}
