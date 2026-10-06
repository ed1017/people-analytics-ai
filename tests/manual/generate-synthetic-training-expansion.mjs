import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {generateWorkforceCase} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {protocol,observeCase,fitCorrections,calibrate,evaluateRow,summarize,missingnessGuard} from '../../lib/ml/synthetic-training-expansion/evaluation.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-training-expansion-v1/',root);
const sha=value=>createHash('sha256').update(value).digest('hex');
const packed=value=>gzipSync(Buffer.from(canonical(value)+'\n'),{level:9});
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const read=path=>readFile(new URL(path,root));
const base=JSON.parse(await read('lib/ml/synthetic-workforce/protocol.json'));
const seeds=group=>Array.from({length:group.lastSeed-group.firstSeed+1},(_,i)=>group.firstSeed+i);
async function custody() {
  const parentBytes=await read('docs/evidence/synthetic-domain-predictions-v1/report.json');assert.equal(sha(parentBytes),protocol.parentReportSha256);
  const parent=JSON.parse(parentBytes);
  for(const [path,expected]of Object.entries(parent.implementationFiles))assert.equal(sha(await read(path)),expected,'Prior implementation changed');
  for(const [path,item]of Object.entries(parent.artifacts))assert.equal(sha(await read('docs/evidence/synthetic-domain-predictions-v1/'+path)),item.sha256,'Prior evidence changed');
  const paths=[...Object.keys(parent.implementationFiles),'lib/ml/synthetic-training-expansion/protocol.json','lib/ml/synthetic-training-expansion/evaluation.mjs','tests/manual/generate-synthetic-training-expansion.mjs'];
  const implementationFiles=Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await read(path))])));
  assert(seeds(protocol.smallTraining).every(seed=>seeds(protocol.expandedTraining).includes(seed)));
  const partitions=['expandedTraining','calibration','test'].map(key=>seeds(protocol[key]));
  assert.equal(new Set(partitions.flat()).size,partitions.flat().length);
  assert(protocol.trainingLabelsAsOf < protocol.testOrigin);
  return {protocol,protocolFrozenCommit:'626441760750741a3f3d1048a34b34dcf7dce344',protocolSha256:digest(protocol),implementationFiles,implementationSha256:digest(implementationFiles),
    parentReportSha256:protocol.parentReportSha256,runtime:{node:process.versions.node,timezone:'UTC'}};
}
async function generateRows(group,role,onProgress) {
  const rows=[],guards=[];const config={...base,seeds:seeds(group)};
  for(const family of protocol.families)for(const seed of config.seeds){
    const result=generateWorkforceCase(config,{seed,family});
    const testing=role==='test';
    rows.push(...observeCase(result,{role,origin:testing?protocol.testOrigin:protocol.trainingOrigin,
      targets:testing?protocol.testTargets:protocol.trainingTargets,labelsAsOf:testing?protocol.testLabelsAsOf:protocol.trainingLabelsAsOf}).map(row=>({seed,family,...row})));
    if(testing&&family==='reporting-stress')guards.push(...missingnessGuard(result).map(row=>({seed,family,...row})));
    if(seed%10===0)onProgress({role,family,seed});
  }
  return {rows,guards};
}
async function trainingFiles(onProgress) {
  const source=await custody();
  const training=(await generateRows(protocol.expandedTraining,'training',onProgress)).rows;
  const calibrationRows=(await generateRows(protocol.calibration,'calibration',onProgress)).rows;
  const fits={'bias-small':fitCorrections(training.filter(row=>row.seed<=protocol.smallTraining.lastSeed)),
    'bias-expanded':fitCorrections(training)};
  const calibration=calibrate(calibrationRows,fits);
  const evidence=packed({training,calibrationRows,fits,calibration});
  const report={kind:'synthetic-training-size-fit',...source,fits,calibration,
    trainingHistories:training.length/3,calibrationHistories:calibrationRows.length/3,
    excludedTraining:training.filter(row=>row.scoringStatus!=='scored').map(row=>({seed:row.seed,family:row.family,domain:row.domain,reasons:[...row.predictionReasons,...row.scoringReasons]})),
    excludedCalibration:calibrationRows.filter(row=>row.scoringStatus!=='scored').map(row=>({seed:row.seed,family:row.family,domain:row.domain,reasons:[...row.predictionReasons,...row.scoringReasons]})),
    artifact:{path:'training.json.gz',sha256:sha(evidence),bytes:evidence.length},publishedInterval:null,operationallyQualified:false};
  return new Map([['training.json.gz',evidence],['training-report.json',json(report)]]);
}
async function testFiles(onProgress) {
  const source=await custody(),freeze=JSON.parse(await readFile(new URL('training-freeze.json',dir)));
  assert(/^[a-f0-9]{40}$/.test(freeze.commit));
  const trainingBytes=await readFile(new URL('training-report.json',dir));assert.equal(sha(trainingBytes),freeze.trainingReportSha256);
  const trainingReport=JSON.parse(trainingBytes);assert.deepEqual(trainingReport.implementationFiles,source.implementationFiles,'Implementation changed after fit freeze');
  const packedTraining=await readFile(new URL('training.json.gz',dir));assert.equal(sha(packedTraining),trainingReport.artifact.sha256);
  const training=JSON.parse(gunzipSync(packedTraining));
  assert.deepEqual(fitCorrections(training.training.filter(row=>row.seed<=protocol.smallTraining.lastSeed)),training.fits['bias-small']);
  assert.deepEqual(fitCorrections(training.training),training.fits['bias-expanded']);
  assert.deepEqual(calibrate(training.calibrationRows,training.fits),training.calibration);
  const generated=await generateRows(protocol.test,'test',onProgress);
  const rows=generated.rows.map(row=>evaluateRow(row,training.fits,training.calibration));
  const evidence=packed({rows,guards:generated.guards});
  const report={kind:'synthetic-training-size-held-out',...source,trainingFreeze:freeze,trainingReportSha256:sha(trainingBytes),
    fits:training.fits,calibration:training.calibration,histories:rows.length/3,domainRows:rows.length,summaries:summarize(rows),
    nativeMissingnessGuards:generated.guards,artifact:{path:'scores.json.gz',sha256:sha(evidence),bytes:evidence.length},
    metricUnits:{turnover:'monthly voluntary exits',hiring:'fraction of each all-opening cohort started within 90 days',satisfaction:'quarterly mean respondent favorable-answer share in percentage points'},
    aggregation:'Equal history weights; equal target-cohort/month weights within history. Hiring fraction error is not opening-weighted Brier/log loss. Mean history RMSE is not pooled RMSE.',
    limitations:['One nested training-size comparison, not a general learning curve.','Generator family labels are evaluation strata only, never correction-model features.','Calibration is from an earlier time and a different regime mix; nominal 90% envelopes have no established test coverage guarantee.','Synthetic seeds do not add real-world evidence, previously missing inputs or new causal mechanisms.','Independent RNG streams and frozen seeds are not independent external custody or real populations.'],
    publishedInterval:null,reserveQuarterScore:null,causalEffect:null,rateForecast:null,operationallyQualified:false,realWorldPerformanceValidated:false};
  return new Map([['scores.json.gz',evidence],['report.json',json(report)]]);
}
export async function runExpansion(mode,{onProgress=()=>{}}={}) {
  assert(['--train','--check-training','--test','--check'].includes(mode));
  const files=mode==='--train'||mode==='--check-training'?await trainingFiles(onProgress):await testFiles(onProgress);
  const check=mode.startsWith('--check');if(!check)await mkdir(dir,{recursive:true});
  for(const [path,bytes]of files){if(check)assert.deepEqual(await readFile(new URL(path,dir)),bytes,`Stale training expansion artifact: ${path}`);else await writeFile(new URL(path,dir),bytes);}
  return {status:check?'verified':'written',files:[...files].map(([path,bytes])=>({path,sha256:sha(bytes)}))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){assert.equal(process.argv.length,3);console.log(JSON.stringify(await runExpansion(process.argv[2],{onProgress:row=>console.error(JSON.stringify(row))})));}
