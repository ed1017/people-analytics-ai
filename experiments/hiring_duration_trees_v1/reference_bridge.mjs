import {readFileSync} from 'node:fs';
import {evaluateHiringBaselines} from './reference/hiring-evaluation.ts';
import {fitHiringDevelopmentRidge,selectHiringDevelopmentRidge,lockHiringRidgeSettings,evaluateLockedHiringRidge} from './reference/hiring-ridge.ts';
const {manifest,rows,provenance}=JSON.parse(readFileSync(0,'utf8'));
const evaluation=evaluateHiringBaselines(manifest,rows);
const result={report:evaluation.report,audit:evaluation.localAudit,models:[]};
if(evaluation.report.candidateReviewGatesPassed){
 const selection=selectHiringDevelopmentRidge(manifest,rows);
 result.penalty=selection.selectedPenalty;
 for(const window of evaluation.report.protocol.development){
  const fit=fitHiringDevelopmentRidge(manifest,rows,window.name,result.penalty);
  result.models.push(fit.model);
 }
 const lock=lockHiringRidgeSettings(selection,{penalty:result.penalty,methodVersion:selection.methodVersion,contractFingerprint:selection.contractFingerprint},provenance);
 const cutoff=evaluation.report.protocol.holdout.trainBefore;
 const final=evaluateLockedHiringRidge(lock,()=>rows.filter(row=>row.openedDate>=cutoff));
 result.models.push(final.model);
 result.nativeRidgeAcceptance=final.acceptance;
}
process.stdout.write(JSON.stringify(result));
