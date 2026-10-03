// Hand-authored errors around known synthetic labels, NOT fitted predictions or accuracy evidence.
import {evaluateHiringBaselines} from '../../lib/ml/hiring-evaluation.ts';
import {freezeHiringAcceptanceContract} from '../../lib/ml/hiring-acceptance.ts';
import {syntheticHiringManifest,syntheticHiringHistory} from './hiring-evaluation.mjs';
export function syntheticAcceptanceFixture({rows=syntheticHiringHistory(),manifest=syntheticHiringManifest,errors={0.1:8,1:1,10:12},holdoutError=1}={}){
 const evaluation=evaluateHiringBaselines(manifest,rows),byId=new Map(rows.map(row=>[row.requisitionId,row]));
 const fold=(index,error)=>{
  const window=evaluation.report.folds[index],audit=evaluation.localAudit.folds[index];
  return {name:window.name,trainBefore:window.trainBefore,trainingIds:[...audit.trainIds],preprocessingIds:[...audit.trainIds],predictions:audit.scoreIds.map((id,i)=>{
   const row=byId.get(id),actual=(Date.parse(row.startDate)-Date.parse(row.openedDate))/86400000;
   return {id,days:actual+(typeof error==='function'?error(index,i):error)};
  })};
 };
 const artifact={contractFingerprint:freezeHiringAcceptanceContract(manifest).fingerprint,datasetFingerprint:evaluation.report.datasetFingerprint,
  sourceDefinitionSha256:'a'.repeat(64),evaluatorGitSha:'b'.repeat(40),candidateCodeSha256:'c'.repeat(64),
  provenance:'synthetic',purpose:'method-validation-only',family:'ridge-log1p-elapsed-days',predictors:['opening-month-sine','opening-month-cosine'],
  featureAvailability:'opening-known-calendar-only',preprocessing:'training-fold-only',transform:'max(0,expm1(prediction))',selectionScope:'development-only',holdoutUse:'once-after-settings-locked',
  trials:[0.1,1,10].map(penalty=>({penalty,folds:[0,1,2].map(index=>fold(index,errors[penalty]))})),holdout:{penalty:1,fold:fold(3,holdoutError)}};
 return {manifest,rows,artifact,evaluation};
}
