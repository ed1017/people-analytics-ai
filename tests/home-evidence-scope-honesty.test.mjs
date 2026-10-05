import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack} from '../lib/home-pack.mjs';
import {overviewBriefingPrompt} from '../lib/overview-briefing.ts';
import {actionEvidenceCatalog} from '../lib/home-action-proposal.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {calculatePlanWhatIf} from '../lib/home-plan-what-if.ts';
import {suggestSuccessMeasure} from '../lib/home-success-measures.ts';
import {scopeResults,selectedScope,scopedGoal,unknownDepartmentGoal} from './fixtures/home-scope-evidence.mjs';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const source=(pack,id)=>pack.sources.find(s=>s.id===id);
test('US/Data & AI/level affect only W1; enterprise/survey references retain canonical scopes even with client relabeling',()=>{
 const pack=buildHomePack(scopeResults(),selectedScope,scopedGoal);assert.equal(source(pack,'W1').facts.headcount,600);assert.equal(source(pack,'W1').facts.voluntary_turnover_ytd_pct,3.7);assert.match(source(pack,'W1').scope,/United States; Data & AI; Analyst/);
 assert.equal(source(pack,'A1').facts.voluntary_turnover_ytd_pct,8.2);assert.equal(source(pack,'A1').scope,'Company-wide; unfiltered');assert.equal(source(pack,'S1').scope,'Company-wide; survey-specific respondents');assert.equal(source(pack,'T1').facts.current_workforce,5000);
 const changed=buildHomePack(scopeResults('?country=US&org=BU-CORP&level=IC2'),'United States; Corporate Functions; Analyst / Specialist',scopedGoal);assert.equal(source(changed,'W1').facts.headcount,250);for(const id of ['A1','W2','S1','S2','T1'])assert.deepEqual(source(pack,id),source(changed,id));
 const spoof=structuredClone(pack);source(spoof,'A1').scope='US/Data & AI department';const normalized=normalizeHomePack(spoof);assert.equal(source(normalized,'A1').scope,'Company-wide; unfiltered');assert.equal(actionEvidenceCatalog(normalized).find(r=>r.id==='A1:summary').scope,'Company-wide; unfiltered');
 const baseline=suggestSuccessMeasure(scopedGoal,pack).baseline;assert.equal(baseline.value,'8.2%');assert.match(baseline.basis,/A1.*Company-wide/);assert.match(overviewBriefingPrompt(pack),/no Department filter or department-scoped evidence/);assert.match(overviewBriefingPrompt(pack),/never silently map it to a business unit/);
});
test('goal switch and unknown department do not relabel sources, adopt enterprise rates, or infer the filtered denominator',async()=>{
 const pack=buildHomePack(scopeResults(),selectedScope,scopedGoal),departmentPack=buildHomePack(scopeResults(),selectedScope,unknownDepartmentGoal);for(const id of ['W1','A1','S1','T1'])assert.deepEqual(source(pack,id),source(departmentPack,id));
 for(const goal of [scopedGoal,unknownDepartmentGoal]){
  const binding=await actionBinding(goal===scopedGoal?'us-data':'unknown-dept',goal,pack,{}),draft=prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z',{goalContext:{goal,notes:[]}});
  assert.equal(draft.inputs.scope.businessUnit.value,null);assert.match(draft.inputs.scope.population.value,/Hypothetical shared pilot/);assert.equal(draft.inputs.whatIf.baseline.kind,'illustrative');assert.equal(draft.inputs.whatIf.baseline.value,15);assert.equal(draft.inputs.whatIf.population.kind,'illustrative');assert.equal(draft.inputs.whatIf.population.value,100);assert.notEqual(draft.inputs.whatIf.population.value,source(pack,'W1').facts.headcount);
  const next=structuredClone(draft.inputs);next.scope.population={value:'User-stated Quantum Research department; denominator unknown',kind:'user-entered',basis:'Planning scope only'};const changed=reviseBundleDraft(draft,next);assert.equal(calculatePlanWhatIf(changed.inputs).status,'scope_changed');assert.equal(draft.inputs.whatIf.population.value,100);
 }
 const a=await actionBinding('same',scopedGoal,pack,{}),b=await actionBinding('same',scopedGoal,buildHomePack(scopeResults('?country=US&org=BU-CORP&level=IC2'),'United States; Corporate Functions; Analyst / Specialist',scopedGoal),{});assert.notEqual(a.evidenceDigest,b.evidenceDigest);
});
