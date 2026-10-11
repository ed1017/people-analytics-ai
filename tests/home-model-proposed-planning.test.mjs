import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,activity,evaluate,final,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {proposedPilot} from './fixtures/model-proposed-pilot.mjs';
import {evaluateSolutionCandidate,editSolutionPlanningInputs,readSolutionState,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionCandidateSchema,assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';
import {proposedPlanningEstimate} from '../lib/home-proposed-planning.ts';
import {actionPlanQuickSummary} from '../lib/action-plan-quick-summary.ts';
import {bundleAssumptionText} from '../lib/home-bundle-display.ts';
const run=(c=proposedPilot(),constraints=[])=>evaluateSolutionCandidate(solutionRequest(),c,constraints);
const requestWith=item=>solutionRequest('Edit the planning inputs.',false,{...solutionRequest().state,working:[item],focusCandidateId:item.id,turns:[{id:'user-1',role:'user',text:'Propose a pilot.'}]},2);

test('model choices are separate from actual facts and user inputs; arithmetic works without inventing scope',async()=>{
 const c=proposedPilot();assertSolutionShape(c,solutionCandidateSchema);
 const item=await run(c);assert.deepEqual(item.blocking,[]);const d=item.draft,p=proposedPlanningEstimate(d);
 assert.equal(item.result.calculationStatus,'awaiting-scope');assert.equal(d.inputs.scope.population.value,null);assert.equal(d.inputs.scope.startMonth.value,null);assert.equal(d.inputs.scope.months.kind,'model-proposed');
 assert.equal(d.inputs.memberships[0].complete.value,null);assert.equal(d.inputs.groupsDisjoint.value,null);assert.equal(item.result.uniqueParticipants,null);
 assert.deepEqual(p.participants,{min:10,max:10});assert.deepEqual(p.hours,{min:28,max:28});assert.equal(p.cash,500);assert.equal(p.months,2);assert.equal(p.laborCost,null);assert.equal(d.inputs.deliveryEstimate.hourlyRate.value,null);assert.equal(d.inputs.expenses[0].months.value,1);assert.equal(d.inputs.expenses[0].startMonth.value,null);assert.equal(d.inputs.budget,undefined);
 assert.equal(actionPlanQuickSummary(d,item.result).planning.cash,500);const stale=structuredClone(d);stale.inputs.scope.months.value=3;assert.equal(actionPlanQuickSummary(stale,item.result).planning,null);
 assert.match(bundleAssumptionText(d.inputs.scope.months),/Model-proposed · unconfirmed/);
});

test('proposed kinds cannot borrow user/source provenance or propose facts, rates, effects, confirmations or oversized drafts',async()=>{
 for(const [field,value,unit,target] of [['budget_usd',500,'USD',null],['population',null,'text',null],['success_target',null,'text',null],['costs_distinct',null,'boolean',null],['start_month',null,'YYYY-MM',null],['horizon_months',4,'months',null],['participants',21,'people','c1'],['participants',1.5,'people','c1'],['hours_per_participant',9,'hours/person/total',null],['coordination_hours',25,'hours/total',null],['cash',2001,'USD','c1']]){
  const c=proposedPilot();c.quantities=[{...c.quantities[0],field,number:value,unit,target}];assert.ok((await run(c)).blocking.length,field);
 }
 for(const mutation of [{turnId:'user-1'},{source:{kind:'saved',id:'A',revision:1,field:'horizon_months',target:null}},{factor:1},{text:'User said this'},{unit:'weeks'},{target:'c1'}]){const c=proposedPilot();Object.assign(c.quantities[0],mutation);assert.ok((await run(c)).blocking.length,JSON.stringify(mutation));}
 const bad=proposedPilot();bad.quantities[0].number=NaN;assert.throws(()=>assertSolutionShape(bad,solutionCandidateSchema));
 const literal=proposedPilot();literal.quantities[0].kind='literal';assert.ok((await run(literal)).blocking.some(s=>/user turn/.test(s)));
 const unknown=proposedPilot();unknown.quantities=[];assert.equal(proposedPlanningEstimate((await run(unknown)).draft),null);
});

test('explicit cash ceilings and effort ceilings block even without a funding calendar',async()=>{
 assert.ok((await run(proposedPilot(),[{action:'set',field:'budget_usd',number:400,text:null,unit:'USD',turnId:'user-1'}])).blocking.some(s=>/allowances exceed/.test(s)));
 assert.ok((await run(proposedPilot(),[{action:'set',field:'max_hours',number:20,text:null,unit:'hours/total',turnId:'user-1'}])).blocking.some(s=>/28 staff hours/.test(s)));
});

test('multiple cohorts stay a range and cash overlap is not silently settled',async()=>{
 const c=proposedPilot();c.activities.push(activity('c2','Follow-up workshop'));c.quantities.find(q=>q.field==='participants').target='all';c.quantities.push({...c.quantities.find(q=>q.field==='cash'),target:'c2',number:300});
 const item=await run(c),p=proposedPlanningEstimate(item.draft);assert.deepEqual(item.blocking,[]);assert.deepEqual(p.participants,{min:10,max:20});assert.deepEqual(p.hours,{min:28,max:48});assert.equal(p.cash,null);assert.deepEqual(p.cashItems.map(row=>row.amount),[500,300]);assert.equal(item.result.uniqueParticipants,null);assert.equal(item.draft.inputs.costsDistinct.value,null);
 const incomplete=structuredClone(item.draft);incomplete.inputs.memberships[1].groupIds=[];assert.equal(proposedPlanningEstimate(incomplete).hours,null);
});

test('local edits recalculate one revision, preserve unrelated assumptions and never invoke a model',async()=>{
 const item=await run(),request=requestWith(item),original=JSON.stringify(item);
 const edited=await editSolutionPlanningInputs(request,item,[{field:'participants',target:'c1',value:12},{field:'cash',target:'new-c1',value:600}]);assert.deepEqual(edited.blocking,[]);assert.equal(edited.id,item.id);assert.equal(edited.revision,2);assert.deepEqual(edited.draft.bundle,item.draft.bundle);assert.equal(JSON.stringify(item),original);
 const p=proposedPlanningEstimate(edited.draft);assert.deepEqual(p.hours,{min:32,max:32});assert.equal(p.cash,600);assert.equal(edited.draft.inputs.scope.months.kind,'model-proposed');assert.equal(edited.draft.inputs.groups[0].count.kind,'illustrative');assert.match(edited.draft.inputs.groups[0].count.basis,/planning assumptions editor/);assert.equal(edited.draft.inputs.memberships[0].complete.value,null);
 assert.ok((await editSolutionPlanningInputs(request,item,[{field:'participants',target:'c1',value:2.5}])).blocking.length);
 const blank=await editSolutionPlanningInputs(request,item,[{field:'hours_per_participant',target:null,value:null}]);assert.equal(proposedPlanningEstimate(blank.draft).hours,null);
 await assert.rejects(editSolutionPlanningInputs(requestWith(edited),item,[{field:'participants',target:'c1',value:12}]),/proposal changed/);
});

test('new model-proposed assumptions cannot overwrite a retained numeric input',async()=>{
 const item=await run(),request=requestWith(item),c=proposedPilot(item.id,'user-2');c.base={kind:'working',id:item.id,revision:item.revision};c.activities=c.activities.map(a=>({...a,mode:'retain',source:{...c.base,activityId:a.id}}));c.quantities=[c.quantities[0]];
 assert.ok((await evaluateSolutionCandidate(request,c,[])).blocking.some(s=>/cannot replace/.test(s)));
});

test('fixture service, save and reload preserve proposal provenance and unknown facts',async()=>{
 const request=solutionRequest(),c=proposedPilot();const runtime=fixtureRuntime([evaluate(c),final('A small pilot can test the proposed mechanism.',[c.id])]);const reply=await converseSolutions(request,runtime,new AbortController().signal);
 assert.equal(runtime.reads,0);assert.equal(reply.candidateIds.length,1);const item=reply.state.working[0];assert.deepEqual(item.blocking,[]);assert.ok(runtime.contexts[1].some(entry=>entry.type==='function_call_output'&&entry.output.includes('planningEstimate')));
 const saving={...request,state:reply.state};const result=await saveSolutionCandidate(saving,null,item,{id:'experience',statement:c.goal.statement},request.evidence,true);assert.equal(result.status,'ready');assert.equal(result.plan.draft.inputs.scope.months.kind,'model-proposed');assert.equal(result.plan.draft.inputs.scope.population.value,null);assert.deepEqual(readSolutionState(reply.state),reply.state);
});

test('editing a constrained horizon explicitly replaces or withdraws that constraint',async()=>{
 const constraints=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:'user-1'}],item=await run(proposedPilot(),constraints),request=requestWith(item);request.state.constraints=constraints;
 const edited=await editSolutionPlanningInputs(request,item,[{field:'horizon_months',target:null,value:1}]);assert.deepEqual(edited.blocking,[]);assert.equal(edited.draft.inputs.scope.months.value,1);assert.equal(edited.constraints[0].number,1);assert.equal(edited.constraints[0].turnId,'user-2');
 const cleared=await editSolutionPlanningInputs(request,item,[{field:'horizon_months',target:null,value:null}]);assert.deepEqual(cleared.blocking,[]);assert.equal(cleared.draft.inputs.scope.months.value,null);assert.equal(cleared.constraints[0].action,'remove');
});

test('referencing a proposed allowance cannot turn it into a user budget ceiling',async()=>{
 const item=await run(),request=requestWith(item),c=proposedPilot('different','user-2');c.quantities=[{field:'budget_usd',target:null,unit:'USD',kind:'reference',number:null,text:null,source:{kind:'working',id:item.id,revision:item.revision,field:'cash',target:'new-c1'},factor:null,turnId:null,interpretation:'Reuse the allowance as a budget.'}];
 assert.ok((await evaluateSolutionCandidate(request,c,[])).blocking.some(line=>/different planning field/.test(line)));
});
