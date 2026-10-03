/** Offline synthetic development-fold fitting only; no company model or holdout fitting. */
// @ts-expect-error Native Node tests share TypeScript source.
import {evaluateHiringBaselines,type HiringObservation} from './hiring-evaluation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {freezeHiringAcceptanceContract} from './hiring-acceptance.ts';

function freeze<T>(value:T):Readonly<T>{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}
 return value;
}
export const hiringRidgeMethod=freeze({
 version:'synthetic-hiring-development-ridge-v1',
 target:'log1p(opening-to-actual-start days)',
 predictors:['opening-month-sine','opening-month-cosine'],
 monthIndex:'UTC January=0',
 objective:'sum((log1p(days)-intercept-z*beta)^2)+penalty*sum(beta^2)',
 scaling:'training-only population mean and standard deviation; constant columns map to zero',
 intercept:'unpenalized',solver:'two-column augmented least squares with Givens QR',
 output:'max(0,expm1(logPrediction)); reject nonfinite or unsafe day values',
});
const root3over2=Math.sqrt(3)/2;
// Exact quadrantal zeros avoid treating sin(pi) roundoff as a varying predictor.
const calendar:[number,number][]=[[0,1],[.5,root3over2],[root3over2,.5],[1,0],[root3over2,-.5],[.5,-root3over2],
 [0,-1],[-.5,-root3over2],[-root3over2,-.5],[-1,0],[-root3over2,.5],[-.5,root3over2]];
function finite(value:number){if(!Number.isFinite(value))throw Error('Nonfinite ridge arithmetic.');return value}
function sum(values:number[]){
 let total=0,correction=0;
 for(const value of values){const adjusted=value-correction,next=total+adjusted;correction=(next-total)-adjusted;total=next}
 return finite(total);
}
const mean=(values:number[])=>sum(values)/values.length;
const features=(row:HiringObservation)=>calendar[new Date(row.openedDate!+'T00:00:00.000Z').getUTCMonth()];

/**
 * Eligibility and memberships come only from the existing evaluator. The solver gets
 * trainIds, never validation/holdout labels. Only development folds are supported;
 * settings locking and final holdout fitting need their own reviewed orchestration.
 */
export function fitHiringDevelopmentRidge(manifest:unknown,observations:unknown[],foldName:string,penalty:number){
 const contract=freezeHiringAcceptanceContract(manifest);
 if(!contract.candidate.penalties.some(value=>value===penalty))throw Error('Only reviewed ridge penalties are supported.');
 const index=contract.protocol.development.findIndex(fold=>fold.name===foldName);
 if(index<0)throw Error('Only frozen development folds may be fitted.');
 const evaluation=evaluateHiringBaselines(manifest,observations);
 if(!evaluation.report.candidateReviewGatesPassed)throw Error('Existing evaluation eligibility gates block fitting.');
 const audit=evaluation.localAudit.folds[index],window=contract.protocol.development[index];
 const byId=new Map((observations as HiringObservation[]).map(row=>[row.requisitionId,row]));
 const trainingIds=[...audit.trainIds].sort(),scoringIds=[...audit.scoreIds].sort();
 const training=trainingIds.map(id=>byId.get(id)!);
 const x=training.map(features),y=training.map(row=>Math.log1p((Date.parse(row.startDate!)-Date.parse(row.openedDate!))/86400000));
 const columns=[0,1].map(j=>{
  const values=x.map(row=>row[j]),center=mean(values),active=values.some(value=>value!==values[0]);
  const scale=active?finite(Math.sqrt(mean(values.map(value=>(value-center)**2)))):1;
  if(!(scale>0))throw Error('Invalid training feature scale.');
  return {mean:center,scale,active};
 });
 if(columns.every(column=>!column.active))throw Error('No nonconstant opening-calendar predictor remains.');
 const standardize=(values:[number,number])=>columns.map((column,j)=>column.active?(values[j]-column.mean)/column.scale:0);
 const z=x.map(standardize),zMean=[0,1].map(j=>mean(z.map(row=>row[j]))),yMean=mean(y);
 // Center again in floating point so the recovered intercept remains unpenalized.
 const r=[[0,0],[0,0]],q=[0,0];
 const append=(row:number[],target:number)=>{
  const a=[...row];let b=target;
  for(let j=0;j<2;j++){
   const norm=finite(Math.hypot(r[j][j],a[j]));if(norm===0)continue;
   const c=r[j][j]/norm,s=a[j]/norm;r[j][j]=norm;
   for(let k=j+1;k<2;k++){const old=r[j][k];r[j][k]=finite(c*old+s*a[k]);a[k]=finite(-s*old+c*a[k])}
   const old=q[j];q[j]=finite(c*old+s*b);b=finite(-s*old+c*b);
  }
 };
 append([Math.sqrt(penalty),0],0);append([0,Math.sqrt(penalty)],0);
 z.forEach((row,i)=>append(row.map((value,j)=>value-zMean[j]),y[i]-yMean));
 const beta1=finite(q[1]/r[1][1]),beta0=finite((q[0]-r[0][1]*beta1)/r[0][0]);
 const coefficients=[beta0,beta1],intercept=finite(yMean-sum(coefficients.map((value,j)=>value*zMean[j])));
 const predictions=scoringIds.map(id=>{
  // Read opening time only. Scored labels never enter preprocessing or prediction.
  const values=standardize(features(byId.get(id)!));
  const logPrediction=finite(intercept+sum(values.map((value,j)=>value*coefficients[j])));
  const days=finite(Math.max(0,Math.expm1(logPrediction)));
  if(days>Number.MAX_SAFE_INTEGER)throw Error('Ridge prediction exceeds the shared scoring range.');
  return {id,days};
 });
 return freeze({
  status:'synthetic-development-fit-only',syntheticFitPerformed:true,companyModelTrained:false,
  trainingReady:false,performanceValidated:false,deploymentValidated:false,
  method:hiringRidgeMethod,contractFingerprint:contract.fingerprint,
  model:{fold:foldName,trainBefore:window.trainBefore,penalty,trainingCount:training.length,columns,intercept,coefficients},
  // Same fold shape accepted by the existing candidate-artifact gate; IDs stay local.
  localCandidateFold:{name:foldName,trainBefore:window.trainBefore,trainingIds,preprocessingIds:[...trainingIds],predictions},
  limitations:['Synthetic numerical-method exercise, not company-history fitting or predictive-performance evidence.',
   'No penalty selection, settings-lock record, final holdout fit, acceptance decision or product forecast is produced.',
   'Population and source declarations remain unverified; actual historical readiness and deployment validation remain blocked.'],
 });
}
