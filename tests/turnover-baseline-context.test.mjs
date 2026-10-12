import test from 'node:test';
import assert from 'node:assert/strict';
import {companyTurnoverContext,companyTurnoverText,turnoverMetric,validCompanyTurnoverContext} from '../lib/home-turnover-context.ts';
import {suggestSuccessMeasure,reviewSuccessMeasure,measurementScope,successMeasureText} from '../lib/home-success-measures.ts';
import {evaluateSolutionCandidate,evaluateSolutionParameterEdit,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {readBundleDraft,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {readPlanAlternatives,associatePlanProposal} from '../lib/home-plan-alternatives.ts';
import {homePlanSummary} from '../lib/home-plan-summary.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityCandidate,accountabilityQuantity} from './fixtures/plan-accountability.mjs';
const pack={sources:[{id:'A1',status:'loaded',date:'2026-09-30',facts:{total_turnover_ytd_pct:9.1,voluntary_turnover_ytd_pct:6.2,annualized_voluntary_turnover_pct:8.3}}]};
async function initial(){const request=solutionRequest(accountabilityMessage);request.evidence=pack;const candidate=accountabilityCandidate(request);candidate.quantities=candidate.quantities.filter(q=>!['success_baseline','success_target'].includes(q.field));const item=await evaluateSolutionCandidate(request,candidate,[]);assert.deepEqual(item.blocking,[]);request.state.working=[item];return {request,item};}
test('overall, voluntary YTD and annualized voluntary remain different; absent matching values are not substituted',()=>{
 for(const [goal,metric,value] of [['Reduce turnover','total_turnover_ytd_pct',9.1],['Reduce voluntary turnover','voluntary_turnover_ytd_pct',6.2],['Reduce annualized voluntary turnover','annualized_voluntary_turnover_pct',8.3]]){
  const suggestion=suggestSuccessMeasure(goal,pack,'a'.repeat(64));assert.equal(turnoverMetric(goal),metric);assert.equal(suggestion.baseline,null);assert.equal(suggestion.history.observations.find(o=>o.metric===metric).value,value);assert.match(companyTurnoverText(goal,companyTurnoverContext(pack)),new RegExp(value+'%'));
 }
 const onlyVoluntary={sources:[{...pack.sources[0],facts:{voluntary_turnover_ytd_pct:0}}]},s={companyTurnover:companyTurnoverContext(onlyVoluntary)};
 assert.equal(s.companyTurnover.voluntary_turnover_ytd_pct,0);assert.match(companyTurnoverText('Reduce turnover',s.companyTurnover),/Overall.*Unknown/);
 assert.match(companyTurnoverText('Reduce turnover',s.companyTurnover),/Separately available: Voluntary turnover \(YTD %\): 0%/);
 assert.match(companyTurnoverText('Reduce involuntary turnover',s.companyTurnover),/requested turnover metric unavailable/);assert.equal(turnoverMetric('Reduce annualized turnover'),null);
 for(const goal of ['Reduce monthly turnover','Reduce overall and voluntary turnover','Reduce regrettable turnover'])assert.equal(turnoverMetric(goal),null);
 for(const status of ['unavailable','invalid','timeout'])assert.equal(companyTurnoverContext({sources:[{...pack.sources[0],status}]}),undefined);
 assert.equal(suggestSuccessMeasure('Improve hiring',pack).companyTurnover,undefined);
 assert.equal(companyTurnoverContext({sources:[{id:'W1',status:'loaded',facts:{voluntary_turnover_ytd_pct:6.2}}]}),undefined);
});
test('known historical context leaves pilot baseline and target unknown and cannot be adopted as a plan baseline',async()=>{
 const {item}=await initial(),measure=item.draft.inputs.successMeasure,s=suggestSuccessMeasure('Reduce turnover',pack,item.draft.binding.evidenceDigest);
 assert.deepEqual(measure.history,s.history);assert.equal(measure.baseline.value,null);assert.equal(measure.target.value,null);assert.equal(measure.history.observations[0].asOf,'2026-09-30');assert.ok(validCompanyTurnoverContext(companyTurnoverContext(pack)));
 assert.throws(()=>reviewSuccessMeasure(item.draft,s.name,'','','user-entered',s,true),/context only/);
 const text=homePlanSummary(item.draft,item.result).find(s=>s.heading==='How success is measured').items.join(' ');assert.match(text,/Overall turnover.*9.1%/);assert.match(text,/Baseline: Unknown/);assert.match(text,/Matching observation periods and denominators are unverified/);assert.match(text,/Targets are assumptions, not recorded outcomes/);
 const bad=structuredClone(item.draft);bad.inputs.successMeasure.history.denominator='invented';assert.equal(readBundleDraft(bad),null);
 const legacy=structuredClone(measure);legacy.baseline={value:'6.2%',kind:'adopted',basis:'Recorded synthetic aggregate A1.voluntary_turnover_ytd_pct; Company-wide.'};assert.match(successMeasureText(legacy),/Legacy source value: 6.2%; plan baseline: Unverified/);assert.equal(legacy.baseline.kind,'adopted');
});
test('explicit pilot assumptions and revised targets preserve context without changing prior saved snapshots',async()=>{
 const {request,item}=await initial(),goal={id:'turnover-goal',statement:item.candidate.goal.statement},outcome=await saveSolutionCandidate(request,null,item,goal,pack,true);assert.equal(outcome.status,'ready');
 const context={goalId:goal.id,goal:goal.statement},pinned=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:'pin-context',at:'2026-10-12T00:00:00Z',acknowledgeUnknowns:true});
 const reopened=readPlanAlternatives(JSON.parse(JSON.stringify(pinned)),context);assert.deepEqual(reopened,pinned);const before=JSON.stringify(reopened);
 const s=suggestSuccessMeasure(goal.statement,pack),draft=reviseBundleDraft(item.draft,reviewSuccessMeasure(item.draft,s.name,'4% in the fictional pilot, Jan–Sep 2026','3% in the same pilot, Jan–Sep 2027','illustrative',s,false));
 assert.equal(draft.inputs.successMeasure.baseline.kind,'illustrative');assert.equal(draft.inputs.successMeasure.target.kind,'illustrative');assert.deepEqual(draft.inputs.successMeasure.history,item.draft.inputs.successMeasure.history);
 const revised=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,draft.inputs.successMeasure.baseline.value,'2% in the same pilot, Jan–Sep 2027','user-entered',s,false));assert.equal(revised.inputs.successMeasure.baseline.kind,'illustrative');assert.equal(revised.inputs.successMeasure.target.kind,'user-entered');assert.equal(JSON.stringify(reopened),before);assert.deepEqual(readBundleDraft(JSON.parse(JSON.stringify(revised))).inputs.successMeasure,revised.inputs.successMeasure);
});
test('scope changes require renewed pilot measurement review; goal or changed dataset evidence cannot save the prior context',async()=>{
 const {request,item}=await initial(),before=JSON.stringify(item),source={kind:'working',id:item.id,revision:item.revision};
 const next=solutionRequest('Change population to Another fictional group.',false,request.state,2);next.evidence=pack;
 const edit=await evaluateSolutionParameterEdit(next,{id:item.id,source,quantities:[accountabilityQuantity(next,'population','Another fictional group','text')]},[]);assert.deepEqual(edit.blocking,[]);assert.notEqual(edit.draft.inputs.successMeasure.scopeKey,measurementScope(edit.draft.inputs));assert.match(successMeasureText(edit.draft.inputs.successMeasure,false),/renewed review/);assert.deepEqual(edit.draft.inputs.successMeasure.history,item.draft.inputs.successMeasure.history);
 const different=structuredClone(pack);different.sources[0].facts.total_turnover_ytd_pct=2;await assert.rejects(saveSolutionCandidate(request,null,item,{id:'goal',statement:'Reduce turnover'},different,true),/evidence, goal or constraints changed/);
 await assert.rejects(saveSolutionCandidate({...request,goal:{id:'other',statement:'Improve hiring'}},null,item,{id:'other',statement:'Improve hiring'},pack,true),/evidence, goal or constraints changed/);
 assert.equal(JSON.stringify(item),before);
});
