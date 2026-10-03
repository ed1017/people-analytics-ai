/** Offline synthetic ridge fitting; holdout outcomes require an explicit issued settings lock. */
// @ts-expect-error Native Node tests share TypeScript source.
import {evaluateHiringBaselines,scoreAlignedPredictions,type HiringObservation} from './hiring-evaluation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {evaluateHiringDevelopment,readHiringOpeningMetadata,snapshotHiringManifest} from './hiring-development.ts';
import {createHash} from 'node:crypto';
// @ts-expect-error Native Node tests share TypeScript source.
import {freezeHiringAcceptanceContract,evaluateHiringCandidateAcceptance} from './hiring-acceptance.ts';

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
 * explicit settings locking and final evaluation use a separate entry point below.
 */
export function fitHiringDevelopmentRidge(manifest:unknown,observations:unknown[],foldName:string,penalty:number){
 manifest=snapshotHiringManifest(manifest);
 const contract=freezeHiringAcceptanceContract(manifest);
 if(!contract.candidate.penalties.some(value=>value===penalty))throw Error('Only reviewed ridge penalties are supported.');
 const index=contract.protocol.development.findIndex(fold=>fold.name===foldName);
 if(index<0)throw Error('Only frozen development folds may be fitted.');
 const evaluation=evaluateHiringDevelopment(manifest,observations);
 if(!evaluation.report.candidateReviewGatesPassed)throw Error('Existing evaluation eligibility gates block fitting.');
 return fitRidgeFold(contract,evaluation.localObservations,evaluation.localAudit.folds[index],contract.protocol.development[index],penalty);
}
function fitRidgeFold(contract:ReturnType<typeof freezeHiringAcceptanceContract>,observations:readonly HiringObservation[],audit:{trainIds:readonly string[];scoreIds:readonly string[]},window:{name:string;trainBefore:string},penalty:number){
 const foldName=window.name;
 const byId=new Map(observations.map(row=>[row.requisitionId,row]));
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

const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Development=ReturnType<typeof evaluateHiringDevelopment>;
type Trial={penalty:number;folds:ReturnType<typeof fitRidgeFold>['localCandidateFold'][];meanDevelopmentMaeDays:number};
type SelectionState={evaluation:Development;contract:ReturnType<typeof freezeHiringAcceptanceContract>;trials:Trial[];penalty:number};
const selections=new WeakMap<object,SelectionState>();
const locks=new WeakMap<object,{state:SelectionState;provenance:Record<string,string>;used:boolean}>();
function requireBoundary(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message)}
/** All fixed trials, development metrics and selection; no held-out outcomes or baselines. */
export function selectHiringDevelopmentRidge(manifest:unknown,observations:unknown[]){
 manifest=snapshotHiringManifest(manifest);
 const contract=freezeHiringAcceptanceContract(manifest),evaluation=evaluateHiringDevelopment(manifest,observations);
 requireBoundary(evaluation.report.candidateReviewGatesPassed,'Development eligibility gates block selection.');
 const byId=new Map(evaluation.localObservations.map(row=>[row.requisitionId,row]));
 const trials=contract.candidate.penalties.map(penalty=>{
  const fits=contract.protocol.development.map((window,index)=>fitRidgeFold(contract,evaluation.localObservations,evaluation.localAudit.folds[index],window,penalty));
  const metrics=fits.map(fit=>scoreAlignedPredictions(fit.localCandidateFold.predictions.map(({id})=>{
   const row=byId.get(id)!;return {id,days:(Date.parse(row.startDate!)-Date.parse(row.openedDate!))/86400000};
  }),fit.localCandidateFold.predictions));
  return {penalty,folds:fits.map(fit=>fit.localCandidateFold),meanDevelopmentMaeDays:metrics.reduce((total,metric)=>total+metric.maeDays,0)/metrics.length};
 });
 const best=Math.min(...trials.map(trial=>trial.meanDevelopmentMaeDays)),winners=trials.filter(trial=>trial.meanDevelopmentMaeDays===best);
 requireBoundary(winners.length===1,'Ambiguous development selection; no reviewed tie policy exists.');
 const result=freeze({status:'synthetic-development-selection-only',contractFingerprint:contract.fingerprint,
  developmentFingerprint:evaluation.report.datasetFingerprint,openingMetadataFingerprint:digest([...evaluation.openingMetadata].sort((a,b)=>a.requisitionId<b.requisitionId?-1:a.requisitionId>b.requisitionId?1:0)),
  selectedPenalty:winners[0].penalty,methodVersion:hiringRidgeMethod.version,
  scores:trials.map(({penalty,meanDevelopmentMaeDays})=>({penalty,meanDevelopmentMaeDays})),
  companyModelTrained:false,performanceValidated:false,deploymentValidated:false});
 selections.set(result,{evaluation,contract,trials,penalty:result.selectedPenalty});
 return result;
}
function fixedRecord(raw:unknown,keys:string[]){
 requireBoundary(raw&&typeof raw==='object'&&!Array.isArray(raw),'Required boundary object is missing.');
 const descriptors=Object.getOwnPropertyDescriptors(raw);
 requireBoundary(Object.keys(descriptors).length===keys.length&&keys.every(key=>descriptors[key]&&'value' in descriptors[key]),'Unexpected boundary fields or accessor properties.');
 return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
}
/** Requires an actual selection from this process, explicit fixed settings and provenance. */
export function lockHiringRidgeSettings(selection:unknown,settings:unknown,provenance:unknown){
 const state=selection&&typeof selection==='object'?selections.get(selection):undefined;
 requireBoundary(state,'Selection must be an issued development result, not a reconstructed artifact.');
 const fixed=fixedRecord(settings,['penalty','methodVersion','contractFingerprint']);
 requireBoundary(fixed.penalty===state.penalty&&fixed.methodVersion===hiringRidgeMethod.version&&fixed.contractFingerprint===state.contract.fingerprint,'Settings differ from the frozen method or development selection.');
 const source=fixedRecord(provenance,['experimentId','sourceDefinitionSha256','evaluatorGitSha','candidateCodeSha256']);
 requireBoundary(typeof source.experimentId==='string'&&source.experimentId.trim()&&source.experimentId.length<=200,'Missing experiment identity.');
 for(const key of ['sourceDefinitionSha256','candidateCodeSha256'])requireBoundary(typeof source[key]==='string'&&/^[a-f0-9]{64}$/.test(source[key]),'Missing source/candidate provenance.');
 requireBoundary(typeof source.evaluatorGitSha==='string'&&/^[a-f0-9]{40}$/.test(source.evaluatorGitSha),'Missing evaluator revision.');
 const lock=freeze({status:'synthetic-settings-lock',selection,settings:fixed,provenance:source,
  fingerprint:digest({selection,settings:fixed,provenance:source}),provenanceVerified:false,untouchedExperimentEstablished:false});
 // A selection can issue only one local lock. Frozen snapshots, never caller-owned rows, are retained.
 selections.delete(selection as object);locks.set(lock,{state,provenance:source as Record<string,string>,used:false});
 return lock;
}
/**
 * Single-use in-process boundary. Loader is called only after validating and consuming
 * an issued lock. It must return exactly the reserved opening partition, including open/
 * cancelled rows; all existing final eligibility and acceptance gates remain mandatory.
 * A failure consumes the lock as well: retrying on different outcomes requires a new experiment.
 */
