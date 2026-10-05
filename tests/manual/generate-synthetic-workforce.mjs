import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {generateWorkforceCase,splitArtifacts,replayCheckpoint} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
const root=new URL('../../',import.meta.url),output=new URL('docs/evidence/synthetic-workforce-v1/',root);
const modulePaths=['common.mjs','turnover.mjs','hiring.mjs','satisfaction.mjs','pipeline.mjs','protocol.json','provenance.json'].map(p=>'lib/ml/synthetic-workforce/'+p);
const shaBytes=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Fixed manifest suite. No live source, model input or caller-supplied qualification override. */
export async function syntheticWorkforceArtifacts(){
 const config=JSON.parse(await readFile(new URL('lib/ml/synthetic-workforce/protocol.json',root),'utf8'));
 const provenance=JSON.parse(await readFile(new URL('lib/ml/synthetic-workforce/provenance.json',root),'utf8'));
 const codeFiles=[...modulePaths,'tests/manual/generate-synthetic-workforce.mjs'];
 const implementationFiles=Object.fromEntries(await Promise.all(codeFiles.map(async p=>[p,shaBytes(await readFile(new URL(p,root)))])));
 const files=new Map(),cases=[];
 for(const family of config.families)for(const seed of config.seeds){
  const generated=generateWorkforceCase(config,{seed,family}),split=splitArtifacts(generated),id=`${family}-${seed}`,artifacts={};
  for(const kind of ['releases','truth']){
   const raw=canonical(split[kind])+'\n',bytes=gzipSync(Buffer.from(raw),{level:9}),path=`${kind}/${id}.json.gz`;
   files.set(path,bytes);artifacts[kind]={path,sha256:shaBytes(bytes),jsonSha256:digest(raw),bytes:bytes.length};
  }
  cases.push({id,family,seed,artifacts,boundaryReconciliation:generated.boundaryReconciliation,turnoverMonths:generated.domains.turnover.truth.length,hiringCohorts:generated.domains.hiring.coverage.length,
   satisfactionWaves:generated.domains.satisfaction.truth.length,replay:replayCheckpoint(config,generated),validation:'generated-universe-accounting-and-release-checks-pass'});
 }
 const manifest={schemaVersion:1,kind:'synthetic-workforce-run-manifest',generatorVersion:config.generatorVersion,
  protocolVersion:config.version,protocolFrozenCommit:'527e09be222eb9a4d8acc5cb8d5b430ab97adc56',baseCommit:'f35f628a2ed41f0233b20531ee963c663ecd587f',
  generatedAt:config.fixedRunTimestamp,timestampBasis:'fixed-reproducibility-label-not-observation-or-real-execution-time',
  runtime:{node:process.versions.node,timezone:'UTC',compression:'gzip-level-9-zero-mtime'},
  dataClass:'constructed-synthetic',observationBasis:'simulated',sourceObservedAt:null,
  config,configSha256:digest(config),provenance,implementationFiles,implementationSha256:digest(implementationFiles),cases,
  modelEvaluation:{status:'not-run',metrics:null,holdoutCustody:config.custody},operationallyQualified:false,causalEffect:null,calibratedInterval:null};
 files.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 return {files,manifest};
}
export async function runSyntheticWorkforce(mode){
 assert(['--write','--check'].includes(mode),'Use --write or --check only');
 const {files,manifest}=await syntheticWorkforceArtifacts();
 if(mode==='--write'){
  for(const directory of ['','truth','releases'])await mkdir(new URL(directory+'/',output),{recursive:true});
  for(const [path,bytes]of files)await writeFile(new URL(path,output),bytes);
 }else{
  for(const [path,bytes]of files)assert.deepEqual(await readFile(new URL(path,output)),bytes,`Artifact differs: ${path}`);
  const expected=[...files.keys()].sort();
  const actual=(await readdir(output,{recursive:true})).filter(p=>p.endsWith('.json')||p.endsWith('.gz')).sort();assert.deepEqual(actual,expected,'Unexpected artifacts require review');
 }
 return {status:mode==='--write'?'written':'verified',cases:manifest.cases.length,files:files.size,output:fileURLToPath(output),implementationSha256:manifest.implementationSha256};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.argv.length>3)throw Error('Use --write or --check only');
 console.log(JSON.stringify(await runSyntheticWorkforce(process.argv[2]??'--check')));
}
