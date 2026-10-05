import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sourceConfig from '../../lib/ml/synthetic-workforce/protocol.json' with {type:'json'};
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
import {partitionTurnoverGroups} from '../../lib/ml/synthetic-workforce/groups.mjs';
import {validateReleases} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {groupTurnoverProtocol as protocol,evaluateGroupCase,validateIntervalGate,publishGroupCase} from '../../lib/ml/group-turnover/evaluation.mjs';
const root=new URL('../../',import.meta.url),output=new URL('docs/evidence/synthetic-group-turnover-v1/',root);
const shaBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['lib/ml/synthetic-workforce/common.mjs','lib/ml/synthetic-workforce/protocol.json','lib/ml/synthetic-workforce/hiring.mjs','lib/ml/synthetic-workforce/turnover.mjs','lib/ml/synthetic-workforce/groups.mjs','lib/ml/synthetic-workforce/pipeline.mjs','lib/ml/group-turnover/protocol.json','lib/ml/group-turnover/evaluation.mjs','lib/ml/turnover-vintage-evaluation.mjs','tests/manual/generate-group-turnover.mjs'];
const seeds=Array.from({length:protocol.validationSeeds.last-protocol.validationSeeds.first+1},(_,i)=>protocol.validationSeeds.first+i);
const extendedConfig={...sourceConfig,seeds:[...protocol.demoSeeds,...seeds]};
function generate(family,seed){
 const hiring=generateHiring(extendedConfig,{seed,family});
 const turnover=generateTurnover(extendedConfig,{seed,family,startEvents:hiring.startEvents});
 const groups=partitionTurnoverGroups(turnover,{seed,family});
 validateReleases('turnover',groups.releases);
 return {groups,companyTurnoverSha256:digest(turnover)};
}
function comparisons(rows){
 return protocol.methods.map(method=>{
  const evaluated=rows.map(r=>r.comparisons.find(c=>c.method===method)).filter(c=>c?.monthly&&c.quarterError!==null);
  const monthlyN=evaluated.reduce((n,r)=>n+r.monthly.n,0),quarterN=evaluated.length;
  return {method,intendedCases:rows.length,evaluatedCases:quarterN,blockedCases:rows.length-quarterN,
   monthly:monthlyN?{n:monthlyN,mae:evaluated.reduce((n,r)=>n+r.monthly.mae*r.monthly.n,0)/monthlyN,rmse:Math.sqrt(evaluated.reduce((n,r)=>n+r.monthly.rmse**2*r.monthly.n,0)/monthlyN),bias:evaluated.reduce((n,r)=>n+r.monthly.bias*r.monthly.n,0)/monthlyN}:null,
   quarterly:quarterN?{n:quarterN,mae:evaluated.reduce((n,r)=>n+Math.abs(r.quarterError),0)/quarterN,rmse:Math.sqrt(evaluated.reduce((n,r)=>n+r.quarterError**2,0)/quarterN),bias:evaluated.reduce((n,r)=>n+r.quarterError,0)/quarterN}:null};
 });
}
export async function groupTurnoverArtifacts({onProgress=()=>{}}={}){
 const files=new Map(),validationRows=[],validationCases=[],demos=[];
 const implementationFiles=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,shaBytes(await readFile(new URL(p,root)))])));
 for(const family of protocol.families){
  for(const seed of seeds){
   const {groups,companyTurnoverSha256}=generate(family,seed);
   const evaluated=evaluateGroupCase(groups.releases,{family,seed});
   validationCases.push({family,seed,companyTurnoverSha256,groupReleasesSha256:digest(groups.releases),groupTruthSha256:digest(groups.truth)});
   validationRows.push(...evaluated.map(r=>({family,seed,groupId:r.groupId,method:r.method,status:r.forecast.status,reasons:r.forecast.reasons,
    trainingEnd:r.forecast.trainingEnd,trainingFingerprint:r.forecast.trainingFingerprint,calibrationStatus:r.calibration.status,completeCalibrationQuarters:r.calibration.completeQuarters,
    range:r.range,actual:r.actual,scoringStatus:r.scoringStatus,comparisons:r.comparisons})));
  }
  onProgress({family,validationCases:validationCases.length});
 }
 const gates=protocol.families.flatMap(family=>protocol.groups.map(({id:groupId})=>validateIntervalGate(validationRows.filter(r=>r.family===family&&r.groupId===groupId),{family,groupId})));
 const demoArtifacts=[];
 for(const family of protocol.families)for(const seed of protocol.demoSeeds){
  const {groups,companyTurnoverSha256}=generate(family,seed),artifacts={};
  for(const kind of ['releases','truth']){
   const payload={dataClass:'constructed-synthetic',observationBasis:'simulated',operationallyQualified:false,kind:kind==='truth'?'synthetic-ground-truth-do-not-train-from-future':'synthetic-group-releases',family,seed,definitions:groups.definitions,records:groups[kind]};
   const raw=canonical(payload)+'\n',bytes=gzipSync(Buffer.from(raw),{level:9}),path=`${kind}/${family}-${seed}.json.gz`;
   files.set(path,bytes);artifacts[kind]={path,sha256:shaBytes(bytes),jsonSha256:digest(raw),bytes:bytes.length};
  }
  demoArtifacts.push({family,seed,companyTurnoverSha256,artifacts});
  demos.push(...evaluateGroupCase(groups.releases,{family,seed,includeYearEnd:true}).map(r=>publishGroupCase(r,gates.find(g=>g.family===family&&g.groupId===r.groupId))));
 }
 const pairedComparisons=protocol.families.flatMap(family=>protocol.groups.map(({id:groupId})=>({family,groupId,methods:comparisons(validationRows.filter(r=>r.family===family&&r.groupId===groupId))})));
 const report={schemaVersion:1,kind:'synthetic-group-turnover-evaluation',protocol,protocolSha256:digest(protocol),
  protocolFrozenCommit:'faa39a92d0022216dbdbd6785b0e16b33995f18e',sourceGeneratorCommit:protocol.sourceGeneratorCommit,
  runtime:{node:process.versions.node,timezone:'UTC',compression:'gzip-level-9-zero-mtime'},implementationFiles,implementationSha256:digest(implementationFiles),extendedGeneratorConfig:extendedConfig,
  dataset:{validationHistories:validationCases.length,demoHistories:demoArtifacts.length,monthsPerHistory:sourceConfig.months,groupsPerHistory:protocol.groups.length,validationCases,demoArtifacts},
  qualificationAvailableAt:protocol.interval.qualificationAvailableAt,qualificationTiming:protocol.interval.qualificationTiming,
  gates,pairedComparisons,demos,dataClass:'constructed-synthetic',observationBasis:'simulated',operationallyQualified:false,realWorldPerformanceValidated:false,causalEffect:null,rateForecast:null,individualRisk:null,
  limitations:['Generated group memberships, transition probabilities and availability clocks are assumptions, not observed company history.',
   'Groups share company totals and calendar conditions. Only seed replicates within a family/group are validation units; groups and months are not independent replications.',
   'The frozen primary method is not selected from assessment results. Comparison scores are conditional simulation results only.',
   'Candidate ranges use rolling residuals without established temporal exchangeability; no distribution-free or simultaneous coverage claim.',
   'Gate status is retrospectively computed at the scoring cutoff, not information available at either forecast origin.',
   'Small groups and incomplete histories abstain. Suppression is not a formal or repeated-release privacy guarantee.',
   'October–December remains unscored and all year-end intervals are null. No future exposure means no rate forecast.',
   'Existing hiring, satisfaction, historical extract and UI outputs are unchanged. This experiment does not qualify an operational source adapter.']};
 files.set('validation.json.gz',gzipSync(Buffer.from(canonical({kind:'synthetic-held-out-validation-rows',rows:validationRows})+'\n'),{level:9}));
 report.validationArtifact={path:'validation.json.gz',sha256:shaBytes(files.get('validation.json.gz')),bytes:files.get('validation.json.gz').length};
 files.set('report.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));
 return {files,report};
}
export async function runGroupTurnover(mode,{onProgress}={}){
 assert(['--write','--check'].includes(mode),'Use --write or --check only');
 const {files,report}=await groupTurnoverArtifacts({onProgress});
 if(mode==='--write'){
  for(const folder of ['','releases','truth'])await mkdir(new URL(folder+'/',output),{recursive:true});
  for(const [path,bytes]of files)await writeFile(new URL(path,output),bytes);
 }else{
  for(const [path,bytes]of files)assert.deepEqual(await readFile(new URL(path,output)),bytes,`Artifact differs: ${path}`);
  const actual=(await readdir(output,{recursive:true})).filter(p=>p.endsWith('.json')||p.endsWith('.gz')).sort();assert.deepEqual(actual,[...files.keys()].sort());
 }
 return {status:mode==='--write'?'written':'verified',output:fileURLToPath(output),files:files.size,validationHistories:report.dataset.validationHistories,
  qualifiedGates:report.gates.filter(g=>g.status==='qualified-conditional-simulation').length,totalGates:report.gates.length,implementationSha256:report.implementationSha256};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.length>3)throw Error('Use --write or --check only');
 console.log(JSON.stringify(await runGroupTurnover(process.argv[2]??'--check',{onProgress:progress=>console.error(JSON.stringify(progress))})));
}