export function evaluateLockedHiringRidge(lock:unknown,loadHoldoutOutcomes:()=>unknown[]){
 const entry=lock&&typeof lock==='object'?locks.get(lock):undefined;
 requireBoundary(entry&&!entry.used,'Missing, forged or already consumed settings lock.');
 requireBoundary(typeof loadHoldoutOutcomes==='function','Explicit holdout outcome loader is required.');
 entry.used=true;
 const {state,provenance}=entry,{contract,evaluation,trials,penalty}=state;
 const expected=evaluation.openingMetadata.filter(row=>row.openedDate>=contract.protocol.holdout.trainBefore);
 const raw=loadHoldoutOutcomes(),metadata=readHiringOpeningMetadata(raw);
 const canonical=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
 requireBoundary(JSON.stringify(canonical(metadata))===JSON.stringify(canonical(expected)),'Holdout opening cohort differs from the locked metadata.');
 const keys=['requisitionId','jobProfileCode','externalInternal','status','openedDate','closedDate','startDate','timeToFillDays','labelFirstObservedAt'];
 // Snapshot once. Accessors could otherwise change labels between gating, fitting and scoring.
 const held=raw.map((row,index)=>{
  requireBoundary(row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===keys.length&&keys.every(key=>Object.hasOwn(row,key)),'Invalid holdout observation fields.');
  const values=Object.fromEntries(keys.map(key=>[key,(row as Record<string,unknown>)[key]]));
  requireBoundary(Object.keys(metadata[index]).every(key=>values[key]===metadata[index][key as keyof typeof metadata[number]]),'Holdout metadata changed while snapshotting.');
  return values as HiringObservation;
 });
 const rows=[...evaluation.localObservations,...held],finalEvaluation=evaluateHiringBaselines(contract.protocol.manifest,rows);
 requireBoundary(finalEvaluation.report.candidateReviewGatesPassed,'Final eligibility gates block evaluation.');
 const final=fitRidgeFold(contract,rows,finalEvaluation.localAudit.folds[3],contract.protocol.holdout,penalty);
 const artifact={contractFingerprint:contract.fingerprint,datasetFingerprint:finalEvaluation.report.datasetFingerprint,
  sourceDefinitionSha256:provenance.sourceDefinitionSha256,evaluatorGitSha:provenance.evaluatorGitSha,candidateCodeSha256:provenance.candidateCodeSha256,
  provenance:'synthetic',purpose:'method-validation-only',family:contract.candidate.family,predictors:contract.candidate.predictors,
  featureAvailability:'opening-known-calendar-only',preprocessing:contract.candidate.preprocessing,transform:contract.candidate.transform,
  selectionScope:'development-only',holdoutUse:'once-after-settings-locked',trials:trials.map(({penalty,folds})=>({penalty,folds})),holdout:{penalty,fold:final.localCandidateFold}};
 const acceptance=evaluateHiringCandidateAcceptance(contract.protocol.manifest,rows,artifact);
 return freeze({status:'synthetic-explicit-final-evaluation-only',settingsLockFingerprint:(lock as {fingerprint:string}).fingerprint,
  model:final.model,acceptance:acceptance.report,syntheticFitPerformed:true,companyModelTrained:false,trainingReady:false,
  performanceValidated:false,deploymentValidated:false,provenanceVerified:false,untouchedExperimentEstablished:false,
  limitations:['An in-process one-use lock is not proof of globally untouched holdout data or genuine source provenance.',
   'Synthetic fitted metrics do not establish company accuracy, assignable capacity or a deployable forecast.']});
}
