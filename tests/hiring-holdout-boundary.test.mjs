import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateHiringDevelopment} from '../lib/ml/hiring-development.ts';
import {fitHiringDevelopmentRidge,selectHiringDevelopmentRidge,lockHiringRidgeSettings,evaluateLockedHiringRidge} from '../lib/ml/hiring-ridge.ts';
import {evaluateHiringBaselines,freezeHiringProtocol} from '../lib/ml/hiring-evaluation.ts';
import {syntheticHiringManifest as manifest,syntheticHiringHistory as history} from './fixtures/hiring-evaluation.mjs';
const protocol=freezeHiringProtocol(manifest),outcomes=['status','closedDate','startDate','timeToFillDays','labelFirstObservedAt'];
const provenance=()=>({experimentId:'synthetic-boundary',sourceDefinitionSha256:'a'.repeat(64),candidateCodeSha256:'b'.repeat(64),evaluatorGitSha:'c'.repeat(40)});
const settings=s=>({penalty:s.selectedPenalty,methodVersion:s.methodVersion,contractFingerprint:s.contractFingerprint});
const holdout=rows=>rows.filter(row=>row.openedDate>=protocol.holdout.trainBefore);
const locked=(rows=history())=>{const selection=selectHiringDevelopmentRidge(manifest,rows);return lockHiringRidgeSettings(selection,settings(selection),provenance())};
function guarded(rows,onRead=()=>{throw Error('Held-out outcome accessed during development')}){
 return rows.map(row=>{
  if(row.openedDate<protocol.holdout.trainBefore)return row;
  const copy={...row};for(const key of outcomes)Object.defineProperty(copy,key,{enumerable:true,get(){onRead(key);return row[key]}});return copy;
 });
}
test('development evaluation, fitting, selection and locking never access held-out outcomes',()=>{
 const rows=guarded(history()),evaluation=evaluateHiringDevelopment(manifest,rows);
 assert.equal(evaluation.report.evaluationScope,'development-only');assert.equal(evaluation.report.holdoutGatesDeferred,true);
 assert.deepEqual(evaluation.report.folds.map(f=>f.name),['development-1','development-2','development-3']);
 for(const fold of protocol.development)for(const p of [.1,1,10])fitHiringDevelopmentRidge(manifest,rows,fold.name,p);
 const selection=selectHiringDevelopmentRidge(manifest,rows);lockHiringRidgeSettings(selection,settings(selection),provenance());
});
test('development baseline metrics and eligibility exactly match the legacy development folds',()=>{
 const rows=history(),legacy=evaluateHiringBaselines(manifest,rows),dev=evaluateHiringDevelopment(manifest,rows);
 assert.deepEqual(dev.report.folds,legacy.report.folds.slice(0,3));
 assert.deepEqual(dev.localAudit.folds,legacy.localAudit.folds.slice(0,3));
 assert.ok(dev.localObservations.every(row=>row.openedDate<protocol.holdout.trainBefore));
});
test('held-out metadata-only rows suffice; changing or omitting outcomes cannot affect development',()=>{
 const rows=history(),before=selectHiringDevelopmentRidge(manifest,rows);
 const metadataOnly=rows.map(row=>row.openedDate<protocol.holdout.trainBefore?row:Object.fromEntries(['requisitionId','openedDate','jobProfileCode','externalInternal'].map(key=>[key,row[key]])));
 assert.deepEqual(selectHiringDevelopmentRidge(manifest,metadataOnly),before);
});
test('fixed settings, issued selection identity and complete provenance are mandatory',()=>{
 const s=selectHiringDevelopmentRidge(manifest,history());
 assert.throws(()=>lockHiringRidgeSettings({...s},settings(s),provenance()),/issued/);
 for(const patch of [{penalty:0.1},{methodVersion:'changed'},{contractFingerprint:'0'.repeat(64)}])assert.throws(()=>lockHiringRidgeSettings(s,{...settings(s),...patch},provenance()),/Settings/);
 for(const key of Object.keys(provenance())){const p=provenance();delete p[key];assert.throws(()=>lockHiringRidgeSettings(s,settings(s),p));}
 assert.throws(()=>lockHiringRidgeSettings(s,settings(s),{...provenance(),candidateCodeSha256:'bad'}),/provenance/);
 let accessed=false;assert.throws(()=>lockHiringRidgeSettings(s,{...settings(s),get penalty(){accessed=true;return s.selectedPenalty}},provenance()),/accessor/);assert.equal(accessed,false);
 const lock=lockHiringRidgeSettings(s,settings(s),provenance());assert.ok(Object.isFrozen(lock.settings));
 assert.throws(()=>{lock.settings.penalty=.1},TypeError);
 assert.throws(()=>lockHiringRidgeSettings(s,settings(s),provenance()),/issued/);
});
test('forged and missing locks cannot invoke an outcome loader',()=>{
 let reads=0;for(const lock of [null,{},JSON.parse(JSON.stringify(locked()))])assert.throws(()=>evaluateLockedHiringRidge(lock,()=>{reads++;return []}),/lock/);
 assert.equal(reads,0);
});
test('explicit final entry alone reads outcomes, exactly once per field, then consumes its lock',()=>{
 const rows=history(),lock=locked(rows);let reads=0,loads=0;
 const result=evaluateLockedHiringRidge(lock,()=>{loads++;return guarded(holdout(rows),()=>reads++)});
 assert.equal(loads,1);assert.equal(reads,holdout(rows).length*outcomes.length);
 assert.equal(result.acceptance.folds,undefined);assert.equal(result.acceptance.candidate.folds.length,4);
 assert.deepEqual(result.acceptance.baseline,evaluateHiringBaselines(manifest,rows).report);
 for(const key of ['companyModelTrained','trainingReady','performanceValidated','deploymentValidated','provenanceVerified','untouchedExperimentEstablished'])assert.equal(result[key],false);
 assert.throws(()=>evaluateLockedHiringRidge(lock,()=>{loads++;return holdout(rows)}),/consumed/);assert.equal(loads,1);
});
test('final holdout gates remain mandatory and a failed attempt consumes the lock',()=>{
 const rows=history(),lock=locked(rows);
 assert.throws(()=>evaluateLockedHiringRidge(lock,()=>holdout(rows).map(row=>({...row,status:'open'}))),/Final eligibility/);
 assert.throws(()=>evaluateLockedHiringRidge(lock,()=>holdout(rows)),/consumed/);
 assert.throws(()=>evaluateLockedHiringRidge(locked(rows),()=>holdout(rows).slice(1)),/cohort/);
});
test('the final loader cannot reenter or substitute opening metadata',()=>{
 const rows=history(),lock=locked(rows);let nested=0;
 evaluateLockedHiringRidge(lock,()=>{assert.throws(()=>evaluateLockedHiringRidge(lock,()=>{nested++;return holdout(rows)}),/consumed/);return holdout(rows)});assert.equal(nested,0);
 assert.throws(()=>evaluateLockedHiringRidge(locked(rows),()=>holdout(rows).map((row,i)=>i?row:{...row,openedDate:'2026-05-15'})),/cohort/);
});
test('mutating caller-owned development rows and provenance after locking cannot change the experiment',()=>{
 const rows=history(),saved=structuredClone(rows),s=selectHiringDevelopmentRidge(manifest,rows),p=provenance(),fixed=settings(s),lock=lockHiringRidgeSettings(s,fixed,p);
 for(const row of rows)if(row.openedDate<protocol.holdout.trainBefore)row.startDate='2099-01-01';
 fixed.penalty=.1;p.candidateCodeSha256='f'.repeat(64);
 const result=evaluateLockedHiringRidge(lock,()=>holdout(saved)),control=evaluateLockedHiringRidge(locked(saved),()=>holdout(saved));
 assert.deepEqual(result,control);
});
test('ties, duplicated opening IDs and changed development eligibility fail closed without held-out labels',()=>{
 const zero=history().map(row=>({...row,closedDate:row.openedDate,startDate:row.openedDate,labelFirstObservedAt:row.openedDate+'T00:00:00.000Z',timeToFillDays:0}));
 assert.throws(()=>selectHiringDevelopmentRidge(manifest,guarded(zero)),/Ambiguous/);
 const rows=guarded(history());assert.throws(()=>selectHiringDevelopmentRidge(manifest,[...rows,rows.at(-1)]),/duplicate/);
 assert.throws(()=>selectHiringDevelopmentRidge({...manifest,statusHistoryVerified:false},rows),/eligibility/);
});
test('accessor-based split metadata is rejected before any outcome access',()=>{
 let reads=0;const rows=guarded(history(),()=>{reads++;throw Error('outcome')});
 const m={...manifest,get asOf(){throw Error('manifest getter must not run')}};
 assert.throws(()=>selectHiringDevelopmentRidge(m,rows),/data properties/);
 const index=rows.findIndex(row=>row.openedDate>=protocol.holdout.trainBefore),held={...history()[index]};
 Object.defineProperty(held,'openedDate',{enumerable:true,get(){throw Error('opening getter must not run')}});rows[index]=held;
 assert.throws(()=>selectHiringDevelopmentRidge(manifest,rows),/data properties/);assert.equal(reads,0);
});
test('reordering input metadata cannot change development selection or its identity',()=>{
 const rows=history();assert.deepEqual(selectHiringDevelopmentRidge(manifest,rows),selectHiringDevelopmentRidge(manifest,[...rows].reverse()));
});
test('final evaluation retains legacy global label-history gates even for later unscored openings',()=>{
 const rows=history(),lock=locked(rows),held=holdout(rows);
 const later=held.find(row=>row.openedDate>=protocol.holdout.scoreBefore);assert.ok(later);later.labelFirstObservedAt=null;
 assert.throws(()=>evaluateLockedHiringRidge(lock,()=>held),/Final eligibility/);
});
test('development outcome accessors cannot mutate the partition during snapshotting',()=>{
 const rows=guarded(history());let invoked=false;
 Object.defineProperty(rows[0],'status',{enumerable:true,get(){invoked=true;rows[1]=rows.at(-1);return 'filled'}});
 assert.throws(()=>selectHiringDevelopmentRidge(manifest,rows),/Development outcomes must be data properties/);assert.equal(invoked,false);
});
