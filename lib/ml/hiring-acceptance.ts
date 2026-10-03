/** Offline synthetic acceptance mechanics. Never fits or authorizes a model. */
import {createHash} from 'node:crypto';
// @ts-expect-error Native Node tests share the existing TypeScript evaluator.
import {evaluateHiringBaselines,freezeHiringProtocol,scoreAlignedPredictions,type AlignedValue,type HiringObservation,type RegressionMetrics} from './hiring-evaluation.ts';

const penalties=[0.1,1,10] as const;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function freeze<T>(value:T):Readonly<T>{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}
 return value;
}
/** Thresholds/settings transcribed from workforce-overnight-review.md, not tuned to fixtures. */
export function freezeHiringAcceptanceContract(manifest:unknown){
 const contract={methodVersion:'hiring-candidate-acceptance-v1',protocol:freezeHiringProtocol(manifest),
  candidate:{family:'ridge-log1p-elapsed-days',predictors:['opening-month-sine','opening-month-cosine'],penalties,
   transform:'max(0,expm1(prediction))',preprocessing:'training-fold-only',selection:'mean-development-fold-mae'},
  thresholds:{minimumRelativeMaeImprovement:0.10,minimumAbsoluteMaeImprovementDays:2,
   requiredImprovingDevelopmentFolds:2,maximumDevelopmentMaeWorsening:0.05,maximumHoldoutP90Worsening:0.05}};
 return freeze({...contract,fingerprint:hash(contract)});
}
function record(raw:unknown,keys:string[]):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid candidate artifact shape.');
 const value=raw as Record<string,unknown>;
 if(Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))throw Error('Unexpected or missing candidate artifact fields.');
 return value;
}
function requireValue(value:unknown,message:string):asserts value{if(!value)throw Error(message)}
function sameIds(raw:unknown,expected:string[]){
 requireValue(Array.isArray(raw)&&raw.length===expected.length&&raw.every(id=>typeof id==='string'),'Candidate membership does not match the frozen evaluator.');
 const ids=[...raw].sort();
 requireValue(new Set(ids).size===ids.length&&JSON.stringify(ids)===JSON.stringify([...expected].sort()),'Candidate membership does not match the frozen evaluator.');
 return ids as string[];
}
function compare(candidate:RegressionMetrics,baseline:RegressionMetrics,contract:ReturnType<typeof freezeHiringAcceptanceContract>){
 const t=contract.thresholds;
 return {
  maeImproves:baseline.maeDays-candidate.maeDays>=t.minimumAbsoluteMaeImprovementDays&&candidate.maeDays<=baseline.maeDays*(1-t.minimumRelativeMaeImprovement),
  developmentMaeWithinLimit:candidate.maeDays<=baseline.maeDays*(1+t.maximumDevelopmentMaeWorsening),
  holdoutP90WithinLimit:candidate.p90AbsoluteErrorDays<=baseline.p90AbsoluteErrorDays*(1+t.maximumHoldoutP90Worsening),
 };
}
/**
 * Invalid/unsupported artifacts throw. Insufficient evidence or failed performance gates
 * return a retained-baseline decision. Provenance declarations cannot prove fitting history.
 */
