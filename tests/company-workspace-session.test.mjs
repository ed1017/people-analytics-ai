import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CompanyWorkspaceSession,companyWorkspaceToken} from '../lib/public-fixture/company-workspace-session.ts';
import {createCompanyBinding} from '../lib/public-fixture/company-binding.mjs';
import {createCompanyDashboard} from '../lib/public-fixture/company-dashboard.server.mjs';
import {sha256} from '../lib/public-fixture/read-provider.mjs';
import {DecisionStore,datasetDecisionKey as originalKey} from '../releases/2026-10-21/source/lib/local-decisions.ts';
const datasetDecisionKey=token=>originalKey(companyWorkspaceToken(token));
const read=name=>readFileSync(new URL('./fixtures/company-import/'+name,import.meta.url),'utf8').replaceAll('\r\n','\n');
function fixture(company,revision=''){
 const config=JSON.parse(read('lantern-config.json'));config.companyKey=company;
 const configText=JSON.stringify(config),rowsText=read('lantern-rows.json')+revision;
 return createCompanyDashboard(createCompanyBinding({configText,rowsText,expected:{companyKey:company,configSha256:sha256(configText),sourceSha256:sha256(rowsText)}})).value;
}
const a=fixture('lantern-invented'),b=fixture('second-invented'),a2=fixture('lantern-invented',' ');
const port=()=>{const map=new Map();return{map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const setup=()=>{const storage=port(),recovery=port();return{storage,recovery,s:new CompanyWorkspaceSession([a,b,a2],storage,recovery)}};
test('activation generation increases across companies and return; storage snapshot key stays stable',()=>{
 const {s}=setup();const first=s.select(a.datasetToken);s.select(b.datasetToken);const returned=s.select(a.datasetToken);
 assert.match(first.activationToken,/:1$/);assert.match(returned.activationToken,/:3$/);assert.equal(returned.snapshotToken,first.snapshotToken);
 assert.deepEqual(s.select(a.datasetToken),returned);
});
test('existing Home shell store cannot collide with company workspace storage',()=>{
 const {s,storage,recovery}=setup();const shell=new DecisionStore(a.datasetToken);shell.initialize(storage,undefined,recovery);
 s.select(a.datasetToken);s.workspace().setField('','companyHome',{question:'company only'});const before=storage.getItem(datasetDecisionKey(a.datasetToken));
 shell.setField('','chat',{messages:[],input:'shell only',problem:null});assert.equal(storage.getItem(datasetDecisionKey(a.datasetToken)),before);
 s.select(b.datasetToken);s.select(a.datasetToken);assert.deepEqual(s.workspace().getField('','companyHome',null),{question:'company only'});assert.equal(s.workspace().getField('','chat',null),null);
});
test('actual current-release DecisionStore preserves zero assumptions, goal and plan on return/reopen with no cross-company seeding',()=>{
 const {s,storage,recovery}=setup();s.select(a.datasetToken);
 const goals={version:1,activeId:'g',goals:[{id:'g',statement:'Invented company A goal'}]};s.workspace().saveGoals(goals);
 s.workspace().setField('g','plan',{quantity:0,deadline:'2026-12-31'});const saved=storage.getItem(datasetDecisionKey(a.datasetToken));
 s.select(b.datasetToken);assert.deepEqual(s.workspace().getSnapshot().data.goals.goals,[]);assert.equal(s.workspace().getField('g','plan',null),null);
 s.workspace().setField('','chat',{messages:[{role:'user',content:'Company B only'}],input:'',problem:null});s.select(a.datasetToken);
 assert.equal(s.workspace().getField('g','plan',null).quantity,0);assert.equal(storage.getItem(datasetDecisionKey(a.datasetToken)),saved);
 const reopened=new CompanyWorkspaceSession([a,b,a2],storage,recovery);reopened.select(b.datasetToken);assert.deepEqual(reopened.workspace().getField('','chat',null),{messages:[{role:'user',content:'Company B only'}],input:'',problem:null});
 reopened.select(a.datasetToken);assert.deepEqual(reopened.workspace().getSnapshot().data.goals,goals);
});
test('revised source snapshot starts empty; previous evidence stays byte-identical and reopening old snapshot restores it',()=>{
 const {s,storage}=setup();s.select(a.datasetToken);s.workspace().setField('','evidence',{headcount:9,source:a.datasetToken});
 const raw=storage.getItem(datasetDecisionKey(a.datasetToken));s.select(a2.datasetToken);assert.equal(s.workspace().getField('','evidence',null),null);
 assert.equal(storage.getItem(datasetDecisionKey(a.datasetToken)),raw);s.select(a.datasetToken);assert.equal(s.workspace().getField('','evidence',null).source,a.datasetToken);
});
test('late response from previous activation rejects even after returning to the same company snapshot',()=>{
 const {s}=setup();s.select(a.datasetToken);const old=s.capture();s.select(b.datasetToken);assert.throws(()=>s.accept(old,a),/Superseded/);
 s.select(a.datasetToken);assert.throws(()=>s.accept(old,a),/Superseded/);assert.equal(s.accept(s.capture(),a).overview.headcount,9);
 assert.throws(()=>s.accept(s.capture(),b));assert.throws(()=>s.accept(s.capture(),a2));
});
test('unregistered and duplicate snapshots reject without changing current selection or saved data',()=>{
 const {s,storage}=setup();s.select(a.datasetToken);const current=s.current(),before=[...storage.map];
 assert.throws(()=>s.select('unregistered'));assert.deepEqual(s.current(),current);assert.deepEqual([...storage.map],before);
 assert.throws(()=>new CompanyWorkspaceSession([a,a],port(),port()),/Duplicate/);
});
test('corrupt target and blocked target writes fail closed preserving active selection and original bytes',()=>{
 const {s,storage}=setup();s.select(a.datasetToken);const before=s.current();storage.map.set(datasetDecisionKey(b.datasetToken),'broken');
 assert.throws(()=>s.select(b.datasetToken),/requires recovery/);assert.deepEqual(s.current(),before);assert.equal(storage.map.get(datasetDecisionKey(b.datasetToken)),'broken');
 const fresh=setup();fresh.s.select(a.datasetToken);const write=fresh.storage.setItem;fresh.storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>fresh.s.select(b.datasetToken),/requires recovery/);assert.equal(fresh.s.current().snapshotToken,a.datasetToken);fresh.storage.setItem=write;
 fresh.s.pendingWorkspace(b.datasetToken).retry();assert.match(fresh.s.select(b.datasetToken).activationToken,/:2$/);
});
test('unsaved source draft prevents switching and remains available for recovery',()=>{
 const {s,storage}=setup();s.select(a.datasetToken);const write=storage.setItem;storage.setItem=()=>{throw Error('quota');};
 s.workspace().setField('','plan',{quantity:0});assert.equal(s.workspace().getSnapshot().saved,false);
 assert.throws(()=>s.select(b.datasetToken),/Save or resolve/);assert.deepEqual(s.workspace().getField('','plan',null),{quantity:0});
 storage.setItem=write;s.workspace().retry();assert.equal(s.workspace().getSnapshot().saved,true);s.select(b.datasetToken);
});
test('cross-tab conflict does not overwrite saved snapshot or permit abandoning unsaved changes',()=>{
 const {s,storage,recovery}=setup();s.select(a.datasetToken);const other=new CompanyWorkspaceSession([a,b],storage,recovery);other.select(a.datasetToken);
 s.workspace().setField('','plan',{quantity:3});const raw=storage.getItem(datasetDecisionKey(a.datasetToken));other.workspace().setField('','plan',{quantity:4});
 assert.equal(other.workspace().getSnapshot().saved,false);assert.equal(storage.getItem(datasetDecisionKey(a.datasetToken)),raw);assert.throws(()=>other.select(b.datasetToken),/Save or resolve/);
});
test('valid recovered target draft is accessible without activation and can be explicitly recovered then selected',()=>{
 const {s,storage,recovery}=setup();s.select(b.datasetToken);const write=storage.setItem;storage.setItem=()=>{throw Error('quota');};
 s.workspace().setField('','plan',{quantity:0,source:b.datasetToken});storage.setItem=write;
 const reopened=new CompanyWorkspaceSession([a,b],storage,recovery);reopened.select(a.datasetToken);const current=reopened.current();
 assert.throws(()=>reopened.select(b.datasetToken),/requires recovery/);assert.deepEqual(reopened.current(),current);
 const pending=reopened.pendingWorkspace(b.datasetToken);assert.equal(pending.getField('','plan',null).quantity,0);assert.ok(pending.getSnapshot().recovery);
 pending.recoverDraft();assert.equal(pending.getSnapshot().saved,true);reopened.select(b.datasetToken);
 assert.equal(reopened.workspace().getField('','plan',null).quantity,0);assert.equal(reopened.pendingWorkspace(b.datasetToken),null);
});
