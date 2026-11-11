import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as staffing from '../lib/required-staffing.ts';
import * as homeStaffing from '../lib/home-required-staffing.ts';
import * as intake from '../lib/normal-staffing-intake.ts';
const {emptyRequiredStaffing,calculateRequiredStaffing,defaultRequiredStaffingCostBasis}=staffing;
const require=createRequire(process.env.POSITION_FINANCE_TEST_MODULE_ROOT??new URL('../package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=readFileSync(new URL('../components/home-required-staffing-review.tsx',import.meta.url),'utf8');
const compile=value=>ts.transpileModule(value,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const isolated=source.slice(source.indexOf('const number='),source.indexOf('export function HomeRequiredStaffingReview'));
const summaryModule={exports:{}};vm.runInNewContext(compile(isolated),{module:summaryModule,exports:summaryModule.exports,require});
const inputs=(extra={})=>({...emptyRequiredStaffing(),role:'Analyst',requiredRoles:2,...extra});
function render(input,extra={}){
 const option=extra.option??calculateRequiredStaffing(input).options[0];
 return renderToStaticMarkup(React.createElement(summaryModule.exports.StaffingOptionSummary,{option,input,deliveryMonths:null,...extra}));
}

test('unknown operational conditions remain visible without inventing empty monetary rows',()=>{
 const html=render(inputs());
 assert.match(html,/Timing: <strong>Unknown<\/strong>/);
 assert.match(html,/Confirm readiness before committing/);
 assert.match(html,/New-hire training requirements: Unknown/);
 assert.match(html,/Complete incremental cost is unconfirmed/);
 assert.doesNotMatch(html,/Scenario cost:|Known cost subtotal:|Delivery target:|Cost horizon:|Internal release:|Backfill cash/);
});

test('explicit zero cost, training and ready-at-start remain visible',()=>{
 const html=render(inputs({currency:'USD',months:4,hireCostPerPerson:0,hireTrainingHoursPerPerson:0,hireReadyAfterMonths:0,costsComplete:true}));
 assert.match(html,/Scenario cost/);assert.match(html,/0 USD/);assert.match(html,/0 hours/);assert.match(html,/Ready at start/);
 assert.doesNotMatch(html,/Unknown|unconfirmed/);
});

test('partial subtotal is labeled and budget blocker remains visible',()=>{
 const html=render(inputs({currency:'USD',months:4,hireCostPerPerson:100,budget:100}),{deliveryMonths:2});
 assert.match(html,/Known cost subtotal/);assert.match(html,/200 USD/);assert.match(html,/Over budget/);assert.match(html,/Delivery target: 2 months/);
 assert.match(html,/Complete incremental cost is unconfirmed/);assert.doesNotMatch(html,/Scenario cost/);
});

const internalInputs=extra=>inputs({currency:'USD',months:4,budget:1000,trainablePeople:1,redeployablePeople:1,poolsDistinct:true,hireCostPerPerson:100,trainingCostPerPerson:10,redeploymentCostPerPerson:5,trainingHoursPerPerson:8,hireTrainingHoursPerPerson:0,internalRelease:true,backfillCostPerInternalPerson:0,costsComplete:true,hireReadyAfterMonths:0,trainingReadyAfterMonths:0,redeployReadyAfterMonths:0,...extra});
const internalOption=input=>calculateRequiredStaffing(input).options.find(o=>o.train+o.redeploy>0);

test('internal cards distinguish missing backfill from an entered zero and state release assumptions',()=>{
 for(const backfillCostPerInternalPerson of [null,0,25]){
  const input=internalInputs({backfillCostPerInternalPerson,internalRelease:null}),html=render(input,{option:internalOption(input)});
  assert.match(html,/Internal release: <strong>Unknown<\/strong>/);
  if(backfillCostPerInternalPerson===null){assert.match(html,/Unknown, not zero/);assert.match(html,/Confirm the cost for this period/);assert.doesNotMatch(html,/entered zero/);}
  else {assert.match(html,new RegExp(`Backfill cash per internal person: <strong>${backfillCostPerInternalPerson} USD`));assert.equal(html.includes('entered zero'),backfillCostPerInternalPerson===0);assert.doesNotMatch(html,/Unknown, not zero/);}
 }
 const input=internalInputs();assert.match(render(input,{option:internalOption(input)}),/Assumed available; not verified/);
});

test('denied release and unresolved pool overlap are visible without opening Details',()=>{
 const denied=internalInputs({internalRelease:false});
 const html=render(denied,{option:internalOption(denied)});
 assert.match(html,/Internal release: <strong>Not available/);assert.match(html,/Coverage assumptions not met/);
 const overlap=internalInputs({poolsDistinct:null});
 assert.match(render(overlap,{option:internalOption(overlap)}),/Overlap between the training and redeployment pools is unknown/);
});

const element=(type,props)=>typeof type==='function'?type(props):({type,props});
const compiledReview=compile(source);
const descendants=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(descendants):[value,...descendants(value.props?.children),...descendants(value.props?.levers),...descendants(value.props?.visual)];
const textOf=value=>value===null||value===undefined||typeof value==='boolean'?'':Array.isArray(value)?value.map(textOf).join(''):typeof value==='object'?textOf(value.props?.children):String(value);
function harness(input=internalInputs(),extra={}){
 const state=[];let cursor=0;
 const hooks={useId:()=> 'staffing-test',useState:initial=>{const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial;return [state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value;}];}};
 const component={exports:{}};
 vm.runInNewContext(compiledReview,{module:component,exports:component.exports,require:name=>name==='react/jsx-runtime'?{jsx:element,jsxs:element,Fragment:'fragment'}:name==='react'?hooks:name==='@/lib/required-staffing'?staffing:name==='@/lib/home-required-staffing'?homeStaffing:name==='@/lib/normal-staffing-intake'?intake:name==='@/lib/catalog-display'?{catalogProseDisplay:v=>v}:new Proxy({},{get:(_,key)=>key})});
 const review={version:1,revision:1,inputs:input,origins:{},basisTurns:[]},props={review,onApply(){},onClear(){},onPin(){},disabled:false,...extra};
 return {review:props.review,render(){cursor=0;return component.exports.HomeRequiredStaffingReview(props);}};
}
const find=(tree,predicate)=>descendants(tree).find(predicate);
const recommendation=tree=>find(tree,n=>n.props?.['aria-label']==='Staffing recommendation');
const cards=tree=>descendants(tree).filter(n=>n.type==='article');
const button=(tree,label)=>find(tree,n=>n.type==='button'&&textOf(n)===label);
const slider=(tree,label)=>find(tree,n=>n.type==='PlanningAssumptionSlider'&&n.props.label===label);
const recommendedCard=tree=>cards(tree).find(n=>n.props.className.includes('border-primary'));

test('existing gated recommendation leads the cards with listed-cost basis and material conditions',()=>{
 const input=internalInputs({internalRelease:null,backfillCostPerInternalPerson:null,trainingReadyAfterMonths:null,poolsDistinct:null,costsComplete:null,budget:null});
 const comparison=calculateRequiredStaffing(input),before=structuredClone(input),tree=harness(input).render(),summary=recommendation(tree),text=textOf(summary);
 assert.match(text,/Conditional recommendation/);assert.ok(text.includes(comparison.recommendation.text));
 assert.match(text,/Listed cash basis: 15 USD over the 4-month cost horizon/);
 assert.match(text,/Known subtotal only.*Complete incremental cost is unconfirmed/);
 assert.match(text,/Budget ceiling: Unknown/);
 for(const line of comparison.options.find(o=>o.id===comparison.recommendation.optionId).unknowns)assert.ok(text.includes(line),line);
 assert.match(text,/Actual people and skills remain unverified/);
 assert.ok(tree.props.children.indexOf(summary)<tree.props.children.findIndex(n=>n?.type==='InteractivePlanner'));
 assert.match(textOf(recommendedCard(tree)),/^Conditional recommendation/);
 assert.deepEqual(input,before);
});

test('no-cost and no-headcount cases have no conditional recommendation or pin action',()=>{
 for(const input of [inputs({currency:'USD',months:4}),inputs({requiredRoles:null})]){
  const tree=harness(input).render();assert.match(textOf(recommendation(tree)),/^No conditional recommendation/);
  assert.equal(recommendedCard(tree),undefined);assert.equal(button(tree,'Pin Action Plan'),undefined);
  assert.doesNotMatch(textOf(recommendation(tree)),/lowest listed cash|Listed cash basis/);
 }
});

test('denied internal release cannot acquire the recommendation or pin action',()=>{
 const tree=harness(internalInputs({internalRelease:false})).render();
 assert.equal(recommendedCard(tree).props['aria-label'],'Train 0, redeploy 0, hire 2');
 for(const card of cards(tree).filter(n=>n.props['aria-label']!=='Train 0, redeploy 0, hire 2')){
  assert.match(textOf(card),/Internal release: Not available/);assert.match(textOf(card),/Coverage assumptions not met/);assert.equal(button(card,'Pin Action Plan'),undefined);
 }
});

test('deadline conflict never promotes an on-time alternative or the ungated cost recommendation',()=>{
 const input=internalInputs({trainingReadyAfterMonths:3,redeployReadyAfterMonths:null}),comparison=calculateRequiredStaffing(input);
 assert.ok(comparison.recommendation);assert.equal(comparison.options[0].readyAfterMonths,0);
 const tree=harness(input,{deliveryMonths:2}).render();
 assert.match(textOf(recommendation(tree)),/^No conditional recommendation.*lowest listed-cash mix misses the delivery target/);
 assert.doesNotMatch(textOf(recommendation(tree)),/Consider training|Listed cash basis/);
 assert.equal(recommendedCard(tree),undefined);assert.equal(button(tree,'Pin Action Plan'),undefined);
 assert.ok(cards(tree).some(n=>/Misses the 2-month delivery target/.test(textOf(n))&&/Timing: Unknown/.test(textOf(n))));
 const issue=harness(internalInputs(),{deliveryMonths:2,deliveryIssue:'Restate the delivery target.'}).render();
 assert.match(textOf(recommendation(issue)),/^No conditional recommendationRestate the delivery target/);assert.equal(button(issue,'Pin Action Plan'),undefined);
});

test('unknown readiness stays conditional while known later readiness exposes the coverage gap',()=>{
 const unknown=harness(internalInputs({trainingReadyAfterMonths:null}),{deliveryMonths:2}).render();
 assert.match(textOf(recommendation(unknown)),/^Conditional recommendation/);assert.match(textOf(recommendation(unknown)),/Readiness and coverage timing are unknown/);
 const later=harness(internalInputs({trainingReadyAfterMonths:1}),{deliveryMonths:2}).render();
 assert.match(textOf(recommendedCard(later)),/Timing: After 1 month. Coverage is not from the period start/);
 assert.match(textOf(recommendation(later)),/do not cover the entire period from its start/);
});

test('pending positive and zero budget periods suppress the recommendation until explicit confirmation',()=>{
 for(const amount of [1000,0]){
  const input=internalInputs({budget:null,hireCostPerPerson:0,trainingCostPerPerson:0,redeploymentCostPerPerson:0}),costBasis=defaultRequiredStaffingCostBasis(input);
  costBasis.budget={amount,quotedMonths:2};
  const review={version:1,revision:1,inputs:input,costBasis,origins:{},basisTurns:[]},h=harness(input,{review}),before=structuredClone(review);
  let tree=h.render();assert.match(textOf(recommendation(tree)),/^No conditional recommendation.*Confirm the budget/);assert.equal(button(tree,'Pin Action Plan'),undefined);
  button(tree,'Confirm budget for 4 months').props.onClick();tree=h.render();
  assert.match(textOf(recommendation(tree)),/^Conditional recommendationPreview of unapplied changes/);
  assert.equal(button(tree,'Pin Action Plan').props.disabled,true);assert.deepEqual(review,before);
 }
});

test('unapplied and invalid edits retain preview warnings and pin/apply guards, and reset restores the applied inputs',()=>{
 const h=harness(),before=structuredClone(h.review);let tree=h.render();
 assert.equal(button(tree,'Pin Action Plan').props.disabled,false);
 slider(tree,'Required people').props.onChange('3');tree=h.render();
 assert.match(textOf(recommendation(tree)),/Preview of unapplied changes/);assert.match(textOf(recommendation(tree)),/hiring 1/);
 assert.equal(button(tree,'Pin Action Plan').props.disabled,true);assert.equal(button(tree,'Apply staffing revision').props.disabled,false);
 slider(tree,'Required people').props.onChange('1.5');tree=h.render();
 assert.match(textOf(recommendation(tree)),/Last valid inputs shown. Correct invalid values/);assert.match(textOf(recommendation(tree)),/hiring 1/);
 assert.equal(button(tree,'Pin Action Plan').props.disabled,true);assert.equal(button(tree,'Apply staffing revision').props.disabled,true);
 button(tree,'Reset inputs').props.onClick();tree=h.render();
 assert.doesNotMatch(textOf(recommendation(tree)),/Preview of unapplied|Last valid inputs/);assert.match(textOf(recommendation(tree)),/hiring 0/);
 assert.equal(button(tree,'Pin Action Plan').props.disabled,false);assert.deepEqual(h.review,before);
});

test('manual alternative inspection never replaces the actual recommendation or pin target',()=>{
 const pinned=[],h=harness(internalInputs(),{onPin:id=>pinned.push(id)});let tree=h.render();
 const actual=calculateRequiredStaffing(h.review.inputs).recommendation;
 const radio=find(tree,n=>n.type==='input'&&n.props.type==='radio'&&!n.props.checked);radio.props.onChange();tree=h.render();
 assert.ok(textOf(recommendation(tree)).includes(actual.text));assert.match(textOf(recommendation(tree)),/chart is inspecting another mix/);
 assert.match(find(tree,n=>n.type==='InteractivePlanner').props.outcome,/0 train, 0 redeploy and 2 hire/);
 assert.equal(recommendedCard(tree).props['aria-label'],'Train 1, redeploy 1, hire 0');
 assert.equal(descendants(tree).filter(n=>n.type==='button'&&textOf(n)==='Pin Action Plan').length,1);
 button(tree,'Pin Action Plan').props.onClick();assert.deepEqual(pinned,[actual.optionId]);
 slider(tree,'Required people').props.onChange('3');tree=h.render();
 assert.doesNotMatch(textOf(recommendation(tree)),/chart is inspecting another mix/);assert.equal(button(tree,'Pin Action Plan').props.disabled,true);
});

test('disabled and already pinned reviews preserve pin guards',()=>{
 assert.equal(button(harness(internalInputs(),{disabled:true}).render(),'Pin Action Plan').props.disabled,true);
 const tree=harness(internalInputs(),{pinned:()=>7}).render();assert.equal(button(tree,'Pinned Action Plan #7').props.disabled,true);
});

function identityControls(values,costBasis){
 const input={...emptyRequiredStaffing(),requiredRoles:5,months:12,...values},review={version:1,revision:1,inputs:input,origins:{},basisTurns:[],...(costBasis?{costBasis}:{})};
 return descendants(harness(input,{review}).render()).filter(n=>['Required role','Currency'].includes(n.props?.['aria-label'])).map(n=>n.props['aria-label']);
}
test('budgeted missing roles expose the role control without unlocking known currency',()=>{
 for(const budget of [240000,0])assert.deepEqual(identityControls({currency:'GBP',budget}),['Required role']);
 assert.deepEqual(identityControls({}),['Required role','Currency']);
});
test('identity controls retain cost, unknown-currency and known-role safeguards',()=>{
 for(const values of [{budget:0},{currency:'GBP',budget:240000,trainablePeople:0},{currency:'GBP',budget:240000,hireCostPerPerson:0},{currency:'GBP',role:'Nurse',budget:240000}])assert.deepEqual(identityControls(values),[]);
 const basis=defaultRequiredStaffingCostBasis({...emptyRequiredStaffing(),months:12});basis.budget={amount:0,quotedMonths:6};assert.deepEqual(identityControls({},basis),[]);
});


test('saved fixed-role summaries use the checked receipt conditions and reject stale result presentation',async()=>{
 const facts=await import('../lib/home-required-staffing-plan.ts'),bundles=await import('../lib/home-bundle-reconciliation.ts'),quick=await import('../lib/action-plan-quick-summary.ts');
 const {prepareRequiredStaffingPlan}=await import('../lib/home-required-staffing-plan-save.ts');
 const quickModule={exports:{}},quickSource=readFileSync(new URL('../components/action-plan-quick-summary.tsx',import.meta.url),'utf8');
 vm.runInNewContext(compile(quickSource),{module:quickModule,exports:quickModule.exports,require:name=>name==='@/lib/home-required-staffing-plan'?facts:name==='@/lib/home-bundle-reconciliation'?bundles:name==='@/lib/action-plan-quick-summary'?quick:name==='./home-required-staffing-review'?summaryModule.exports:name==='./hiring-planning-summary'?{HiringPlanningSummary:()=>null}:require(name)});
 for(const backfillCostPerInternalPerson of [null,0]){
  const goal={id:'saved-staffing',statement:'Review Analyst staffing'},request={goal,scope:'Company-wide',filters:{org:'all'},state:{turns:[]},message:{id:'saved-inputs',text:'Explicit synthetic staffing assumptions.'}};
  const input=internalInputs({backfillCostPerInternalPerson,internalRelease:null,trainingReadyAfterMonths:null});
  const basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit synthetic fixture.'};
  const review=homeStaffing.editRequiredStaffing(request,'saved-staffing-fixture',Object.entries(input).filter(([,value])=>value!==null).map(([field,value])=>({field,value,basis})));
  const optionId=calculateRequiredStaffing(review.inputs).recommendation.optionId,receipt={version:1,review,optionId,deliveryTarget:null};
  const saved=await prepareRequiredStaffingPlan(receipt,goal),before=structuredClone(saved);
  const show=props=>renderToStaticMarkup(React.createElement(quickModule.exports.ActionPlanQuickSummary,props));
  const html=show(saved);assert.match(html,/Internal release: <strong>Unknown/);assert.match(html,/Timing: <strong>Unknown/);
  assert.match(html,backfillCostPerInternalPerson===null?/Unknown, not zero/:/0 USD<\/strong> for the period \(entered zero\)/);
  for(const result of [null,{...saved.result,inputKey:'stale-result'}])assert.doesNotMatch(show({...saved,result}),/Backfill cash per internal person|Confirm readiness before committing/);
  assert.deepEqual(saved,before);
 }
});
