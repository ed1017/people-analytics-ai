import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {generateWorkforceCase,replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {canonical,digest,monthEnd} from '../../lib/ml/synthetic-workforce/common.mjs';
import {protocol,domains,currentReference,forecastWindow,scoreWindow,summarize} from '../../lib/ml/synthetic-history-length/models.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-history-length-v1/',root);
const read=path=>readFile(new URL(path,root)),sha=value=>createHash('sha256').update(value).digest('hex');
const base=JSON.parse(await read('lib/ml/synthetic-workforce/protocol.json'));
async function custody(){
  const bytes=await read('docs/evidence/synthetic-domain-predictions-v1/report.json');assert.equal(sha(bytes),protocol.parentReportSha256);
  const parent=JSON.parse(bytes);
  for(const [path,expected]of Object.entries(parent.implementationFiles))assert.equal(sha(await read(path)),expected,'Prior implementation changed');
  for(const [path,item]of Object.entries(parent.artifacts))assert.equal(sha(await read('docs/evidence/synthetic-domain-predictions-v1/'+path)),item.sha256,'Prior artifact changed');
  const paths=[...Object.keys(parent.implementationFiles),'lib/ml/synthetic-history-length/protocol.json','lib/ml/synthetic-history-length/models.mjs','tests/manual/generate-synthetic-history-length.mjs'];
  return {implementationFiles:Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await read(path))]))),protocolSha256:digest(protocol),runtime:{node:process.versions.node,timezone:'UTC'}};
}
export async function runHistoryLength(mode,{onProgress=()=>{}}={}){
  assert(['--write','--check'].includes(mode));const source=await custody(),rows=[],guards=[],fingerprints=[];
  const config={...base,seeds:Array.from({length:protocol.lastSeed-protocol.firstSeed+1},(_,i)=>protocol.firstSeed+i)};
  const windows=['current',...protocol.lookbackMonths];
  for(const family of protocol.families)for(const seed of config.seeds){
    const result=generateWorkforceCase(config,{seed,family});
    for(const domain of domains){
      const releases=result.domains[domain].releases,months=domain==='satisfaction'?[protocol.targets.at(-1)]:protocol.targets;
      const snapshot=replaySynthetic(domain,releases,protocol.origin);
      // Compute every arm before supplying any scoring labels.
      const forecasts=windows.map(window=>({window,forecast:window==='current'?currentReference(snapshot,months):forecastWindow(snapshot,months,window)}));
      const labels=replaySynthetic(domain,releases.filter(row=>row.effectiveAt<=monthEnd(protocol.targets.at(-1))),protocol.labelsAsOf);
      fingerprints.push({seed,family,domain,inputSha256:digest(snapshot),labelsSha256:digest(labels)});
      rows.push(...forecasts.map(({window,forecast})=>({seed,family,domain,window,origin:protocol.origin,months,forecast,scoring:scoreWindow(labels,forecast)})));
      if(family==='reporting-stress'){
        const input=replaySynthetic(domain,releases,protocol.missingnessGuardOrigin);
        for(const window of windows){const forecast=window==='current'?currentReference(input,protocol.missingnessGuardTargets):forecastWindow(input,protocol.missingnessGuardTargets,window);
          guards.push({seed,family,domain,window,status:forecast.status,reasons:forecast.reasons,audit:forecast.audit});}
      }
    }
    if(seed%10===0)onProgress({family,seed});
  }
  const scores=gzipSync(Buffer.from(canonical({rows,guards,fingerprints})+'\n'),{level:9});
  const report={kind:'synthetic-history-length-comparison',protocol,protocolFrozenCommit:'9cc665918c21422ccb8420819e8155268d223b35',...source,
    historyCases:config.seeds.length*protocol.families.length,scoringRows:rows.length,summaries:summarize(rows),
    guardSummary:domains.flatMap(domain=>windows.map(window=>{const selected=guards.filter(row=>row.domain===domain&&row.window===window);return {domain,window,cases:selected.length,
      predicted:selected.filter(row=>row.status==='predicted').length,blocked:selected.filter(row=>row.status==='blocked').length,
      reasons:[...new Set(selected.flatMap(row=>row.reasons))]};})),
    artifact:{path:'scores.json.gz',sha256:sha(scores),bytes:scores.length},
    units:{turnover:'monthly voluntary-exit counts',hiring:'opening-weighted percentage-point MAE plus Brier/log loss',satisfaction:'quarterly score percentage-point MAE'},
    aggregation:'Mean per-history metrics; mean history RMSE is not pooled RMSE. Pairwise contrasts use common scored histories only; absence of support is not an error value.',
    limitations:['New simulated seeds, not reconstructed source history or real-world validation.','Current methods and app contracts are unchanged; 12-month turnover uses an explicitly exploratory support exception.','No pure seasonality-off turnover control: stable hazard includes seasonal variation and changing headcount.','Hiring gradual improvement changes duration but generally not the within-90-day target probability.','Old missing survey waves prevent a clean 60-month accuracy comparison; short unsupported arms are eligibility results only.','One held-out quarter under each known generating family is not a general learning curve.'],
    publishedInterval:null,rateForecast:null,causalEffect:null,reserveQuarterScore:null,operationallyQualified:false,realWorldPerformanceValidated:false};
  const files=new Map([['scores.json.gz',scores],['report.json',Buffer.from(JSON.stringify(report,null,2)+'\n')]]);
  if(mode==='--write')await mkdir(dir,{recursive:true});
  for(const [path,bytes]of files){if(mode==='--check')assert.deepEqual(await readFile(new URL(path,dir)),bytes,`Stale ${path}`);else await writeFile(new URL(path,dir),bytes);}
  return {status:mode==='--check'?'verified':'written',histories:report.historyCases,rows:report.scoringRows,reportSha256:sha(files.get('report.json'))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){assert.equal(process.argv.length,3);console.log(JSON.stringify(await runHistoryLength(process.argv[2],{onProgress:row=>console.error(JSON.stringify(row))})));}
