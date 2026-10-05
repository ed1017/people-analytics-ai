import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import config from '../../lib/ml/synthetic-workforce/protocol.json' with {type:'json'};
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
import {partitionTurnoverGroups} from '../../lib/ml/synthetic-workforce/groups.mjs';
import {buildGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
import {adaptationProtocol as protocol,evaluateAdaptationCase,summarizeAdaptation} from '../../lib/ml/turnover-adaptation/evaluation.mjs';
const root=new URL('../../',import.meta.url),output=new URL('docs/evidence/synthetic-turnover-adaptation-v1/',root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const average=xs=>xs.length?xs.reduce((sum,n)=>sum+n,0)/xs.length:null;
const seeds=Array.from({length:protocol.evaluationSeeds.last-protocol.evaluationSeeds.first+1},(_,i)=>protocol.evaluationSeeds.first+i);
const freshConfig={...config,seeds};
function diagnose(rows){
 return protocol.families.flatMap(family=>['group-a','group-b','group-c','group-d'].map(groupId=>{
  const all=rows.filter(r=>r.family===family&&r.groupId===groupId),issued=all.filter(r=>r.range&&r.actual!==null);
  return {family,groupId,intended:all.length,issuedAndScored:issued.length,covered:issued.filter(r=>r.actual>=r.range.lower&&r.actual<=r.range.upper).length,
   missesAbove:issued.filter(r=>r.actual>r.range.upper).length,missesBelow:issued.filter(r=>r.actual<r.range.lower).length,
   meanActual:average(issued.map(r=>r.actual)),meanPrediction:average(issued.map(r=>r.actual+r.comparisons[0].quarterError)),meanWidth:average(issued.map(r=>r.range.upper-r.range.lower)),
   completeCalibrationQuarters:[...new Set(all.map(r=>r.completeCalibrationQuarters))].sort((a,b)=>a-b)};
 }));
}
export async function turnoverAdaptationArtifacts({onProgress=()=>{}}={}){
 const verified=await buildGroupTurnoverConsumer();assert.equal(verified.status,'current','Original published evidence must remain valid');
 const oldBytes=await readFile(new URL('docs/evidence/synthetic-group-turnover-v1/report.json',root));assert.equal(sha(oldBytes),protocol.diagnosticReportSha256);
 const old=JSON.parse(oldBytes),workforce=JSON.parse(await readFile(new URL('docs/evidence/synthetic-workforce-v1/manifest.json',root)));
 const oldRows=JSON.parse(gunzipSync(await readFile(new URL('docs/evidence/synthetic-group-turnover-v1/validation.json.gz',root)))).rows;
 const paths=[...new Set([...Object.keys(workforce.implementationFiles),...Object.keys(old.implementationFiles),
  'lib/ml/turnover-adaptation/protocol.json','lib/ml/turnover-adaptation/evaluation.mjs','tests/manual/generate-turnover-adaptation.mjs'])];
 const implementationFiles=Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await readFile(new URL(path,root)))])));
 const rows=[],cases=[];
 for(const family of protocol.families){
  for(const seed of seeds){
   const hiring=generateHiring(freshConfig,{family,seed}),turnover=generateTurnover(freshConfig,{family,seed,startEvents:hiring.startEvents}),groups=partitionTurnoverGroups(turnover,{family,seed});
   cases.push({family,seed,releaseSha256:digest(groups.releases),truthSha256:digest(groups.truth)});
   rows.push(...evaluateAdaptationCase(groups.releases,{family,seed}));
  }
  onProgress({family,histories:cases.length});
 }
 const summaries=protocol.families.flatMap(family=>['group-a','group-b','group-c','group-d'].map(groupId=>summarizeAdaptation(rows.filter(r=>r.family===family&&r.groupId===groupId),{family,groupId})));
 const validation=gzipSync(Buffer.from(canonical({kind:'experimental-candidate-ranges-not-published',protocol:protocol.version,rows})+'\n'),{level:9});
 const report={schemaVersion:1,kind:'synthetic-turnover-adaptation-experiment',protocol,protocolSha256:digest(protocol),protocolFrozenCommit:'02f5dd9f0b76644d99e25b74672f18461c97293b',
  priorEvidenceCommit:protocol.sourceCommit,priorConsumerIdentity:verified.identity,implementationFiles,implementationSha256:digest(implementationFiles),
  runtime:{node:process.versions.node,timezone:'UTC',compression:'gzip-level-9-zero-mtime'},generatorConfig:freshConfig,diagnosis:{source:'previously-inspected-seeds1001–1100',groups:diagnose(oldRows)},
  dataset:{histories:cases.length,groupCases:rows.length,monthsPerHistory:config.months,cases},
  validationArtifact:{path:'validation.json.gz',sha256:sha(validation),bytes:validation.length},summaries,
  operationallyQualified:false,realWorldPerformanceValidated:false,publishedInterval:null,rateForecast:null,individualRisk:null,reservedQuarterScore:null,
  limitations:['New seeds assess fixed heuristics in the same visible scenario families; they are not new real data or unseen scenario validation.',
   'A July change absent from June-available history cannot be anticipated by a past-change detector. No scenario label is a forecast feature.',
   'Adaptive scales and three-sigma abstention are fixed heuristics, without exchangeability, calibrated detector significance or distribution-free coverage guarantees.',
   'Conditional coverage excludes abstentions from its denominator; issuance-and-coverage rate and all100 denominators remain explicit.',
   'All original monthly suppression and complete-history/calibration requirements remain; unavailable metrics are null.',
   'Quarter-total intervals are evaluated after clipping/rounding. Paired methods share histories; groups and months are not independent replications.',
   'All candidate bounds remain offline diagnostics. No published interval, original gate, production consumer or operational source qualification is changed.']};
 return {report,files:new Map([['report.json',Buffer.from(JSON.stringify(report,null,2)+'\n')],['validation.json.gz',validation]])};
}
export async function runTurnoverAdaptation(mode,{onProgress}={}){
 assert(['--write','--check'].includes(mode),'Use --write or --check only');const {report,files}=await turnoverAdaptationArtifacts({onProgress});
 if(mode==='--write'){await mkdir(output,{recursive:true});for(const [path,bytes]of files)await writeFile(new URL(path,output),bytes);}
 else{for(const [path,bytes]of files)assert.deepEqual(await readFile(new URL(path,output)),bytes,`Stale adaptation artifact: ${path}`);assert.deepEqual((await readdir(output)).sort(),[...files.keys()].sort());}
 return {status:mode==='--write'?'written':'verified',histories:report.dataset.histories,groupCases:report.dataset.groupCases,implementationSha256:report.implementationSha256};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.length>3)throw Error('Use --write or --check only');console.log(JSON.stringify(await runTurnoverAdaptation(process.argv[2]??'--check',{onProgress:p=>console.error(JSON.stringify(p))})));
}
