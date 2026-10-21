/** Read-only, Node-only fixture provenance report. No company data, fitting or predictions. */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import type {HiringObservation} from './hiring-evaluation';

function freeze<T>(value:T):Readonly<T>{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}
 return value;
}
// Exact tracked bytes at the reviewed checkpoint; changing the reference requires review.
export const hiringFixtureIdentityReference=freeze({
 checkpoint:'1f068eda8d6d1733860d2f709e7bcc19f1bb8664',
 sources:{
  'tests/fixtures/hiring-evaluation.mjs':'9d178cacbe1fd253ba562c375b74d859a67782ce66699045b1ac5c91ffd14d50',
  'lib/ml/hiring-evaluation.ts':'1afe9adc17f572f410e37bad4762386a2d0fb86d65258c7e4c84e021550a1cf4',
  'lib/ml/hiring-acceptance.ts':'f82e4919ffc5e55df2d2e11bce925ec7618b4036f6c695f7a1859ffb453423cc',
  'tests/fixtures/hiring-acceptance.mjs':'b7ef434c2e729c7021ad318e160f44aa842d7c4afd5d4fe7834638d407148177',
 },
});
// Reviewed outputs of those exact fixture bytes, not company-history attestations.
// Checking outputs also rejects stale Node imports or mutated cached declarations.
const constructedIdentityReference=freeze({
 datasetFingerprint:'a829c5fc001efec39a03b7b5e3bb7da8816cb262e6aca473d9a84a9b248a06bf',
 protocolFingerprint:'4286d9532a495bef72c558ccb26c05d0ffae40a3c6baf3783970d44801a4c5bc',
 acceptanceContractFingerprint:'d75366c9239d00f8ee32c3360983f6dc4aa89a5c6c599c09915780871aab3825',
});
const digest=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
function requireValue(value:unknown,message:string):asserts value{if(!value)throw Error(message)}
function object(value:unknown):Record<string,unknown>{
 requireValue(!!value&&typeof value==='object'&&!Array.isArray(value),'Invalid preflight identity/options object.');
 return value as Record<string,unknown>;
}
function verifyReference(raw:unknown){
 const value=object(raw),sources=object(value.sources),expected=hiringFixtureIdentityReference;
 requireValue(Object.keys(value).length===2&&Object.hasOwn(value,'checkpoint')&&Object.hasOwn(value,'sources')&&value.checkpoint===expected.checkpoint,'Missing or unreviewed source checkpoint.');
 requireValue(Object.keys(sources).length===Object.keys(expected.sources).length,'Missing or unexpected source identities.');
 for(const [path,hash] of Object.entries(expected.sources))requireValue(Object.hasOwn(sources,path)&&sources[path]===hash,`Missing or unreviewed source identity: ${path}`);
}
/**
 * root is for isolated, byte-identical fixture copies in tests, not another data source.
 * Supplied identities cannot replace the reviewed reference with freshly computed hashes.
 */
