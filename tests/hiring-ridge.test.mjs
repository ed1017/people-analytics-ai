import test from 'node:test';
import assert from 'node:assert/strict';
import {fitHiringDevelopmentRidge as fit,hiringRidgeMethod} from '../lib/ml/hiring-ridge.ts';
import {evaluateHiringBaselines,scoreAlignedPredictions} from '../lib/ml/hiring-evaluation.ts';
import {freezeHiringAcceptanceContract} from '../lib/ml/hiring-acceptance.ts';
import {syntheticHiringManifest as manifest,syntheticHiringHistory as history} from './fixtures/hiring-evaluation.mjs';
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const setDays=(row,days)=>({...row,startDate:new Date(Date.parse(row.openedDate)+days*86400000).toISOString().slice(0,10),labelFirstObservedAt:new Date(Date.parse(row.openedDate)+(days+2)*86400000).toISOString()});
const run=(rows=history(),penalty=1,fold='development-1')=>fit(manifest,rows,fold,penalty);

test('frozen objective preserves fixed penalties and keeps synthetic fitting distinct from readiness',()=>{
 const r=run();assert.equal(r.syntheticFitPerformed,true);assert.equal(r.status,'synthetic-development-fit-only');
 for(const key of ['companyModelTrained','trainingReady','performanceValidated','deploymentValidated'])assert.equal(r[key],false);
 assert.equal(r.contractFingerprint,freezeHiringAcceptanceContract(manifest).fingerprint);
 assert.equal(hiringRidgeMethod.intercept,'unpenalized');assert.match(hiringRidgeMethod.objective,/^sum\(/);
 assert.ok(Object.isFrozen(r.model.columns));assert.ok(Object.isFrozen(r.localCandidateFold.predictions));
});

test('constant log target is recovered by an unpenalized intercept for every fixed penalty',()=>{
 const rows=history().map(row=>setDays(row,20));
 for(const penalty of [.1,1,10]){const r=run(rows,penalty);close(r.model.intercept,Math.log1p(20));r.model.coefficients.forEach(value=>close(value,0));r.localCandidateFold.predictions.forEach(row=>close(row.days,20))}
});

test('zero-day targets produce finite zero durations without target imputation',()=>{
 const rows=history().map(row=>({...setDays(row,0),closedDate:row.openedDate,timeToFillDays:0}));
 const r=run(rows);assert.equal(r.model.intercept,0);assert.deepEqual(r.model.coefficients,[0,0]);assert.ok(r.localCandidateFold.predictions.every(row=>row.days===0));
});

test('QR coefficients agree with an independent two-variable closed-form ridge solution',()=>{
 const rows=history().map(row=>setDays(row,20+new Date(row.openedDate).getUTCMonth()*3));
 for(const penalty of [.1,1,10]){
  const result=run(rows,penalty),byId=new Map(rows.map(row=>[row.requisitionId,row])),train=result.localCandidateFold.trainingIds.map(id=>byId.get(id));
  const x=train.map(row=>{const angle=2*Math.PI*new Date(row.openedDate).getUTCMonth()/12;return [Math.sin(angle),Math.cos(angle)]});
  const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
  const center=[0,1].map(j=>mean(x.map(row=>row[j]))),scale=[0,1].map(j=>Math.sqrt(mean(x.map(row=>(row[j]-center[j])**2))));
  const z=x.map(row=>row.map((value,j)=>(value-center[j])/scale[j])),y=train.map(row=>Math.log1p((Date.parse(row.startDate)-Date.parse(row.openedDate))/86400000)),ym=mean(y);
  let a=penalty,b=0,d=penalty,u=0,v=0;
  z.forEach((row,i)=>{a+=row[0]**2;b+=row[0]*row[1];d+=row[1]**2;u+=row[0]*(y[i]-ym);v+=row[1]*(y[i]-ym)});
  const det=a*d-b*b,expected=[(d*u-b*v)/det,(a*v-b*u)/det];
  expected.forEach((value,j)=>close(result.model.coefficients[j],value));close(result.model.intercept,ym);
  result.model.columns.forEach((column,j)=>{close(column.mean,center[j]);close(column.scale,scale[j])});
 }
});

test('larger fixed penalties shrink coefficients while keeping intercept unpenalized',()=>{
 const rows=history().map(row=>setDays(row,10+new Date(row.openedDate).getUTCMonth()*5));
 const fits=[.1,1,10].map(p=>run(rows,p));const norm=r=>r.model.coefficients.reduce((s,b)=>s+b*b,0);
 assert.ok(norm(fits[0])>norm(fits[1])&&norm(fits[1])>norm(fits[2]));close(fits[0].model.intercept,fits[2].model.intercept);
});

test('preprocessing and fitting use exactly the existing eligible training IDs in each development fold',()=>{
 const rows=history(),evaluation=evaluateHiringBaselines(manifest,rows);
 for(let i=0;i<3;i++){
  const result=run(rows,1,`development-${i+1}`),f=result.localCandidateFold,a=evaluation.localAudit.folds[i];
  assert.deepEqual(f.trainingIds,[...a.trainIds].sort());assert.deepEqual(f.preprocessingIds,f.trainingIds);
  assert.deepEqual(f.predictions.map(row=>row.id),[...a.scoreIds].sort());
  assert.ok(a.unavailableTrainingIds.every(id=>!f.trainingIds.includes(id)));
  assert.ok(f.predictions.every(row=>!f.trainingIds.includes(row.id)));
  const byId=new Map(rows.map(row=>[row.requisitionId,row]));
  const metrics=scoreAlignedPredictions(f.predictions.map(({id})=>{const row=byId.get(id);return {id,days:(Date.parse(row.startDate)-Date.parse(row.openedDate))/86400000}}),f.predictions);
  assert.equal(metrics.count,a.scoreIds.length);assert.ok(Number.isFinite(metrics.maeDays));
 }
});

test('validation and holdout target changes cannot alter the fitted model or its predictions',()=>{
 const rows=history(),before=run(rows),cutoff=before.model.trainBefore;
 const changed=rows.map(row=>row.openedDate>=cutoff?setDays(row,65):row);
 const after=run(changed);assert.deepEqual(after,before);
});

test('historically unavailable labels cannot influence training even when present in the extract',()=>{
 const rows=history(),evaluation=evaluateHiringBaselines(manifest,rows),id=evaluation.localAudit.folds[0].unavailableTrainingIds[0];assert.ok(id);
 const before=run(rows),changed=rows.map(row=>row.requisitionId===id?setDays(row,80):row);
 assert.deepEqual(run(changed),before);
});

test('constant calendar columns map to zero rather than amplifying quadrantal roundoff',()=>{
 const rows=history().filter(row=>row.openedDate>='2025-07-01'||[1,5].includes(new Date(row.openedDate).getUTCMonth()));
 const r=run(rows);assert.deepEqual(r.model.columns[0],{mean:.5,scale:1,active:false});assert.equal(r.model.coefficients[0],0);
 assert.ok(r.model.columns[1].active);assert.ok(r.localCandidateFold.predictions.every(row=>Number.isFinite(row.days)&&row.days>=0));
});

test('positive ridge penalties keep perfectly collinear standardized calendar columns stable',()=>{
 const rows=history().filter(row=>row.openedDate>='2025-07-01'||[1,3].includes(new Date(row.openedDate).getUTCMonth()));
 for(const penalty of [.1,1,10]){
  const r=run(rows,penalty);assert.ok(r.model.columns.every(column=>column.active));
  close(r.model.coefficients[0],-r.model.coefficients[1]);
  assert.ok(r.localCandidateFold.predictions.every(row=>Number.isFinite(row.days)&&row.days>=0));
 }
});

test('negative extrapolated log durations use the fixed zero floor without holdout clipping',()=>{
 const m={...manifest,asOf:'2026-04-03'};
 const rows=history().filter(row=>row.openedDate<=m.asOf&&(row.openedDate>='2025-01-01'||[1,5].includes(new Date(row.openedDate).getUTCMonth())))
  .map(row=>row.openedDate<'2025-01-01'?{...setDays(row,new Date(row.openedDate).getUTCMonth()===1?0:365),closedDate:row.openedDate,timeToFillDays:0}:row);
 const r=fit(m,rows,'development-1',.1),january=rows.filter(row=>row.openedDate.startsWith('2025-01')).map(row=>row.requisitionId);
 assert.ok(r.model.intercept+(1-r.model.columns[1].mean)/r.model.columns[1].scale*r.model.coefficients[1]<0);
 assert.ok(r.localCandidateFold.predictions.filter(row=>january.includes(row.id)).every(row=>row.days===0));
 assert.ok(r.localCandidateFold.predictions.some(row=>row.days>0));
});

test('input order is deterministic and input records remain unchanged',()=>{
 const rows=history(),copy=structuredClone(rows),first=run(rows);assert.deepEqual(rows,copy);
 assert.deepEqual(run([...rows].reverse()),first);
});

test('unsupported penalty, holdout fitting, unverified provenance and insufficient evidence fail closed',()=>{
 for(const penalty of [0,-1,2,NaN,Infinity,'1'])assert.throws(()=>run(history(),penalty),/penalties/);
 for(const fold of ['holdout','development-4','',null])assert.throws(()=>run(history(),1,fold),/development folds/);
 assert.throws(()=>fit({...manifest,provenance:'real'},history(),'development-1',1),/synthetic/);
 assert.throws(()=>fit({...manifest,openingScopeVerified:false},history(),'development-1',1),/eligibility/);
 assert.throws(()=>run([]),/eligibility/);
 const rows=history();rows[0].openedDate='2022-02-30';assert.throws(()=>run(rows),/eligibility/);
});

test('malformed and nonfinite evidence never produces a fitted result or an imputed target',()=>{
 for(const patch of [{timeToFillDays:NaN},{timeToFillDays:Infinity},{startDate:20},{employeeId:'excluded'}]){
  const rows=history();Object.assign(rows[0],patch);assert.throws(()=>run(rows));
 }
 const rows=history().map(row=>({...row,startDate:null,labelFirstObservedAt:null}));assert.throws(()=>run(rows),/eligibility/);
});
