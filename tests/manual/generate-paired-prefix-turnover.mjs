import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {buildGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
import {generatePairedPrefix} from '../../lib/ml/paired-prefix-turnover/generator.mjs';
import {pairedPrefixProtocol as protocol,evaluatePairedPrefix,summarizePairedPrefix} from '../../lib/ml/paired-prefix-turnover/evaluation.mjs';
const root=new URL('../../',import.meta.url),output=new URL('docs/evidence/synthetic-paired-prefix-v1/',root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function pairedPrefixArtifacts({onProgress=()=>{}}={}){
 const prior=await buildGroupTurnoverConsumer();assert.equal(prior.status,'current','Published evidence changed');
 const oldReportRaw=await readFile(new URL('docs/evidence/synthetic-turnover-adaptation-v1/report.json',root));assert.equal(sha(oldReportRaw),protocol.priorNegativeReportSha256);
 const old=JSON.parse(oldReportRaw),sources=[...new Set([...Object.keys(old.implementationFiles),'lib/ml/paired-prefix-turnover/protocol.json','lib/ml/paired-prefix-turnover/generator.mjs','lib/ml/paired-prefix-turnover/evaluation.mjs','tests/manual/generate-paired-prefix-turnover.mjs'])];
 const implementationFiles=Object.fromEntries(await Promise.all(sources.map(async path=>[path,sha(await readFile(new URL(path,root)))])));
 const pairs=[],fingerprints=[],files=new Map();
 for(let seed=protocol.seeds.first;seed<=protocol.seeds.last;seed++){
  const generated=generatePairedPrefix(seed),evaluated=evaluatePairedPrefix(generated);pairs.push(evaluated);
  fingerprints.push({seed,prefixSha256:evaluated.prefixSha256,branches:Object.fromEntries(protocol.branches.map(branch=>[branch,{
   companyTruthSha256:digest(generated.branches[branch].company.truth),groupTruthSha256:digest(generated.branches[branch].groups.truth),releasesSha256:digest(generated.branches[branch].groups.releases)}]))});
  if(seed===protocol.exampleSeed)files.set('example-releases.json.gz',gzipSync(Buffer.from(canonical({kind:'paired-prefix-audit-release-histories-not-direct-model-input',seed,
   assignment:generated.assignment,branches:Object.fromEntries(protocol.branches.map(branch=>[branch,generated.branches[branch].groups.releases]))})+'\n'),{level:9}));
  if((seed-protocol.seeds.first+1)%25===0)onProgress({pairedHistories:pairs.length});
 }
 const rows=pairs.flatMap(p=>p.rows),summaries=['group-a','group-b','group-c','group-d'].map(groupId=>summarizePairedPrefix(rows.filter(r=>r.groupId===groupId),groupId));
 files.set('pairs.json.gz',gzipSync(Buffer.from(canonical({kind:'paired-potential-outcomes-unpublished',pairs})+'\n'),{level:9}));
 const report={schemaVersion:1,kind:'synthetic-paired-prefix-control',protocol,protocolSha256:digest(protocol),protocolFrozenCommit:'56413d688c38b913a36bae16f510aa51a14d6b7f',
  priorConsumerIdentity:prior.identity,implementationFiles,implementationSha256:digest(implementationFiles),runtime:{node:process.versions.node,timezone:'UTC',compression:'gzip-level-9-zero-mtime'},
  dataset:{pairedHistories:pairs.length,potentialContinuations:pairs.length*2,groupPairs:rows.length,monthsPerContinuation:protocol.months,lastWorkforceMonth:protocol.endMonth,fingerprints},
  assignments:{probabilityShock:protocol.assignment.probabilityShock,shock:pairs.filter(p=>p.assignment.branch==='shock').length,noShock:pairs.filter(p=>p.assignment.branch==='no-shock').length,unit:'one assignment per company history, shared by groups'},
  invariants:{identicalObservedPrefixes:pairs.length,identicalGroupForecasts:rows.length,identicalCalibrations:rows.length,identicalCandidateRanges:rows.length},
  artifacts:Object.fromEntries([...files].map(([path,bytes])=>[path,{sha256:sha(bytes),bytes:bytes.length}])),summaries,
  operationallyQualified:false,realWorldPerformanceValidated:false,publishedInterval:null,causalEffect:null,rateForecast:null,individualRisk:null,reservedQuarterScore:null,
  limitations:['This deliberately paired design removes branch information from the prefix; it tests pipeline invariance, not universal unpredictability.',
   'Both potential continuations share the same history and scheduled company flows. Groups and branches are not independent samples.',
   'The added daily exit mechanism, 0.007 monthly-equivalent parameter and 50% shock assignment are declared assumptions, not estimated real hazards or identified causal effects.',
   'Group allocation can change after extra events; no group effect is attributable to a real intervention.',
   'Mixture metrics are conditional on the specified assignment design and use weighted per-pair losses, not averaged RMSEs.',
   'Candidate intervals and all scored labels remain retrospective offline audit results; no range is published or operational gate relaxed.',
   'Existing hiring/satisfaction outputs and prior forecast/consumer artifacts are unchanged. No October–December workforce outcome is generated or scored.']};
 files.set('report.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));return {files,report};
}
export async function runPairedPrefix(mode,{onProgress}={}){
 assert(['--write','--check'].includes(mode),'Use --write or --check only');const {files,report}=await pairedPrefixArtifacts({onProgress});
 if(mode==='--write'){await mkdir(output,{recursive:true});for(const [path,bytes]of files)await writeFile(new URL(path,output),bytes);}
 else{for(const [path,bytes]of files)assert.deepEqual(await readFile(new URL(path,output)),bytes,`Stale paired-prefix artifact: ${path}`);assert.deepEqual((await readdir(output)).sort(),[...files.keys()].sort());}
 return {status:mode==='--write'?'written':'verified',pairedHistories:report.dataset.pairedHistories,invariants:report.invariants,implementationSha256:report.implementationSha256};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(process.argv.length>3)throw Error('Use --write or --check only');console.log(JSON.stringify(await runPairedPrefix(process.argv[2]??'--check',{onProgress:p=>console.error(JSON.stringify(p))})));}