export async function buildHiringFixturePreflight(options:{root?:string;identities?:unknown}={}){
 const config=object(options);
 requireValue(Object.keys(config).every(key=>key==='root'||key==='identities'),'Unsupported preflight option; predictions and readiness overrides are not accepted.');
 verifyReference(Object.hasOwn(config,'identities')?config.identities:hiringFixtureIdentityReference);
 requireValue(config.root===undefined||typeof config.root==='string','Invalid fixture root.');
 const root=config.root===undefined?fileURLToPath(new URL('../../',import.meta.url)):resolve(config.root as string);
 const paths=Object.keys(hiringFixtureIdentityReference.sources);
 const readSources=async()=>Object.fromEntries(await Promise.all(paths.map(async path=>{
  let bytes:Buffer;try{bytes=await readFile(resolve(root,path))}catch{throw Error(`Missing fixture source: ${path}`)}
  return [path,digest(bytes)];
 })));
 const sourceHashes=await readSources();
 for(const [path,hash] of Object.entries(hiringFixtureIdentityReference.sources))requireValue(sourceHashes[path]===hash,`Fixture source identity mismatch: ${path}`);
 // Validate bytes before importing any fixture/evaluator code. No artifact-prediction fixture is executed.
 const generator=await import(pathToFileURL(resolve(root,'tests/fixtures/hiring-evaluation.mjs')).href) as {syntheticHiringManifest:unknown;syntheticHiringHistory:()=>HiringObservation[]};
 const evaluator=await import(pathToFileURL(resolve(root,'lib/ml/hiring-evaluation.ts')).href) as typeof import('./hiring-evaluation');
 const acceptance=await import(pathToFileURL(resolve(root,'lib/ml/hiring-acceptance.ts')).href) as typeof import('./hiring-acceptance');
 const contract=acceptance.freezeHiringAcceptanceContract(generator.syntheticHiringManifest);
 const rows=generator.syntheticHiringHistory(),evaluation=evaluator.evaluateHiringBaselines(generator.syntheticHiringManifest,rows);
 requireValue(JSON.stringify(contract.protocol)===JSON.stringify(evaluation.report.protocol),'Frozen evaluator/acceptance protocol mismatch.');
 requireValue(JSON.stringify(await readSources())===JSON.stringify(sourceHashes),'Fixture sources changed while preparing the report.');
 const constructedIdentities={datasetFingerprint:evaluation.report.datasetFingerprint,
  protocolFingerprint:digest(JSON.stringify(evaluation.report.protocol)),acceptanceContractFingerprint:contract.fingerprint};
 for(const key of Object.keys(constructedIdentityReference) as (keyof typeof constructedIdentityReference)[])
  requireValue(constructedIdentities[key]===constructedIdentityReference[key],`Fixture constructed identity mismatch: ${key}`);
 const reporterSha256=digest(await readFile(fileURLToPath(import.meta.url)));
 const statusCounts=rows.reduce<Record<string,number>>((counts,row)=>{counts[row.status]=(counts[row.status]??0)+1;return counts},{});
 const observationLags=[...new Set(rows.map(row=>(Date.parse(row.labelFirstObservedAt!)-Date.parse(row.startDate!))/86400000))].sort((a,b)=>a-b);
 const manifest=evaluation.report.protocol.manifest;
 return freeze({
  schemaVersion:1,reportType:'hiring-fixture-provenance-preflight',status:'fixture-method-validation-only',
  trainingReady:false,modelTrained:false,performanceValidated:false,deploymentValidated:false,
  identities:{reviewedSourceCheckpoint:hiringFixtureIdentityReference.checkpoint,sourceHashes,reporterSha256,
   ...constructedIdentities,
   meaning:'Byte equality and reproducible fixture identities; not independent company-history provenance or a signed attestation.'},
  constructedFacts:{evidenceClass:'constructed-fixture-only',rowCount:rows.length,statusCounts,coverageMonths:evaluation.report.coverageMonths,
   labelObservationLagDays:observationLags,observationTimeBasis:'Invented by the tracked generator; never inferred for company records.',
   evaluatorReport:evaluation.report,acceptanceContract:contract},
  unverifiedDeclarations:{evidenceClass:'fixture-declarations-not-historical-evidence',source:manifest.source,sourceDefinitionVersion:manifest.sourceDefinitionVersion,
   cohortCoverage:manifest.cohortCoverage,openingScopeVerified:manifest.openingScopeVerified,statusHistoryVerified:manifest.statusHistoryVerified,
   historicalProvenanceEstablished:false,meaning:'These flags describe the constructed fixture. They do not verify company opening/status history or historical scope membership.'},
  performanceEvidence:{accepted:false,status:'rejected-label-derived-test-predictions',source:'tests/fixtures/hiring-acceptance.mjs',
   reasons:['Fixture predictions are actual labels plus chosen errors, not out-of-sample model predictions.',
    'The acceptance fixture contains placeholder source/code hashes; this report records actual source hashes separately and does not upgrade that artifact.',
    'No fitting, independently verified preprocessing, settings lock or untouched-holdout execution exists.'],
   acceptanceFixtureExecuted:false},
  companyHistoryReadiness:{status:'blocked-unverified',basis:'Repository-only prerequisite review at the pinned checkpoint; no company source was queried.',
   missingPrerequisites:[
    {code:'authorized-row-scope',requirement:'Reviewed authorization and a compatible input contract for the intended historical row population.'},
    {code:'source-provenance',requirement:'Versioned company hiring generator/extraction definition and independently verified lineage; aggregate medians are not training rows.'},
    {code:'opening-status-coverage',requirement:'Complete approved opening cohorts, including open/cancelled cases, dated status transitions and historical role/scope membership.'},
    {code:'label-observation-history',requirement:'Actual first-observed label timestamps; never fill them from start dates or the fixture lag.'},
    {code:'opening-known-features',requirement:'Verified opening-time predictor availability; exclude post-opening recruiting outcomes and current employee attributes.'},
    {code:'per-fold-evidence',requirement:'Actual row-level sample, calendar coverage, observation and baseline availability gates in every frozen fold; fixture counts do not qualify company data.'},
    {code:'untouched-holdout',requirement:'Reproducible authorized fitting/preprocessing, development-only settings lock and independently auditable untouched holdout.'},
    {code:'deployment-validation',requirement:'Separate out-of-time/deployment validation and review before any product prediction or readiness claim.'},
   ]},
 });
}
