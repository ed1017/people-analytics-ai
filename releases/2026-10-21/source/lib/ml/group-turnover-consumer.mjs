// Node-only local evidence verifier and projection. No live source or model inputs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import pins from './group-turnover-consumer-pins.json' with {type:'json'};
import {canonical,digest} from './synthetic-workforce/common.mjs';
import {groupTurnoverProtocol as protocol,validateIntervalGate} from './group-turnover/evaluation.mjs';
const root=new URL('../../',import.meta.url);
const self='lib/ml/group-turnover-consumer.mjs',pinsPath='lib/ml/group-turnover-consumer-pins.json';
export const groupTurnoverConsumerPath='lib/data/synthetic-group-turnover-consumer-v1.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readLocal=path=>readFile(new URL(path,root));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const sourceUnavailable='Operational forecasting remains unavailable: historical source availability and completeness are not established. Future exposure is unknown.';
const rangeUnavailable='Range unavailable: the fixed synthetic validation requirements were not met.';
function unavailable(reason,status='unavailable'){
 const body={schemaVersion:1,kind:'synthetic-group-turnover-consumer',status,reasonCodes:[reason],
  evidenceStatus:status==='stale'?'Synthetic example withheld: the saved projection does not match current verified evidence.':'Synthetic example unavailable: evidence integrity could not be verified.',
  evidence:null,dataset:null,validation:null,cases:[],operationallyQualified:false,realWorldPerformanceValidated:false,rateForecast:null,individualRisk:null,causalEffect:null};
 return freeze({...body,identity:digest(body)});
}
function fail(code){throw Object.assign(Error(code),{evidenceCode:code});}
const requireCheck=(condition,code)=>{if(!condition)fail(code);};
/** Fixed repository files only. read is a test seam, never an application/request parameter. */
export async function buildGroupTurnoverConsumer({read=readLocal}={}){
 try{
  const cache=new Map();
  const bytes=async path=>{
   requireCheck(typeof path==='string'&&!path.startsWith('/')&&!path.split('/').includes('..')&&/^[a-zA-Z0-9_./-]+$/.test(path),'evidence-path-rejected');
   if(!cache.has(path)){
    try{cache.set(path,Buffer.from(await read(path)));}catch{fail('evidence-file-unavailable');}
   }
   return cache.get(path);
  };
  const pinned=async descriptor=>{
   const raw=await bytes(descriptor.path);requireCheck(sha(raw)===descriptor.sha256,'evidence-hash-mismatch');return JSON.parse(raw.toString());
  };
  // Pins come only from this reviewed module, never from an artifact or caller assertion.
  const workforce=await pinned(pins.workforceManifest),report=await pinned(pins.groupReport);
  requireCheck(canonical(JSON.parse((await bytes(pinsPath)).toString()))===canonical(pins),'consumer-pins-changed');
  requireCheck(workforce.kind==='synthetic-workforce-run-manifest'&&report.kind==='synthetic-group-turnover-evaluation','unsupported-evidence-kind');
  for(const value of [workforce,report])requireCheck(value.dataClass==='constructed-synthetic'&&value.observationBasis==='simulated'&&value.operationallyQualified===false,'unsupported-evidence-qualification');
  requireCheck(workforce.configSha256===digest(workforce.config)&&report.protocolSha256===digest(protocol)&&canonical(report.protocol)===canonical(protocol),'evidence-protocol-mismatch');
  requireCheck(report.sourceGeneratorCommit===protocol.sourceGeneratorCommit&&canonical(report.extendedGeneratorConfig)===canonical({...workforce.config,seeds:[...protocol.demoSeeds,...Array.from({length:100},(_,i)=>1001+i)]}),'generator-manifest-mismatch');
  const implementationFiles={};
  for(const source of [workforce,report]){
   requireCheck(source.implementationSha256===digest(source.implementationFiles),'implementation-manifest-mismatch');
   for(const [path,expected]of Object.entries(source.implementationFiles)){
    requireCheck(path.startsWith('lib/ml/')||path.startsWith('tests/manual/'),'implementation-path-rejected');
    requireCheck(sha(await bytes(path))===expected,'implementation-hash-mismatch');
    if(implementationFiles[path])requireCheck(implementationFiles[path]===expected,'implementation-manifest-conflict');
    implementationFiles[path]=expected;
   }
  }
  let verifiedArtifacts=2;
  const verifyArtifact=async(prefix,artifact)=>{
   const raw=await bytes(prefix+artifact.path);requireCheck(sha(raw)===artifact.sha256,'evidence-artifact-hash-mismatch');
   if(artifact.jsonSha256)requireCheck(digest(gunzipSync(raw).toString())===artifact.jsonSha256,'evidence-content-hash-mismatch');
   verifiedArtifacts++;return raw;
  };
  requireCheck(workforce.cases.length===15&&report.dataset.demoArtifacts.length===15&&report.dataset.validationCases.length===500,'evidence-case-count-mismatch');
  for(const item of workforce.cases)for(const artifact of Object.values(item.artifacts))await verifyArtifact('docs/evidence/synthetic-workforce-v1/',artifact);
  for(const item of report.dataset.demoArtifacts)for(const artifact of Object.values(item.artifacts))await verifyArtifact('docs/evidence/synthetic-group-turnover-v1/',artifact);
  const {rows}=JSON.parse(gunzipSync(await verifyArtifact('docs/evidence/synthetic-group-turnover-v1/',report.validationArtifact)).toString());
  requireCheck(rows.length===2000&&report.gates.length===20&&report.demos.length===60,'evidence-case-count-mismatch');
  const gates=protocol.families.flatMap(family=>protocol.groups.map(({id:groupId})=>validateIntervalGate(rows.filter(r=>r.family===family&&r.groupId===groupId),{family,groupId})));
  requireCheck(canonical(gates)===canonical(report.gates),'uncertainty-gate-evidence-mismatch');
  requireCheck(report.realWorldPerformanceValidated===false&&report.rateForecast===null&&report.individualRisk===null&&report.causalEffect===null,'unsupported-evidence-qualification');
  const cases=protocol.families.flatMap(family=>protocol.demoSeeds.flatMap(seed=>protocol.groups.map(({id:groupId})=>{
   const matches=report.demos.filter(row=>row.family===family&&row.seed===seed&&row.groupId===groupId);requireCheck(matches.length===1,'demo-scope-mismatch');
   const row=matches[0],gate=gates.find(g=>g.family===family&&g.groupId===groupId);
   requireCheck(row.operationallyQualified===false&&row.rate===null&&row.individualRisk===null,'unsupported-demo-qualification');
   const forecast=(input,targets,cutoff)=>{
    requireCheck(input.cutoff===cutoff&&canonical(input.targets)===canonical(targets)&&input.groupId===groupId,'demo-target-mismatch');
    requireCheck(input.operationallyQualified===false&&input.rate===null&&input.individualRisk===null,'unsupported-demo-qualification');
    const blocked=input.status==='blocked';requireCheck(blocked||input.status==='forecasted-synthetic-count','unsupported-demo-status');
    requireCheck(blocked?input.methods.length===0:canonical(input.methods.map(m=>m.method))===canonical(protocol.methods),'demo-method-mismatch');
    return {status:blocked?'unavailable':'synthetic-count-forecast',label:blocked?'Count forecast unavailable: history is incomplete or withheld.':'Expected voluntary exit counts — constructed synthetic example',
     cutoff:input.cutoff,targets:[...input.targets],trainingEnd:input.trainingEnd,reportingGapMonths:input.reportingGapMonths,reasonCodes:[...input.reasons],
     methods:blocked?[]:input.methods.map(m=>({method:m.method,expectedTotal:m.expectedTotal,points:m.points.map(p=>({month:p.month,expectedExits:p.expectedExits,leadFromLastReleasedMonth:p.leadFromLastReleasedMonth}))}))};
   };
   const assessment=forecast(row.forecast,protocol.assessmentTargets,protocol.assessmentOrigin),yearEnd=forecast(row.yearEnd.forecast,protocol.reservedTargets,protocol.yearEndOrigin);
   requireCheck(row.yearEnd.actual===null&&row.yearEnd.predictionInterval===null&&row.yearEnd.scoringStatus==='reserved-unscored','reserved-interval-or-score-forbidden');
   const allowed=gate.status==='qualified-conditional-simulation'&&row.intervalStatus==='qualified-retrospective-conditional-simulation'&&assessment.status==='synthetic-count-forecast';
   requireCheck(allowed?row.predictionInterval?.target==='three-month-total-only'&&row.predictionInterval.coverageGuarantee===false:row.predictionInterval===null,'unqualified-interval-forbidden');
   requireCheck(assessment.status!=='unavailable'||row.actual===null,'withheld-group-outcome-forbidden');
   return {family,seed,groupId,assessment:{...assessment,actualTotal:assessment.status==='unavailable'?null:row.actual,
    comparisons:assessment.status==='unavailable'?[]:structuredClone(row.comparisons),
    uncertainty:{status:allowed?'retrospective-conditional-simulation':'unavailable',label:allowed?'Range for the assessed quarter total only; retrospectively qualified in this simulation.':rangeUnavailable,
     interval:allowed?structuredClone(row.predictionInterval):null,reasonCodes:[...row.intervalReasons],qualificationAvailableAt:row.qualificationAvailableAt,availableAtForecastOrigin:false}},
    yearEnd:{...yearEnd,actualTotal:null,scoringStatus:'reserved-unscored',uncertainty:{status:'unavailable',label:'October–December range unavailable: the reserved quarter was not validated.',interval:null,reasonCodes:['reserved-quarter-not-validated']}}};
  })));
  const qualified=gates.filter(g=>g.status==='qualified-conditional-simulation').length;
  const body={schemaVersion:1,kind:'synthetic-group-turnover-consumer',status:'current',reasonCodes:[],
   evidenceStatus:'Synthetic evidence verified; operational forecasting remains unavailable.',
   evidence:{commit:pins.evidenceCommit,workforceManifestSha256:pins.workforceManifest.sha256,groupReportSha256:pins.groupReport.sha256,
    workforceImplementationSha256:workforce.implementationSha256,groupImplementationSha256:report.implementationSha256,
    consumerImplementationSha256:sha(await bytes(self)),consumerPinsSha256:sha(await bytes(pinsPath)),verifiedArtifactFiles:verifiedArtifacts,verifiedImplementationFiles:Object.keys(implementationFiles).length},
   dataset:{label:'Newly constructed synthetic histories; not recovered company observations.',demoHistories:15,monthsPerHistory:72,hiringCohortsPerHistory:72,surveyWavesPerHistory:24,
    observationBasis:'simulated',sourceObservedAt:null,sourceEvidenceStatus:sourceUnavailable,privacyStatus:'Fixed-group suppression demonstration; no formal or repeated-release privacy guarantee.'},
   validation:{label:'500 separately seeded validation histories describe this simulation; they do not establish real workforce accuracy.',histories:500,
    unit:'One seeded history and one assessed quarter total per family/group; groups and months are not independent validation samples.',
    uncertaintyStatus:`${qualified} of ${gates.length} family/group range checks passed; ${gates.length-qualified} remain unavailable. All October–December ranges are unavailable.`,
    qualificationAvailableAt:report.qualificationAvailableAt,qualificationTiming:report.qualificationTiming,
    primaryMethod:protocol.primaryMethod,methodSelection:'Prespecified recent mean; assessment results did not select a winner.',
    gates:gates.map(g=>({family:g.family,groupId:g.groupId,status:g.status,method:g.method,intendedHistories:g.intendedSeeds,availableRanges:g.available,covered:g.covered,
     empiricalCoverage:g.empiricalCoverage,wilson95:structuredClone(g.wilson95),reasonCodes:[...g.reasons],
     label:g.status==='qualified-conditional-simulation'?'Passed this conditional simulation check only.':'Range unavailable: fixed validation requirements not met.'}))},
   cases,operationallyQualified:false,realWorldPerformanceValidated:false,rateForecast:null,individualRisk:null,causalEffect:null};
  return freeze({...body,identity:digest(body)});
 }catch(error){return unavailable(error.evidenceCode??'unsupported-or-invalid-evidence');}
}
/** Cache identity is insufficient: compare the complete projection to freshly verified evidence. */
export function resolveGroupTurnoverConsumerCache(cached,fresh){
 if(fresh?.status!=='current')return fresh??unavailable('fresh-evidence-unavailable');
 try{if(canonical(cached)===canonical(fresh))return fresh;}catch{/* malformed cache */}
 return unavailable('projection-does-not-match-current-evidence','stale');
}
/** Server/offline entrypoint; never import this Node verifier into a client component. */
export async function loadGroupTurnoverConsumer({read=readLocal}={}){
 const fresh=await buildGroupTurnoverConsumer({read});if(fresh.status!=='current')return fresh;
 try{return resolveGroupTurnoverConsumerCache(JSON.parse((await read(groupTurnoverConsumerPath)).toString()),fresh);}catch{return unavailable('saved-projection-unavailable');}
}
// Keep the module's fixed trust anchor explicit to internal audit/tests.
assert.equal(pins.schemaVersion,1);
