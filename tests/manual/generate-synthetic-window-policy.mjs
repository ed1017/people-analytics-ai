import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {generateWorkforceCase,replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {currentReference,forecastWindow} from '../../lib/ml/synthetic-history-length/models.mjs';
import {protocol,domains,prepareDecision,evaluateDecision,selectWindow,summarize} from '../../lib/ml/synthetic-window-policy/evaluation.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-window-policy-v1/',root);
const read=path=>readFile(new URL(path,root)),sha=value=>createHash('sha256').update(value).digest('hex');
const base=JSON.parse(await read('lib/ml/synthetic-workforce/protocol.json'));
async function custody(){
  const bytes=await read('docs/evidence/synthetic-history-length-v1/report.json');assert.equal(sha(bytes),protocol.parentReportSha256);
  const parent=JSON.parse(bytes);
  for(const [path,expected]of Object.entries(parent.implementationFiles))assert.equal(sha(await read(path)),expected,'Prior implementation changed');
  assert.equal(sha(await read('docs/evidence/synthetic-history-length-v1/'+parent.artifact.path)),parent.artifact.sha256);
  const paths=[...Object.keys(parent.implementationFiles),'lib/ml/synthetic-window-policy/protocol.json','lib/ml/synthetic-window-policy/evaluation.mjs','tests/manual/generate-synthetic-window-policy.mjs'];
  return {implementationFiles:Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await read(path))]))),protocolSha256:digest(protocol),runtime:{node:process.versions.node,timezone:'UTC'}};
}
export async function runWindowPolicy(mode,{onProgress=()=>{}}={}){
  assert(['--write','--check'].includes(mode));const source=await custody(),rows=[],guards=[];
  const config={...base,seeds:Array.from({length:protocol.lastSeed-protocol.firstSeed+1},(_,i)=>protocol.firstSeed+i)};
  for(const family of protocol.families)for(const seed of config.seeds){
    const result=generateWorkforceCase(config,{seed,family}),cache=new Map();
    // Freeze all decisions for this history before final target scoring.
    const decisions=domains.flatMap(domain=>protocol.decisionOrigins.map(origin=>prepareDecision(result,domain,origin,cache)));
    rows.push(...decisions.map(prepared=>({seed,family,...evaluateDecision(result,prepared)})));
    if(family==='reporting-stress')for(const domain of domains){
      // An abstention-only guard at November cutoff, predicting December, with no validation folds or accuracy claim.
      const input=replaySynthetic(domain,result.domains[domain].releases,protocol.missingnessGuardOrigin),months=['2025-12'];
      const forecasts=protocol.windows.map(window=>({window,forecast:window==='current'?currentReference(input,months):forecastWindow(input,months,window)}));
      const decision=selectWindow({domain,cutoff:protocol.missingnessGuardOrigin,forecasts,validation:[]});
      guards.push({seed,family,domain,origin:protocol.missingnessGuardOrigin,months,inputSha256:digest(input),decision});
    }
    if(seed%5===0)onProgress({family,seed});
  }
  const scores=gzipSync(Buffer.from(canonical({rows,guards})+'\n'),{level:9});
  const report={kind:'synthetic-prior-release-window-policy',protocol,protocolFrozenCommit:'73c9b467eae3405f13320223ffebd499e6623562',...source,
    historyCases:config.seeds.length*protocol.families.length,decisionRows:rows.length,summaries:summarize(rows),
    guardDescription:'December-only abstention guard at November cutoff; no validation folds or accuracy comparison. Current forecast failures must remain policy failures.',
    guardSummary:domains.map(domain=>{const selected=guards.filter(row=>row.domain===domain);return {domain,cases:selected.length,
      predicted:selected.filter(row=>row.decision.selectedForecast.status==='predicted').length,blocked:selected.filter(row=>row.decision.status==='blocked').length,
      reasons:[...new Set(selected.flatMap(row=>row.decision.selectedForecast.reasons))]};}),
    artifact:{path:'scores.json.gz',sha256:sha(scores),bytes:scores.length},
    units:{turnover:'monthly voluntary-exit counts',hiring:'opening-weighted percentage-point MAE',satisfaction:'quarterly score percentage-point MAE'},
    aggregation:'Paired mean per-decision metrics; mean history RMSE is not pooled RMSE. Origins and families are dependent repeated scenarios, not independent trials. Missing scores never become zero error.',
    publishedInterval:null,rateForecast:null,causalEffect:null,reserveQuarterScore:null,operationallyQualified:false,realWorldPerformanceValidated:false};
  const files=new Map([['scores.json.gz',scores],['report.json',Buffer.from(JSON.stringify(report,null,2)+'\n')]]);
  if(mode==='--write')await mkdir(dir,{recursive:true});
  for(const [path,bytes]of files){if(mode==='--check')assert.deepEqual(await readFile(new URL(path,dir)),bytes,`Stale ${path}`);else await writeFile(new URL(path,dir),bytes);}
  return {status:mode==='--check'?'verified':'written',histories:report.historyCases,rows:report.decisionRows,reportSha256:sha(files.get('report.json'))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){assert.equal(process.argv.length,3);console.log(JSON.stringify(await runWindowPolicy(process.argv[2],{onProgress:row=>console.error(JSON.stringify(row))})));}
