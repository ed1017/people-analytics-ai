import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {historicalMetrics,resolveHistoricalMetric,captureMetricHistory,historicalContextText,historicalObservations,validMetricHistory} from '../lib/home-metric-context.ts';
import {suggestSuccessMeasure,reviewSuccessMeasure,successMeasureText,measurementScope} from '../lib/home-success-measures.ts';
import {reviseBundleDraft,readBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {readBundleWorkspace,attachBundlePatch} from '../lib/home-bundle-records.ts';
import {actionBindingKey} from '../lib/home-action-drafts.ts';
import {createPlanAlternatives,attachPlanAlternative,readPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {homePlanSummary} from '../lib/home-plan-summary.ts';
import {evaluateSolutionCandidate,evaluateSolutionParameterEdit,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {accountabilityCandidate,accountabilityQuantity} from './fixtures/plan-accountability.mjs';
import {turnoverMetric,companyTurnoverText} from '../lib/home-turnover-context.ts';
const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-shared-metric-context.json',import.meta.url)));
const packFor=c=>({sources:[{id:c.id,status:'loaded',date:'2026-09-30',scope:'Spoofed pilot subset',facts:{[c.field]:c.value}}]});
const approve=draft=>({confirmed:true,bindingKey:actionBindingKey(draft.binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true});
test('every registry label selects its exact metric; broad goals remain suggestions',()=>{
 for(const [metric,{name}] of Object.entries(historicalMetrics))for(const goal of [name,'Reduce '+name,'  Review '+name.toUpperCase()+'!  '])assert.deepEqual(resolveHistoricalMetric(goal),{kind:'supported',metric},goal);
 for(const goal of ['Reduce turnover','Reduce voluntary turnover','Improve retention','Improve hiring','Improve employee engagement','Build skills'])assert.equal(resolveHistoricalMetric(goal).kind,'suggested',goal);
});
test('explicit cadences and rolling windows never borrow a different historical period',()=>{
 const periods=['daily','weekly','monthly','quarterly','annual','yearly','30-day','30 day','30–day','four-week','rolling 90 days','trailing twelve months','last month','this quarter','Q3 2026','2025','since January'];
 for(const metric of ['turnover','voluntary turnover','median time to fill','engagement favorable percentage','weighted skill requirement coverage'])for(const period of periods)for(const goal of [`Reduce ${period} ${metric}`,`Reduce ${metric} for ${period}`]){
  assert.equal(resolveHistoricalMetric(goal).kind,'unsupported',goal);
  assert.equal(captureMetricHistory(goal,{sources:legacy.cases.map(c=>packFor(c).sources[0])},'a'.repeat(64)),undefined,goal);
  if(metric.includes('turnover')){assert.equal(turnoverMetric(goal),null,goal);assert.match(companyTurnoverText(goal,undefined),/metric unavailable/);}
 }
});
test('mixed statistics, units, plurals and negations fail closed even with a saved snapshot',()=>{
 const variants=[
  ['Overall turnover YTD',['voluntary turnover','turnover count','turnover counts','attrition risk score','attrition risk scores']],
  ['Median time to fill',['hiring cost','hiring costs','hiring quality','acceptance rate','acceptance rates']],
  ['Engagement favorable percentage',['survey response','survey responses','participation rate','participation rates','engagement score','engagement scores']],
  ['Weighted skills requirement coverage',['skill profile coverage','skills profile coverage','proficiency score','proficiency scores','training completion','training completions']],
 ];
 const unsupported=['Reduce review turnover','Unweighted skills requirement coverage','Unweighted skill requirement coverage','Attrition risk score','Attrition risk scores','Turnover count','Turnover counts','Median time to fill in hours','Engagement favorable count','Weighted skill requirement coverage count','Overall turnover YTD per week','Annualized voluntary turnover YTD'];
 for(const [metric,others] of variants){
  for(const other of others)for(const join of [' and ',' & ',' + ',', ',' / ',' or '])unsupported.push('Reduce '+metric+join+other,'Reduce '+other+join+metric);
  for(const prefix of ['Not ','Non-','Non–','Exclude '])unsupported.push(prefix+metric);
 }
 for(const goal of unsupported){
  assert.equal(resolveHistoricalMetric(goal).kind,'unsupported',goal);
  const history=captureMetricHistory('Improve hiring',packFor(legacy.cases[1]),'a'.repeat(64)),before=JSON.stringify(history);
  assert.equal(captureMetricHistory(goal,packFor(legacy.cases[1]),'a'.repeat(64)),undefined,goal);
  const text=historicalContextText(goal,{history});assert.match(text,/unavailable or ambiguous/,goal);assert.doesNotMatch(text,/49 days|Suggested historical metric/,goal);assert.equal(JSON.stringify(history),before);
 }
});
for(const c of legacy.cases){
 test(c.id+' frozen baseline-production records remain byte-identical and legacy aggregate is never labelled verified',()=>{
  const before=JSON.stringify(c.raw),goalId=c.raw.attachments[0].draft.binding.goalId,read=readBundleWorkspace(c.raw,goalId);assert.ok(read);assert.equal(JSON.stringify(read),before);
  const draft=read.attachments[0].draft,measure=draft.inputs.successMeasure;assert.equal(measure.history,undefined);assert.equal(measure.baseline.kind,'adopted');assert.match(successMeasureText(measure),/Legacy source value:.*plan baseline: Unverified/);
  const summary=homePlanSummary(draft,null,packFor(c)).find(s=>s.heading==='How success is measured').items.join(' ');assert.match(summary,/plan baseline: Unverified/);assert.match(summary,/Unknown/);assert.doesNotMatch(summary,/Recorded baseline:/);assert.equal(JSON.stringify(c.raw),before);
 });
 test(c.id+' separate context, explicit review, both saved formats and target edits preserve scope and provenance',()=>{
  const old=c.raw.attachments[0].draft,blank=structuredClone(old);delete blank.inputs.successMeasure;
  const s=suggestSuccessMeasure(c.goal,packFor(c),blank.binding.evidenceDigest);assert.equal(s.baseline,null);assert.ok(validMetricHistory(s.history));
  const observation=s.history.observations.find(o=>o.metric===c.field);assert.equal(observation.value,c.value);assert.equal(observation.asOf,'2026-09-30');
  assert.throws(()=>reviewSuccessMeasure(blank,s.name,'','','user-entered',{...s,baseline:{value:'42',kind:'adopted',basis:'Forged source'}},true),/context only/);
  let draft=reviseBundleDraft(blank,reviewSuccessMeasure(blank,s.name,'','','user-entered',s,false));assert.equal(draft.inputs.successMeasure.baseline.value,null);assert.equal(draft.inputs.successMeasure.target.value,null);
  const raw=attachBundlePatch(undefined,draft,approve(draft),'new-context','2026-10-12T00:00:00Z').value;
  const context={goalId:draft.binding.goalId,goal:c.goal};let numbered=createPlanAlternatives(context,[{id:'one',draft}]);numbered=attachPlanAlternative(numbered,context,'one',{inputKey:bundleInputKey(draft),attachmentId:'pin-context',at:'2026-10-12T00:00:00Z',acknowledgeUnknowns:true});
  assert.deepEqual(readBundleWorkspace(JSON.parse(JSON.stringify(raw)),context.goalId),raw);assert.deepEqual(readPlanAlternatives(JSON.parse(JSON.stringify(numbered)),context),numbered);
  const oldBytes=JSON.stringify([raw,numbered]),history=structuredClone(draft.inputs.successMeasure.history);
  draft=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'Explicit fictional cohort baseline','Proposed target','illustrative',s,false));
  const changed=suggestSuccessMeasure(c.goal,{sources:[{...packFor(c).sources[0],facts:{[c.field]:99}}]},'b'.repeat(64));
  draft=reviseBundleDraft(draft,reviewSuccessMeasure(draft,'User renamed outcome',draft.inputs.successMeasure.baseline.value,'Revised target','user-entered',changed,false));
  assert.deepEqual(draft.inputs.successMeasure.history,history);assert.match(historicalContextText(c.goal,draft.inputs.successMeasure),new RegExp(historicalMetrics[c.field].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(draft.inputs.successMeasure.target.kind,'user-entered');
  assert.equal(JSON.stringify([raw,numbered]),oldBytes);assert.ok(readBundleDraft(draft));
  const changedScope=structuredClone(draft.inputs);changedScope.scope.population.value='Different fictional cohort';const revised=reviseBundleDraft(draft,changedScope);assert.notEqual(revised.inputs.successMeasure.scopeKey,measurementScope(revised.inputs));assert.match(successMeasureText(revised.inputs.successMeasure,false),/renewed review/);
 });
 test(c.id+' new conversations freeze history and reject changed evidence or other goals on save',async()=>{
  const request=solutionRequest(c.goal+'. Fictional test group starts November 2026 for three months.'),candidate=accountabilityCandidate(request);request.evidence=packFor(c);candidate.goal.statement=c.goal;candidate.quantities=candidate.quantities.filter(q=>!['success_baseline','success_target'].includes(q.field));
  const item=await evaluateSolutionCandidate(request,candidate,[]);assert.deepEqual(item.blocking,[]);assert.ok(item.draft.inputs.successMeasure.history);request.state.working=[item];
  const goal={id:'new-'+c.id,statement:c.goal},saved=await saveSolutionCandidate(request,null,item,goal,request.evidence,true);assert.equal(saved.status,'ready');
  const changed=packFor({...c,value:c.value+1});await assert.rejects(saveSolutionCandidate(request,null,item,goal,changed,true),/changed/);await assert.rejects(saveSolutionCandidate({...request,goal:{id:'other',statement:'Other goal'}},null,item,{id:'other',statement:'Other goal'},request.evidence,true),/changed/);
  const next=solutionRequest('Change population to Different cohort',false,request.state,2);next.evidence=request.evidence;
  const revision=await evaluateSolutionParameterEdit(next,{id:item.id,source:{kind:'working',id:item.id,revision:item.revision},quantities:[accountabilityQuantity(next,'population','Different cohort','text')]},[]);assert.deepEqual(revision.blocking,[]);assert.deepEqual(revision.draft.inputs.successMeasure.history,item.draft.inputs.successMeasure.history);assert.match(successMeasureText(revision.draft.inputs.successMeasure,false),/renewed review/);
 });
}
test('exact metrics, broad suggestions, negation, exclusion, unsupported fields and mixed domains stay distinct',()=>{
 for(const [goal,metric] of [['Overall turnover YTD','total_turnover_ytd_pct'],['Voluntary turnover YTD','voluntary_turnover_ytd_pct'],['Annualized voluntary turnover','annualized_voluntary_turnover_pct'],['Median time to fill','median_time_to_fill_days'],['Engagement favorable percentage','engagement_favorable_pct'],['Weighted skills requirement coverage','weighted_requirement_met_pct']])assert.deepEqual(resolveHistoricalMetric(goal),{kind:'supported',metric});
 for(const goal of ['Reduce turnover','Improve hiring','Improve engagement','Improve skills'])assert.equal(resolveHistoricalMetric(goal).kind,'suggested');
 for(const goal of ['Reduce non-voluntary turnover','Reduce non voluntary turnover','Reduce non–voluntary turnover','Reduce nonvoluntary turnover','Reduce turnover excluding voluntary exits','Turnover other than voluntary','Not voluntary turnover','Involuntary turnover','Regrettable turnover','Monthly turnover','Overall and voluntary turnover','Improve hiring and skills','Improve engagement and turnover','Hiring cost','Engagement participation','Skills profile coverage','Average time to fill','Skills proficiency','Hiring quality','Engagement participation rate','Monthly median time to fill','Skills course completion']){
  assert.equal(resolveHistoricalMetric(goal).kind,'unsupported',goal);assert.equal(captureMetricHistory(goal,{sources:[]},'a'.repeat(64)),undefined);assert.match(historicalContextText(goal),/unavailable or ambiguous/);
 }
});
test('source-specific population, period, denominator and statistic never use dashboard labels or guessed zeros',()=>{
 for(const c of legacy.cases){for(const value of [0,null]){const history=captureMetricHistory(c.goal,packFor({...c,value}),'a'.repeat(64));assert.equal(history?.observations.find(o=>o.metric===c.field).value??null,value);assert.doesNotMatch(historicalContextText(c.goal,{history}),/Spoofed/);}
  for(const status of ['invalid','timeout','unavailable'])assert.equal(captureMetricHistory(c.goal,{sources:[{...packFor(c).sources[0],status}]},'a'.repeat(64)),undefined);
 }
 assert.match(historicalMetrics.engagement_favorable_pct.population,/respondents/);assert.match(historicalMetrics.weighted_requirement_met_pct.population,/role requirements/);assert.match(historicalMetrics.median_time_to_fill_days.statistic,/Median/);
 const history=captureMetricHistory('Improve hiring',packFor(legacy.cases[1]),'a'.repeat(64));for(const mutation of [h=>h.denominator=100,h=>h.observations[0].metric='made-up',h=>h.observations[0].value=Infinity,h=>h.observations.push(h.observations[0]),h=>h.originEvidenceDigest='bad',h=>h.originEvidenceDigest=['a'.repeat(64)],h=>h.observations[0].metric=['median_time_to_fill_days']]){const bad=structuredClone(history);mutation(bad);assert.equal(validMetricHistory(bad),false);}
});
test('legacy turnover adapter is passive; both context formats fail closed without rewriting stored blobs',()=>{
 const old=structuredClone(legacy.cases[0].raw.attachments[0].draft),companyTurnover={source:'A1',asOf:'2026-09-30',total_turnover_ytd_pct:null,voluntary_turnover_ytd_pct:6.2,annualized_voluntary_turnover_pct:null};old.inputs.successMeasure.companyTurnover=companyTurnover;
 const before=JSON.stringify(old);assert.ok(readBundleDraft(old));assert.equal(historicalObservations(old.inputs.successMeasure)[1].value,6.2);assert.equal(JSON.stringify(old),before);
 const history=captureMetricHistory(old.binding.goal,packFor(legacy.cases[0]),old.binding.evidenceDigest);for(const value of [6.2,99]){const bad=structuredClone(old);bad.inputs.successMeasure.history=structuredClone(history);bad.inputs.successMeasure.history.observations[1].value=value;const bytes=JSON.stringify(bad);assert.equal(readBundleDraft(bad),null);assert.match(historicalContextText(old.binding.goal,bad.inputs.successMeasure),/cannot be verified/);assert.deepEqual(historicalObservations(bad.inputs.successMeasure),[]);assert.equal(JSON.stringify(bad),bytes);}
 const s=suggestSuccessMeasure(old.binding.goal,packFor(legacy.cases[0]),old.binding.evidenceDigest);const edited=reviewSuccessMeasure(old,'New metric label',old.inputs.successMeasure.baseline.value,'New target','user-entered',s,false);assert.equal(edited.successMeasure.history,undefined);assert.deepEqual(edited.successMeasure.companyTurnover,companyTurnover);
});