export function evaluateHiringCandidateAcceptance(manifest:unknown,observations:unknown[],artifact:unknown){
 const contract=freezeHiringAcceptanceContract(manifest); // No outcomes can configure dates or thresholds.
 const evaluation=evaluateHiringBaselines(manifest,observations);
 const common={contract,baseline:evaluation.report,modelTrained:false,deploymentValidated:false,
  limitations:[...evaluation.report.limitations,
   'Submitted predictions and provenance declarations exercise synthetic gate mechanics only; fitting, training-only preprocessing and untouched-holdout history are not independently established.',
   'Passing synthetic acceptance cannot establish real predictive accuracy, assignable capacity, a forecast, or deployment readiness.',
   'Equal development selection scores fail closed: a tie policy requires separate protocol review.']};
 const blocked=evaluation.report.folds.flatMap(fold=>fold.failedGates.map(gate=>`${fold.name}:${gate}`));
 if(!evaluation.report.openingCalendarCoverageEligible)blocked.push('opening-calendar-coverage');
 if(!evaluation.report.candidateReviewGatesPassed)return freeze({report:{...common,status:'blocked' as const,
  syntheticAcceptanceGatesPassed:false,decision:'retain-baselines' as const,failedGates:blocked,candidate:null},localAudit:evaluation.localAudit});
 const a=record(artifact,['contractFingerprint','datasetFingerprint','sourceDefinitionSha256','evaluatorGitSha','candidateCodeSha256',
  'provenance','purpose','family','predictors','featureAvailability','preprocessing','transform','selectionScope','holdoutUse','trials','holdout']);
 requireValue(a.contractFingerprint===contract.fingerprint&&a.datasetFingerprint===evaluation.report.datasetFingerprint,'Candidate is bound to different observations or a different frozen contract.');
 for(const key of ['sourceDefinitionSha256','candidateCodeSha256'])requireValue(typeof a[key]==='string'&&/^[a-f0-9]{64}$/.test(a[key] as string),'Missing candidate/source code provenance hash.');
 requireValue(typeof a.evaluatorGitSha==='string'&&/^[a-f0-9]{40}$/.test(a.evaluatorGitSha),'Missing evaluator revision.');
 requireValue(a.provenance==='synthetic'&&a.purpose==='method-validation-only','Only synthetic acceptance mechanics are supported.');
 requireValue(a.family===contract.candidate.family&&JSON.stringify(a.predictors)===JSON.stringify(contract.candidate.predictors)&&
  a.featureAvailability==='opening-known-calendar-only'&&a.preprocessing===contract.candidate.preprocessing&&
  a.transform===contract.candidate.transform&&a.selectionScope==='development-only'&&a.holdoutUse==='once-after-settings-locked',
  'Unsupported candidate, feature provenance, preprocessing, transformation or holdout use.');
 const rows=new Map((observations as HiringObservation[]).map(row=>[row.requisitionId,row]));
 const scoreFold=(raw:unknown,index:number)=>{
  const value=record(raw,['name','trainBefore','trainingIds','preprocessingIds','predictions']);
  const fold=evaluation.report.folds[index],audit=evaluation.localAudit.folds[index];
  requireValue(value.name===fold.name&&value.trainBefore===fold.trainBefore,'Candidate temporal window mismatch.');
  const trainingIds=sameIds(value.trainingIds,audit.trainIds),preprocessingIds=sameIds(value.preprocessingIds,audit.trainIds);
  requireValue(Array.isArray(value.predictions),'Candidate predictions must be aligned rows.');
  const predictions=value.predictions.map(raw=>{
   const prediction=record(raw,['id','days']);
   requireValue(typeof prediction.id==='string'&&typeof prediction.days==='number','Invalid candidate prediction types.');
   return {id:prediction.id,days:prediction.days};
  }).sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0);
  const actual:AlignedValue[]=audit.scoreIds.map(id=>{const row=rows.get(id)!;return {id,days:(Date.parse(row.startDate!)-Date.parse(row.openedDate!))/86400000}});
  const metrics=scoreAlignedPredictions(actual,predictions); // Sole shared scoring boundary, with exact IDs.
  return {name:fold.name,metrics,normalized:{name:fold.name,trainBefore:fold.trainBefore,trainingIds,preprocessingIds,predictions}};
 };
 requireValue(Array.isArray(a.trials)&&a.trials.length===penalties.length,'All three fixed development penalties are required.');
 const trialRecords=a.trials.map(raw=>record(raw,['penalty','folds']));
 requireValue(new Set(trialRecords.map(trial=>trial.penalty)).size===penalties.length&&trialRecords.every(trial=>penalties.some(p=>p===trial.penalty)),'Unsupported or repeated candidate penalties.');
 const trials=penalties.map(penalty=>{
  const trial=trialRecords.find(trial=>trial.penalty===penalty)!;
  requireValue(Array.isArray(trial.folds)&&trial.folds.length===contract.protocol.development.length,'Every development fold is required.');
  const folds=contract.protocol.development.map((window,index)=>{
   const matches=(trial.folds as unknown[]).filter(raw=>!!raw&&typeof raw==='object'&&(raw as {name?:unknown}).name===window.name);
   requireValue(matches.length===1,'Repeated or missing development window.');
   return scoreFold(matches[0],index);
  });
  return {penalty,folds,meanDevelopmentMaeDays:folds.reduce((sum,fold)=>sum+fold.metrics.maeDays,0)/folds.length};
 });
 const best=Math.min(...trials.map(trial=>trial.meanDevelopmentMaeDays)),winners=trials.filter(trial=>trial.meanDevelopmentMaeDays===best);
 requireValue(winners.length===1,'Ambiguous development selection; no reviewed tie policy exists.');
 const selected=winners[0],holdout=record(a.holdout,['penalty','fold']);
 requireValue(holdout.penalty===selected.penalty,'Holdout candidate must use the development-selected penalty.');
 const final=scoreFold(holdout.fold,contract.protocol.development.length);
 const folds=[...selected.folds,final].map((candidate,index)=>{
  const baseline=evaluation.report.folds[index];
  return {name:candidate.name,candidate:candidate.metrics,baselines:{rolling:baseline.rolling.metrics!,expanding:baseline.expanding.metrics!},
   checks:{rolling:compare(candidate.metrics,baseline.rolling.metrics!,contract),expanding:compare(candidate.metrics,baseline.expanding.metrics!,contract)}};
 });
 const dev=folds.slice(0,-1),last=folds.at(-1)!;
 const improving=dev.filter(fold=>fold.checks.rolling.maeImproves&&fold.checks.expanding.maeImproves).length;
 const gates={developmentImprovement:improving>=contract.thresholds.requiredImprovingDevelopmentFolds,
  developmentNonRegression:dev.every(fold=>fold.checks.rolling.developmentMaeWithinLimit&&fold.checks.expanding.developmentMaeWithinLimit),
  holdoutImprovement:last.checks.rolling.maeImproves&&last.checks.expanding.maeImproves,
  holdoutTailNonRegression:last.checks.rolling.holdoutP90WithinLimit&&last.checks.expanding.holdoutP90WithinLimit};
 const failedGates=Object.entries(gates).filter(([,passed])=>!passed).map(([name])=>name);
 const normalized={...Object.fromEntries(Object.keys(a).filter(key=>!['trials','holdout'].includes(key)).sort().map(key=>[key,a[key]])),
  trials:trials.map(trial=>({penalty:trial.penalty,folds:trial.folds.map(fold=>fold.normalized)})),holdout:{penalty:selected.penalty,fold:final.normalized}};
 return freeze({report:{...common,status:failedGates.length?'rejected' as const:'passed-synthetic-method-validation' as const,
  syntheticAcceptanceGatesPassed:!failedGates.length,decision:failedGates.length?'retain-baselines' as const:'continue-method-review' as const,
  failedGates,candidate:{artifactFingerprint:hash(normalized),declaredProvenance:{sourceDefinitionSha256:a.sourceDefinitionSha256,evaluatorGitSha:a.evaluatorGitSha,
   candidateCodeSha256:a.candidateCodeSha256},selectedPenalty:selected.penalty,
   selection:trials.map(trial=>({penalty:trial.penalty,meanDevelopmentMaeDays:trial.meanDevelopmentMaeDays})),folds,improvingDevelopmentFolds:improving,gates}},
  localAudit:evaluation.localAudit});
}
