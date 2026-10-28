import test from 'node:test';import assert from 'node:assert/strict';
import {encodeDecisionBackup,parseDecisionBackup,prepareDecisionRestore,MAX_BACKUP_BYTES} from '../lib/decision-backup.ts';
import {encodeDecisions} from '../lib/local-decisions.ts';
import {manualResultFixture} from './fixtures/manual-plan-results.mjs';
import {prepareManualResult,commitManualResult,manualPlanResultsField} from '../lib/manual-plan-results.ts';
const token='legacy-v1:0',at='2028-01-02T12:00:00.000Z';
const empty=()=>({version:1,revision:0,goals:{version:1,activeId:'',goals:[]},workspaces:{}});
test('roundtrip preserves packed plans, zero, unknown and correction history without mutations',async()=>{
 const f=await manualResultFixture();let t=prepareManualResult(f.store,'plan-one');
 const input={measuredOn:t.target.date,value:0,sourceNote:'Reviewed aggregate report.',supersedes:null,scopeConfirmed:true};
 commitManualResult(f.store,t,input,'2027-12-31T12:00:00.000Z','first');t=prepareManualResult(f.store,'plan-one');
 commitManualResult(f.store,t,{...input,value:null,supersedes:'first',sourceNote:'Correction: measurement unavailable.'},'2028-01-01T12:00:00.000Z','corrected');
 const data=f.store.getSnapshot().data,before=structuredClone(data),raw=encodeDecisionBackup(data,token,at),parsed=parseDecisionBackup(raw,token);
 assert.deepEqual(parsed.data,before);assert.deepEqual(data,before);assert.equal(parsed.counts.plans,2);assert.equal(parsed.counts.results,2);
 const entries=parsed.data.workspaces[f.goalId].fields[manualPlanResultsField].entries;
 assert.equal(entries[0].value,0);assert.equal(entries[1].value,null);assert.equal(entries[1].supersedes,'first');
});
test('empty and older version1 without optional slots remain supported',()=>{const data=empty();assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,token,at),token).data,data);});
test('replacement preview has destination revision and does not merge IDs or data',()=>{const data=empty(),preview=prepareDecisionRestore(encodeDecisionBackup(data,token,at),token,51);assert.equal(preview.mode,'replace');assert.equal(preview.expectedRevision,51);assert.equal(preview.data.revision,0);assert.deepEqual(preview.data.workspaces,{});assert.throws(()=>prepareDecisionRestore(encodeDecisionBackup(data,token,at),token,-1));});
test('invalid versions, token, date, extra envelope and accidental corruption reject',()=>{
 const raw=encodeDecisionBackup(empty(),token,at);
 for(const alter of [v=>v.version=2,v=>v.datasetToken='legacy-v1:1',v=>v.createdAt='2028-02-31T12:00:00.000Z',v=>v.extra=true,v=>v.decisions=v.decisions.replace('"revision":0','"revision":2')]){const v=JSON.parse(raw);alter(v);assert.throws(()=>parseDecisionBackup(JSON.stringify(v),token));}
 assert.throws(()=>parseDecisionBackup('{',token));assert.throws(()=>parseDecisionBackup(' '.repeat(MAX_BACKUP_BYTES+1),token));
 const v=JSON.parse(raw),d=empty();d.version=2;v.decisions=encodeDecisions(d);assert.throws(()=>parseDecisionBackup(JSON.stringify(v),token));
});
test('valid checksum cannot conceal invalid known result, progress, bundle or plan records',async()=>{
 const f=await manualResultFixture();
 for(const [key,value] of [['manualPlanResultsV1',{version:1,goalId:f.goalId,targets:[],entries:[{id:'orphan'}]}],['goalProgressV1',{version:2,goalId:f.goalId,events:[]}],['homeSolutionBundlesV1',{version:9}],['homePlanAlternativesV1',{version:2}]]){const data=structuredClone(f.store.getSnapshot().data);data.workspaces[f.goalId].fields[key]=value;assert.throws(()=>encodeDecisionBackup(data,token,at));}
});
test('opaque existing bounded workspace fields retained, not semantically rewritten',()=>{const data=empty();data.exploration={savedAt:at,fields:{customExistingState:{zero:0,unknown:null,notes:'Keep exact text.'}}};assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,token,at),token).data,data);});

test('manual target dataset must match backup even with valid checksum and historical records',async()=>{
 const f=await manualResultFixture(),t=prepareManualResult(f.store,'plan-one');
 commitManualResult(f.store,t,{measuredOn:t.target.date,value:0,sourceNote:'Dated aggregate report.',supersedes:null,scopeConfirmed:true},'2027-12-31T12:00:00.000Z','first');
 const data=structuredClone(f.store.getSnapshot().data);data.workspaces[f.goalId].fields[manualPlanResultsField].targets[0].target.datasetToken='legacy-v1:1';
 assert.throws(()=>encodeDecisionBackup(data,token,at),/different dataset/);
});
