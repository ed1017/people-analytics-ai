import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {buildHiringFixturePreflight,hiringFixtureIdentityReference as reference} from '../lib/ml/hiring-fixture-preflight.ts';
import {evaluateHiringBaselines} from '../lib/ml/hiring-evaluation.ts';
import {freezeHiringAcceptanceContract} from '../lib/ml/hiring-acceptance.ts';
import {syntheticHiringHistory,syntheticHiringManifest} from './fixtures/hiring-evaluation.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function copySources(fn){
 const root=await mkdtemp(resolve(tmpdir(),'hiring-preflight-'));
 try{for(const path of Object.keys(reference.sources)){const target=resolve(root,path);await mkdir(dirname(target),{recursive:true});await copyFile(path,target)}await fn(root)}finally{await rm(root,{recursive:true,force:true})}
}
test('actual source hashes, frozen protocol and dataset identities are reproducible',async()=>{
 const report=await buildHiringFixturePreflight(),baseline=evaluateHiringBaselines(syntheticHiringManifest,syntheticHiringHistory()),contract=freezeHiringAcceptanceContract(syntheticHiringManifest);
 for(const [path,digest] of Object.entries(reference.sources)){assert.equal(hash(await readFile(path)),digest);assert.equal(report.identities.sourceHashes[path],digest)}
 assert.equal(report.identities.reporterSha256,hash(await readFile('lib/ml/hiring-fixture-preflight.ts')));
 assert.equal(report.identities.datasetFingerprint,baseline.report.datasetFingerprint);
 assert.equal(report.identities.protocolFingerprint,hash(JSON.stringify(baseline.report.protocol)));
 assert.equal(report.identities.acceptanceContractFingerprint,contract.fingerprint);
 assert.deepEqual(report.constructedFacts.evaluatorReport,baseline.report);assert.deepEqual(report,await buildHiringFixturePreflight());
 assert.ok(Object.isFrozen(report.companyHistoryReadiness.missingPrerequisites));assert.ok(Object.isFrozen(reference.sources));
});
test('passing fixture gates never become training, performance, provenance or deployment readiness',async()=>{
 const report=await buildHiringFixturePreflight();assert.equal(report.status,'fixture-method-validation-only');
 for(const key of ['trainingReady','modelTrained','performanceValidated','deploymentValidated'])assert.equal(report[key],false);
 assert.equal(report.constructedFacts.evaluatorReport.candidateReviewGatesPassed,true);
 assert.equal(report.constructedFacts.rowCount,684);assert.equal(report.constructedFacts.coverageMonths,57);assert.deepEqual(report.constructedFacts.statusCounts,{filled:684});
 assert.deepEqual(report.constructedFacts.labelObservationLagDays,[2]);
 assert.equal(report.unverifiedDeclarations.openingScopeVerified,true);assert.equal(report.unverifiedDeclarations.historicalProvenanceEstablished,false);
 assert.equal(report.companyHistoryReadiness.status,'blocked-unverified');assert.equal(report.companyHistoryReadiness.missingPrerequisites.length,8);
 assert.ok(report.companyHistoryReadiness.missingPrerequisites.some(item=>item.code==='label-observation-history'&&item.requirement.includes('never fill')));
 assert.ok(!JSON.stringify(report).includes('synthetic-0-0'));
});
test('label-derived prediction fixture is rejected and never executed as performance evidence',async()=>{
 const {performanceEvidence}=await buildHiringFixturePreflight();assert.equal(performanceEvidence.accepted,false);
 assert.equal(performanceEvidence.status,'rejected-label-derived-test-predictions');assert.equal(performanceEvidence.acceptanceFixtureExecuted,false);
 assert.match(performanceEvidence.reasons.join(' '),/actual labels plus chosen errors/);assert.match(performanceEvidence.reasons.join(' '),/placeholder/);
 await assert.rejects(buildHiringFixturePreflight({predictions:[{id:'x',days:0}]}),/Unsupported preflight option/);
 await assert.rejects(buildHiringFixturePreflight({trainingReady:true}),/Unsupported preflight option/);
});
test('missing, malformed, extra or tampered expected identities fail closed',async()=>{
 const inherited=Object.assign(Object.create(reference),{extra1:1,extra2:2});
 const inheritedSources={...reference,sources:Object.assign(Object.create(reference.sources),{extra1:1,extra2:2,extra3:3,extra4:4})};
 const invalid=[inherited,inheritedSources,undefined,null,{},[],{...reference,checkpoint:'0'.repeat(40)},{...reference,extra:true},{...reference,sources:{}},{...reference,sources:{...reference.sources,extra:'0'.repeat(64)}}];
 for(const identities of invalid)await assert.rejects(buildHiringFixturePreflight({identities}));
 for(const path of Object.keys(reference.sources)){
  const missing=structuredClone(reference);delete missing.sources[path];await assert.rejects(buildHiringFixturePreflight({identities:missing}),/Missing/);
  const tampered=structuredClone(reference);tampered.sources[path]='0'.repeat(64);await assert.rejects(buildHiringFixturePreflight({identities:tampered}),/unreviewed/);
 }
});
test('missing source file rejects before any evaluation',async()=>{
 await copySources(async root=>{await unlink(resolve(root,'tests/fixtures/hiring-evaluation.mjs'));await assert.rejects(buildHiringFixturePreflight({root}),/Missing fixture source/)});
});
test('tampered source bytes cannot execute or be blessed by a replacement hash',async()=>{
 await copySources(async root=>{
  const path='tests/fixtures/hiring-evaluation.mjs',bytes='globalThis.preflightTamperExecuted=true;throw Error("must not execute");';
  await writeFile(resolve(root,path),bytes);await assert.rejects(buildHiringFixturePreflight({root}),/identity mismatch/);assert.equal(globalThis.preflightTamperExecuted,undefined);
  const forged=structuredClone(reference);forged.sources[path]=hash(bytes);await assert.rejects(buildHiringFixturePreflight({root,identities:forged}),/unreviewed/);
 });
});
test('byte-identical isolated copies have identical reports without mutating supplied identities',async()=>{
 const original=await buildHiringFixturePreflight(),identities=structuredClone(reference),before=structuredClone(identities);
 await copySources(async root=>assert.deepEqual(await buildHiringFixturePreflight({root,identities}),original));assert.deepEqual(identities,before);
});

test('CLI emits an auditable JSON report and refuses arbitrary input overrides',()=>{
 const command='tests/manual/report-hiring-fixture-preflight.mjs';
 const result=spawnSync(process.execPath,[command],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);assert.equal(report.status,'fixture-method-validation-only');assert.equal(report.trainingReady,false);
 const rejected=spawnSync(process.execPath,[command,'unapproved-data.json'],{encoding:'utf8'});assert.notEqual(rejected.status,0);assert.equal(rejected.stdout,'');assert.match(rejected.stderr,/accepts no data/);
});
