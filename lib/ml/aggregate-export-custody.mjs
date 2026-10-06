// Offline aggregate custody only: no data access, forecasting, or source attestation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validatePredictiveReadiness} from './predictive-readiness.ts';

const maxBytes=262144;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,function(_key,item){return item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item;});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const exact=(value,keys)=>assert(value&&Object.getPrototypeOf(value)===Object.prototype&&Reflect.ownKeys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k)),'Missing or unexpected aggregate fields');
const timestamp=value=>{assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,'Invalid UTC timestamp');return value;};
const day=value=>{assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00.000Z'))&&new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)===value,'Invalid calendar date');return value;};
const count=value=>assert(Number.isSafeInteger(value)&&value>=0&&value<=1000000,'Invalid aggregate count');
const systemClock=()=>new Date().toISOString();

/** Reject duplicate JSON keys, including escaped aliases, before preserving original bytes. */
function parsePayload(bytes){
 assert(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=maxBytes,'Expected bounded UTF-8 aggregate bytes');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),value=JSON.parse(text);
 // JSON.parse already verifies grammar; this second traversal detects overwritten keys.
 const tokens=text.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)??[];let index=0;
 function walk(depth){
  assert(depth<=8,'Aggregate JSON nesting exceeds limit');const token=tokens[index++];
  if(token==='{'){
   const keys=new Set();if(tokens[index]==='}'){index++;return;}
   do{const key=JSON.parse(tokens[index++]);assert(!keys.has(key),'Duplicate JSON key');keys.add(key);assert.equal(tokens[index++],':');walk(depth+1);
    if(tokens[index]!==',')break;index++;
   }while(true);assert.equal(tokens[index++],'}');
  }else if(token==='['){
   if(tokens[index]===']'){index++;return;}
   do{walk(depth+1);if(tokens[index]!==',')break;index++;}while(true);assert.equal(tokens[index++],']');
  }
 }
 walk(0);assert.equal(index,tokens.length);return value;
}

/** Parse the existing count-export shape only, without invoking its forecast evaluator. */
function validatePayload(bytes,capturedAt){
 const value=parsePayload(bytes);exact(value,['schemaVersion','manifest','months']);assert.equal(value.schemaVersion,1);
 const m=value.manifest;exact(m,['source','extractedOn','provenance','population','sourceDefinitionVersion','sourceInsertedAt','completionEvidence','vintageHistory','denominatorBasis','generatorVersion']);
 assert.equal(m.source,'public.attrition_monthly_trend');assert.equal(m.population,'all-recorded-voluntary-separations');
 assert(['user-declared-synthetic','unknown'].includes(m.provenance),'Unsupported source provenance');
 assert(typeof m.sourceDefinitionVersion==='string'&&/^inspected-\d{4}-\d{2}-\d{2}$/.test(m.sourceDefinitionVersion),'Missing inspected source contract version');
 day(m.extractedOn);day(m.sourceDefinitionVersion.slice(10));assert(m.sourceDefinitionVersion.slice(10)<=m.extractedOn,'Inspection after extraction');
 assert(m.extractedOn<=capturedAt.slice(0,10),'Extraction is after capture');
 timestamp(m.sourceInsertedAt);assert(m.sourceInsertedAt<=capturedAt&&m.sourceInsertedAt.slice(0,10)<=m.extractedOn,'Insertion is after capture or extraction');
 assert.equal(m.completionEvidence,'calendar-boundaries-only');assert.equal(m.vintageHistory,false);assert.equal(m.denominatorBasis,'month-end-stock-only');assert.equal(m.generatorVersion,null);
 assert(Array.isArray(value.months)&&value.months.length>0&&value.months.length<=120,'Expected 1–120 aggregate months');
 const seen=new Set();
 for(const row of value.months){
  exact(row,['month','voluntaryExits','totalExits','firstEvent','lastEvent','monthEndHeadcount','snapshotDate']);
  assert(typeof row.month==='string'&&/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(row.month),'Invalid reporting month');assert(!seen.has(row.month),'Duplicate reporting month');seen.add(row.month);
  const [year,month]=row.month.split('-').map(Number),end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  day(row.snapshotDate);assert.equal(row.snapshotDate,end,'Snapshot must identify reporting month end');assert(row.snapshotDate<=m.extractedOn&&row.snapshotDate<=capturedAt.slice(0,10),'Reporting period is after extraction or capture');
  for(const key of ['voluntaryExits','totalExits','monthEndHeadcount'])count(row[key]);assert(row.voluntaryExits<=row.totalExits,'Voluntary count exceeds total');
  if(row.totalExits===0){assert.equal(row.firstEvent,null);assert.equal(row.lastEvent,null);}
  else{day(row.firstEvent);day(row.lastEvent);assert(row.firstEvent>=row.month+'-01'&&row.firstEvent<=row.lastEvent&&row.lastEvent<=end,'Event dates outside reporting period');}
 }
 return value;
}

