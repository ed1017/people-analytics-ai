import report from './data/opening-known-hiring-v1.json' with {type:'json'};
// @ts-expect-error Native tests share canonical TypeScript.
import {isHiringPredictionQuestion,requestsHiringMatrix,predictionPercent,hiringPredictionAnswer,hiringPredictionMatrixAnswer,hiringPredictionExplanation} from './hiring-prediction-demo.ts';
export const openingKnownReport=report;
export const openingMethodLabels:Record<string,string>={'pooled-rate':'Overall-rate baseline','cell-rate':'Feature-group baseline','logistic-features':'Logistic regression'};
export const openingFamilyLabels:Record<string,string>={'stable':'Stable relationships','mix-shift':'Changed mix of openings','relationship-reversal':'Relationships reverse'};
function answer(matrices:boolean){return [
 'Synthetic hiring experiment: opening-known features v1',
 'A separate constructed experiment, not the October company dataset, current vacancies, candidates or saved plans. The generator deliberately plants relationships between three fictional opening-time facts and start-within-90-days outcomes: defined scope, reserved interview panel and a flexible start window. These are not established real hiring effects.',
 'Finding: logistic balanced accuracy is 72.0% with stable relationships, 69.8% with a changed mix, and only 27.3% when relationships reverse. The feature-group baseline is almost identical. This supports a teaching example, not real-world accuracy, model superiority or hiring decisions.',
 'The model is frozen on 1 October 2025 using January 2022–June 2025 cohorts whose outcomes are released. Test openings are October–December 2025; each prediction uses features available at that opening, not future features known on October 1. Complete simulated 90-day outcomes are scored by 1 April 2026. Twenty fresh seeds per family; 50,400 simulated openings across 60 histories and 1,440 feature/month cells. Known mechanisms, not a blinded real-world test.',
 'Positive: actual start within 90 days. Negative: no start by day 90, including cancellation and unresolved searches with complete follow-up. Predict positive at probability >= 50%, fixed before scoring. A feature/month cell shares one prediction; no person is scored.',
 ...report.families.flatMap(f=>[`${openingFamilyLabels[f.family]}: ${f.histories} histories, ${f.testCells} feature/month cells.`,...Object.entries(f.methods).map(([name,m])=>`${openingMethodLabels[name]}: ${m.openings} openings; actual starts ${m.positives}, non-starts ${m.negatives}; balanced accuracy ${predictionPercent(m.balancedAccuracy)}; Brier ${m.brier.toFixed(4)}; log loss ${m.logLoss.toFixed(4)}.${matrices?` TP ${m.tp}, FP ${m.fp}, FN ${m.fn}, TN ${m.tn}; accuracy ${predictionPercent(m.accuracy)}, precision ${predictionPercent(m.precision)}, recall ${predictionPercent(m.recall)}, specificity ${predictionPercent(m.specificity)}.`:''}`)]),
 'Lower Brier and log loss mean better probability predictions. Reversal makes both feature-based methods worse than the overall-rate baseline. The simple group baseline demonstrates that a more complex model is not necessarily better. No threshold tuning, real-world validation, causal benefit, operational qualification or confidence interval is claimed. Old calendar-only experiment answers remain separate and unchanged.',
 `Version ${report.version}; protocol ${report.protocolCommit}; evaluator ${report.evaluatorCommit}; full report SHA-256 ${report.reportSha256}.`
 ].join('\n\n');}
export const openingKnownAnswer=answer(false),openingKnownMatrixAnswer=answer(true);
export const openingKnownExplanation='Understanding the opening-known synthetic experiment\n\nThe generator plants a relationship between three opening-time process facts and outcomes. Logistic regression and the simple feature-group baseline both learn it, so they beat the overall-rate baseline in stable and mix-shift cases. Their balanced accuracies are almost identical. When the planted relationships reverse, balanced accuracy falls to 27.3% and probability error exceeds the overall-rate baseline. The model cannot know an unannounced reversal from its earlier training history.\n\nThis demonstrates learning and failure under controlled synthetic conditions; it does not establish real hiring effects or current-company predictions. A 50% threshold was fixed before testing. Brier and log loss assess probabilities; balanced accuracy averages start detection and non-start detection. A confusion matrix is available only when requested. No staffing assumptions or saved plans change.';
export function localOpeningKnownReply(question:string,previous:string|undefined){
 if(isHiringPredictionQuestion(question))return openingKnownAnswer;
 if([hiringPredictionAnswer,hiringPredictionMatrixAnswer,hiringPredictionExplanation].includes(previous??''))return null;
 const current=[openingKnownAnswer,openingKnownMatrixAnswer,openingKnownExplanation].includes(previous??'');
 if(requestsHiringMatrix(question)&&(current||/synthetic hiring/i.test(question)))return openingKnownMatrixAnswer;
 if(!current)return null;
 const q=question.trim().toLowerCase().replace(/[?.!]+$/,'');
 const metric=/^(?:(?:why is|what is|explain) (?:the )?(?:recall|precision|specificity|balanced accuracy|accuracy|brier score|log loss|confusion matrix)(?: (?:zero|undefined|50%|100%|so low|so high))?)$/;
 return ['what does that mean','what does this mean','explain these results','explain the results','is this good enough','can we use this for staffing','is this reliable','how do i read this matrix','why does it fail','why did it fail','why is recall zero'].includes(q)||metric.test(q)?openingKnownExplanation:null;
}
export function openingKnownAiContext(question:string){
 if(!/\b(?:synthetic hiring|hiring classifier|confusion matrix)\b/i.test(question)||/calendar.only/i.test(question))return null;
 return {scope:'Separate planted synthetic experiment; never apply to current workforce, people, vacancies, filters or saved plans. No causal benefit or operational qualification. Preserve reversal failure and near-identical feature-group baseline.',presentation:'Show a confusion matrix only when the user explicitly asks for it; otherwise compare probabilities and limitations without matrix cells.',report:requestsHiringMatrix(question)?openingKnownMatrixAnswer:openingKnownAnswer};
}
