// Independent synthetic review: normal-equation residuals, leakage and protocol boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fitHiringDevelopmentRidge as fit} from '../lib/ml/hiring-ridge.ts';
import {evaluateHiringBaselines} from '../lib/ml/hiring-evaluation.ts';
import {syntheticHiringManifest as manifest,syntheticHiringHistory as history} from './fixtures/hiring-evaluation.mjs';
const day=86400000;
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const duration=(row,days)=>({...row,startDate:new Date(Date.parse(row.openedDate)+days*day).toISOString().slice(0,10),labelFirstObservedAt:new Date(Date.parse(row.openedDate)+(days+2)*day).toISOString()});
const calendar=row=>{const angle=new Date(row.openedDate).getUTCMonth()*Math.PI/6;return [Math.sin(angle),Math.cos(angle)]};
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
test('all folds and penalties satisfy the unpenalized-intercept and sum-loss ridge optimum on imbalanced calendar data',()=>{
 const original=history();
 const rows=original.flatMap((row,index)=>Array.from({length:1+index%4},(_,copy)=>duration({...row,requisitionId:row.requisitionId+'-'+copy},12+new Date(row.openedDate).getUTCMonth()*4+copy)));
 const byId=new Map(rows.map(row=>[row.requisitionId,row]));
 for(const fold of ['development-1','development-2','development-3'])for(const penalty of [.1,1,10]){
  const result=fit(manifest,rows,fold,penalty),training=result.localCandidateFold.trainingIds.map(id=>byId.get(id));
  const x=training.map(calendar),centers=[0,1].map(j=>mean(x.map(row=>row[j]))),scales=[0,1].map(j=>Math.sqrt(mean(x.map(row=>(row[j]-centers[j])**2))));
  result.model.columns.forEach((column,j)=>{close(column.mean,centers[j]);close(column.scale,scales[j])});
  const z=x.map(row=>row.map((value,j)=>(value-centers[j])/scales[j]));
  const residual=training.map((row,i)=>result.model.intercept+z[i].reduce((s,v,j)=>s+v*result.model.coefficients[j],0)-Math.log1p((Date.parse(row.startDate)-Date.parse(row.openedDate))/day));
  close(residual.reduce((a,b)=>a+b,0),0);
  for(let j=0;j<2;j++)close(residual.reduce((sum,r,i)=>sum+r*z[i][j],0)+penalty*result.model.coefficients[j],0);
  for(const prediction of result.localCandidateFold.predictions){
   const features=calendar(byId.get(prediction.id));
   const log=result.model.intercept+features.reduce((sum,value,j)=>sum+(value-centers[j])/scales[j]*result.model.coefficients[j],0);
   close(prediction.days,Math.max(0,Math.expm1(log)));
  }
 }
});
test('nontraining targets cannot change any development fold fit or predictions while eligibility stays fixed',()=>{
 const rows=history(),audit=evaluateHiringBaselines(manifest,rows).localAudit;
 for(let index=0;index<3;index++){
  const fold='development-'+(index+1),training=new Set(audit.folds[index].trainIds),before=fit(manifest,rows,fold,1);
  const changed=rows.map(row=>training.has(row.requisitionId)?row:duration(row,65));
  assert.deepEqual(fit(manifest,changed,fold,1),before);
 }
});
test('validation opening months change predictions but cannot refit training preprocessing or coefficients',()=>{
 const rows=history(),before=fit(manifest,rows,'development-1',1),score=new Set(before.localCandidateFold.predictions.map(row=>row.id));
 const scoringDate=new Date(before.model.trainBefore);scoringDate.setUTCMonth(scoringDate.getUTCMonth()+1);scoringDate.setUTCDate(15);const openedDate=scoringDate.toISOString().slice(0,10);
 const changed=rows.map(row=>{
  if(!score.has(row.requisitionId))return row;
  const from=Date.parse(row.openedDate),to=Date.parse(openedDate),shift=to-from;
  return {...row,openedDate,closedDate:new Date(Date.parse(row.closedDate)+shift).toISOString().slice(0,10),startDate:new Date(Date.parse(row.startDate)+shift).toISOString().slice(0,10),labelFirstObservedAt:new Date(Date.parse(row.labelFirstObservedAt)+shift).toISOString()};
 });
 const after=fit(manifest,changed,'development-1',1);
 assert.deepEqual(after.model,before.model);assert.deepEqual(after.localCandidateFold.preprocessingIds,before.localCandidateFold.preprocessingIds);
 assert.notDeepEqual(after.localCandidateFold.predictions,before.localCandidateFold.predictions);
});
test('excluded populations do not enter fitting, preprocessing or scoring',()=>{
 const rows=history(),before=fit(manifest,rows,'development-1',1);
 const excluded=rows.slice(0,100).map(row=>({...duration(row,100),requisitionId:'other-'+row.requisitionId,externalInternal:'internal'}));
 assert.deepEqual(fit(manifest,[...excluded,...rows],'development-1',1),before);
});
test('holdout eligibility still gates the wrapper: do not claim an untouched-holdout execution',()=>{
 const rows=history(),evaluation=evaluateHiringBaselines(manifest,rows),holdoutIds=new Set(evaluation.localAudit.folds.at(-1).scoreIds);
 const changed=rows.map(row=>holdoutIds.has(row.requisitionId)?{...row,status:'open'}:row);
 assert.throws(()=>fit(manifest,changed,'development-1',1),/eligibility/);
});