function build(bytes,capturedAt){
 timestamp(capturedAt);const data=validatePayload(bytes,capturedAt),m=data.manifest;
 const periods=data.months.map(row=>row.month).sort();
 const records=[...data.months].sort((a,b)=>a.month.localeCompare(b.month)).map(row=>({recordKey:`aggregate-${row.month}`,revision:1,supersedes:null,
  effectiveAt:row.snapshotDate+'T00:00:00.000Z',observedAt:null,populationVersion:m.population,metricVersion:'monthly-voluntary-count',
  value:{period:row.month,voluntaryExits:row.totalExits===0?null:row.voluntaryExits,countStatus:row.totalExits===0?'unknown':'recorded',exposure:null}}));
 const readinessContract={schemaVersion:1,cutoff:capturedAt,
  manifest:{dataClass:'company-extract',observationBasis:'unknown',generatorVersion:null,generatedAt:null,sourceEvidence:null,
   sourceDefinitionVersion:m.sourceDefinitionVersion,populationVersion:m.population,metricVersion:'monthly-voluntary-count',completion:null},
  target:{domain:'turnover',measure:'voluntary-count',cadence:'monthly'},records,study:null,groups:[]};
 const readiness=validatePredictiveReadiness(readinessContract);assert.equal(readiness.inputStatus,'valid');assert.equal(readiness.forecastEligibility.status,'blocked');
 const body={schemaVersion:1,kind:'local-aggregate-export-custody',custodyVersion:'aggregate-export-custody-v1',
  payload:{sha256:sha(bytes),byteLength:bytes.length,contract:'aggregate-exit-history-json',contractVersion:1},
  capture:{capturedAt,meaning:'Local packaging clock; not historical source availability or authenticated time',sourceFirstObservedAt:null,sourceRevision:null,sourceRevisionHistory:null,completion:null},
  source:{name:m.source,definitionVersion:m.sourceDefinitionVersion,population:m.population,declaredProvenance:m.provenance,observationBasis:'unknown',
   extractedOn:m.extractedOn,extractionPrecision:'calendar-day',insertedAt:m.sourceInsertedAt,generatorVersion:null,completeness:'unknown',denominatorBasis:m.denominatorBasis},
  reporting:{periods,firstPeriod:periods[0],lastPeriod:periods.at(-1),recordCount:records.length,recordedCountRows:records.filter(r=>r.value.countStatus==='recorded').length,
   unknownCountPeriods:records.filter(r=>r.value.countStatus==='unknown').map(r=>r.value.period),
   missingCalendarPeriods:(()=>{const missing=[];let [y,mo]=periods[0].split('-').map(Number);let p=periods[0];while(p<periods.at(-1)){if(!periods.includes(p))missing.push(p);mo++;if(mo===13){y++;mo=1;}p=`${y}-${String(mo).padStart(2,'0')}`;}return missing;})()},
  adapter:{dataClassMeaning:'Existing source extract, not verified real-world observations',revisionMeaning:'Revision 1 is a local adapter envelope only; no source revision history is established',validator:'validatePredictiveReadiness',contractVersion:1},
  readinessContract,readiness,operationallyQualified:false,sourceTruthVerified:false};
 return freeze({...body,captureId:sha(canonical(body))});
}

/** Clock injection is for deterministic tests; the CLI always uses its current system clock. */
export function captureAggregateExport(payloadBytes,{clock=systemClock}={}){return build(payloadBytes,timestamp(clock()));}

/** Sidecars receive the same encoding, size and duplicate-key checks as payloads. */
export function parseCustodySidecar(sidecarBytes){return parsePayload(sidecarBytes);}

/** Full recomputation detects payload, period, metadata and eligibility tampering. */
export function verifyAggregateExport(payloadBytes,sidecar,{clock=systemClock}={}){
 const now=timestamp(clock());assert(sidecar&&typeof sidecar==='object','Missing custody sidecar');
 const capturedAt=timestamp(sidecar.capture?.capturedAt);assert(capturedAt<=now,'Capture timestamp is in the future');
 const expected=build(payloadBytes,capturedAt);assert.deepEqual(sidecar,expected,'Custody sidecar or payload mismatch');
 return freeze({status:'verified',captureId:expected.captureId,payloadSha256:expected.payload.sha256,capturedAt,
  declaredProvenance:expected.source.declaredProvenance,observationBasis:'unknown',reporting:expected.reporting,
  inputStatus:expected.readiness.inputStatus,forecastEligibility:expected.readiness.forecastEligibility,
  causalEffectEligibility:expected.readiness.causalEffectEligibility,availableHistoryRows:expected.readiness.history.length,
  operationallyQualified:false,sourceTruthVerified:false});
}
