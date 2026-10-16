import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as demand from '../lib/swp-demand.ts';
import * as demandEditor from '../lib/swp-demand-editor.ts';
import * as costLayer from '../lib/swp-capacity-cost.ts';
import * as engine from '../lib/swp-monthly-workload.ts';
import * as draftAdapter from '../lib/swp-capacity-draft.ts';
import * as capacityStore from '../lib/swp-capacity-store.ts';
import * as capacityRecord from '../lib/swp-capacity-record.ts';
import {monthlyScenarioInputKey} from '../lib/monthly-scenario-compatibility.mjs';
const require=createRequire(import.meta.url);
function component(file,mocks={}){
 const filename=path.resolve(file),compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const compiledModule=new Module(filename);compiledModule.filename=filename;compiledModule.require=id=>Object.hasOwn(mocks,id)?mocks[id]:id==='./carried-planning-goal'?component('components/workforce-planning/carried-planning-goal.tsx'):require(id);compiledModule._compile(compiled.outputText,filename);return compiledModule.exports;
}
const previewLayer=component('lib/capacity-preview.ts',{'./swp-capacity-draft':draftAdapter,'./swp-monthly-workload':engine});
const sliderLayer=component('lib/planning-slider.ts');
const {PlanningAssumptionSlider}=component('components/planning-assumption-slider.tsx',{'@/lib/planning-slider':sliderLayer,'./planning-assumption-slider.module.css':{default:{}},react:{...React,useId:()=> 'slider'}});
const {CapacityProjection}=component('components/workforce-planning/capacity-projection.tsx');
const point=(month,allocatedFte,requiredFte,gapFte)=>({month,allocatedFte,requiredFte,gapFte});
test('compact projection preserves empty, unknown, zero, single-month, discontinuity and surplus semantics',()=>{
 const cases={empty:null,unknown:[point('2026-10',null,null,null)],zero:[point('2026-10',0,0,0)],single:[point('2026-10',3.33,7.2,3.87)],partial:[point('2026-10',10,12,2),point('2026-11',null,12,null),point('2026-12',10,12,2)],surplus:[point('2026-10',12,10,-2)]};
 for(const [name,points] of Object.entries(cases)){
  const html=renderToStaticMarkup(React.createElement(CapacityProjection,{result:points===null?null:{points}}));assert.doesNotMatch(html,/NaN|Infinity/);
  if(name==='empty')assert.match(html,/Enter your work and team numbers/);
  if(name==='unknown'){assert.doesNotMatch(html,/<svg/);assert.match(html,/Unknown/);}
  if(name==='zero'){assert.match(html,/<svg/);assert.equal((html.match(/<circle/g)||[]).length,2);}
  if(name==='single'){assert.match(html,/\+3.87/);assert.equal((html.match(/cx="340"/g)||[]).length,2);}
  if(name==='partial'){const paths=[...html.matchAll(/<path d="([^"]*)"/g)].map(x=>x[1]);assert.equal((paths[1].match(/M/g)||[]).length,2);assert(!paths[1].includes('L'));}
  if(name==='surplus')assert.match(html,/-2/);
  if(points&&name!=='unknown'){assert.doesNotMatch(html,/<text\b/);assert.match(html,/data-capacity-axis="x"[^>]*text-xs/);assert.match(html,/data-capacity-axis="y"[^>]*text-xs/);assert.match(html,/<desc[^>]*>Calculated from the displayed assumptions\./);assert.doesNotMatch(html,/confirmed assumptions/);}
 }
});
const scope={id:'scope-a',label:'Service desk — tickets',workUnit:'Service desk — tickets'};
const context={datasetToken:'legacy-v1:0',goalId:'a',goal:'Review capacity'};
const draft={...draftAdapter.emptyCapacityDraft,scope:scope.label,openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true};
const session={draft,result:engine.calculateMonthlyWorkload(draftAdapter.capacitySpec(draft)),error:'',scope,capture:{inputKey:'previous',binding:{...context,scopeId:scope.id,scopeLabel:scope.label,workUnit:scope.workUnit}}};
function worksheet(input=session){
 let updated,focused=0;
 const Saved=()=>React.createElement('section',{'aria-label':'Saved capacity scenarios'});
 const {CapacityWorkspace}=component('components/workforce-planning/capacity-workspace.tsx',{
  '@/lib/capacity-preview':previewLayer,'@/lib/planning-slider':sliderLayer,'@/components/planning-assumption-slider':{PlanningAssumptionSlider},
  react:{...React,useRef:()=>({current:{focus(){focused++;}}})},
  '@/lib/swp-capacity-cost':costLayer,'@/lib/swp-monthly-workload':engine,'@/lib/swp-capacity-draft':draftAdapter,
  '@/components/decision-store':{decisionStore:{}},'@/lib/dataset-client.mjs':{datasetSession:{snapshot:()=>context.datasetToken}},
  '@/lib/swp-capacity-store':{capacityContext:()=>context,capacityBinding:(value,identity)=>({...value,scopeId:identity.id,scopeLabel:identity.label,workUnit:identity.workUnit})},
  '@/lib/monthly-scenario-compatibility.mjs':{monthlyScenarioInputKey},
  './skill-client-demand':{SkillClientDemand:()=>null},'./capacity-projection':{CapacityProjection},'./capacity-saved-scenarios':{CapacitySavedScenarios:Saved},
  './planning-session-context':{usePlanningSession:()=>({goalKey:'goal:a',capacitySession:input,setCapacitySession:value=>{updated=value;}})},
 });
 return {tree:CapacityWorkspace(),Saved,updated:()=>updated,focused:()=>focused};
}
const nodes=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(nodes)]:[];
test('compact worksheet keeps saved controls outside its form and monthly detail collapsed',()=>{
 const view=worksheet(),all=nodes(view.tree),form=all.find(node=>node.type==='form');assert(form);
 assert.equal(nodes(form).filter(node=>node.type===view.Saved).length,0);assert.equal(all.filter(node=>node.type===view.Saved).length,1);
 const html=renderToStaticMarkup(view.tree);assert.match(html,/Work needed and time available/);assert.match(html,/Saved scenarios stay in this browser/);assert.match(html,/Without a goal, calculations are session-only/);
 assert.equal((html.match(/<form/g)||[]).length,1);assert.doesNotMatch(html,/<details[^>]*open/);
 const dateGroup=all.find(node=>node.type==='div'&&React.Children.toArray(node.props.children).some(child=>child.props?.label==='Planning months')&&nodes(node).some(child=>child.props['aria-label']==='Opening date (month end)'));
 assert.match(dateGroup.props.className,/grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,11rem\),1fr\)\)\]/);
});
test('compact worksheet retains edit and confirmation capture invalidation',()=>{
 for(const [label,value,clearScope] of [['Planning months','2',false],['Work items each month','900',false],['Work to plan','Other work',true],['Cost per contracted FTE per month (USD, optional)','0',false],['Cost per contracted FTE per month (USD, optional)','',false]]){
  const view=worksheet(),input=nodes(view.tree).find(node=>node.props['aria-label']===label||node.props.label===label);input.props.onChange(input.props.label?value:{target:{value}});
  const next=view.updated();assert.equal(next.result,null);assert.equal(next.cost,null);assert.equal(next.capture,null);assert.equal(next.draft.confirmed,false);assert.deepEqual(next.scope,clearScope?null:scope);
 }
 const view=worksheet(),confirmation=nodes(view.tree).find(node=>node.type==='input'&&node.props.className==='mt-1');confirmation.props.onChange({target:{checked:false}});
 assert.equal(view.updated().capture,null);assert.equal(view.updated().result,null);assert.equal(view.updated().draft.confirmed,false);
});
test('compact worksheet captures calculation identity and does not retain it after invalid calculation',()=>{
 const previous=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=callback=>{callback();return 0;};
 try{
  const view=worksheet(),form=nodes(view.tree).find(node=>node.type==='form');form.props.onSubmit({preventDefault(){}});
  assert.equal(view.focused(),1,'Submitting moves focus to calculation feedback');
  assert.equal(view.updated().capture.inputKey,costLayer.capacityCalculationKey(view.updated().result,view.updated().cost));assert.deepEqual(view.updated().capture.binding,{...context,scopeId:scope.id,scopeLabel:scope.label,workUnit:scope.workUnit});
  const invalid=worksheet({...session,draft:{...draft,fte:'11'}});nodes(invalid.tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(invalid.focused(),1,'Invalid submission also moves focus to feedback');
  assert.equal(invalid.updated().result,null);assert.equal(invalid.updated().capture,null);assert.match(invalid.updated().error,/exceeds/);
 }finally{if(previous===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previous;}
});

test('saved comparison labels recurring month differences separately and ignores scenario names',()=>{
 const binding=capacityStore.capacityBinding(context,scope),at='2026-10-13T20:00:00.000Z';
 const entry=(draft,id,name)=>({draft,record:capacityRecord.prepareCapacityRecord({draft,result:engine.calculateMonthlyWorkload(draftAdapter.capacitySpec(draft)),error:''},binding,{id,name,createdAt:at})});
 for(const [openingPeople,openingCount] of [['10',0],['11',1]]){
  const entries=[entry(draft,'base','Original name'),entry({...draft,people:openingPeople,productivity:'20'},'alternate','A completely different scenario name')];
  const snapshot={ready:true,saved:true,data:{goals:{activeId:'a',goals:[{id:'a',statement:context.goal}]},workspaces:{a:{fields:{[capacityStore.monthlyCapacityField]:{version:1,scopes:[scope],entries}}}}}};
  const store={getSnapshot:()=>snapshot,getDatasetToken:()=>context.datasetToken};let stateIndex=0;
  const {CapacitySavedScenarios}=component('components/workforce-planning/capacity-saved-scenarios.tsx',{
   react:{...React,useState:()=>[['base','alternate','',''][stateIndex++],()=>{}]},
   '@/components/decision-store':{decisionStore:store,useDecisionStorage:()=>snapshot},
   '@/lib/dataset-client.mjs':{datasetSession:{snapshot:()=>context.datasetToken}},
   '@/lib/swp-capacity-cost':costLayer,'@/lib/swp-capacity-store':capacityStore,'@/lib/swp-capacity-record':capacityRecord,
   './planning-session-context':{usePlanningSession:()=>({goalKey:'goal:a',capacitySession:{...session,saveName:'Unsaved draft name'},setCapacitySession:()=>{}})},
  });
  const tree=CapacitySavedScenarios(),all=nodes(tree),html=renderToStaticMarkup(tree);
  const announcement=all.find(n=>n.props.role==='status'&&String(n.props.children).startsWith('Comparing '));
  assert(announcement);assert.equal(announcement.props['aria-atomic'],'true');
  assert(!nodes(announcement).some(n=>n.type==='table'));
  assert.equal(all.find(n=>n.props['aria-label']==='Saved capacity comparison').props.tabIndex,0);
  assert.equal(all.find(n=>n.props.role==='alert').props.children,'');
  assert.match(html,new RegExp('Opening assumption differences: '+openingCount+'\\.'));
  assert.match(html,/value="Unsaved draft name"/);assert.match(html,/Month-level assumption differences: 3\./);assert.match(html,/A recurring change counts once per month/);
  assert.match(html,/What changed between these scenarios/);assert.match(html,/Productivity improvement/);assert.match(html,/20 %/);assert.match(html,/current draft edits are excluded/);
 }
});

test('comparison explains changed saved values with units, effective movement assumptions and unknown cost',()=>{
 const {CapacityAssumptionChanges}=component('components/workforce-planning/capacity-saved-scenarios.tsx',{
  '@/components/decision-store':{},'@/lib/dataset-client.mjs':{},'@/lib/swp-capacity-cost':costLayer,
  '@/lib/swp-capacity-store':capacityStore,'@/lib/swp-capacity-record':capacityRecord,'./planning-session-context':{},
 });
 const render=(a,b)=>renderToStaticMarkup(React.createElement(CapacityAssumptionChanges,{left:{name:'Original',draft:a},right:{name:'Alternative',draft:b}}));
 const baseline={...draft,hireFte:'',exitFte:''};
 const before=structuredClone(baseline);
 const html=render(baseline,{...baseline,volume:'900',hours:'140',allocation:'60.1234',productivity:'10',fullTimeMovements:false,hireFte:'0.5',exitFte:'1',costRate:'0'});
 for(const text of ['Work items each month','800 items/month','900 items/month','140 hours/FTE/month','60.1234 %','1 FTE/person','0.5 FTE/person','Joiner and departure FTE basis','Unknown','0 USD/FTE/month','not effects attributed to any one change','Unknown cost is not zero'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/Contracted time per departure<\/h4>/,'effective 1 FTE is unchanged');
 assert.deepEqual(baseline,before,'rendering must not edit the saved draft');
 assert.match(render({...baseline,costRate:''},{...baseline,people:'10.0'}),/No differences in the recurring capacity or cost inputs/);
 assert.doesNotMatch(render({...baseline,costRate:'0'},{...baseline,costRate:'0.00'}),/Cost per contracted FTE<\/h4>/);
 const rated=render({...baseline,costRate:'12.34'},{...baseline,costRate:'12.35'});
 assert.match(rated,/12.34 USD\/FTE\/month/);assert.match(rated,/12.35 USD\/FTE\/month/);
 assert.doesNotMatch(html,/<details[^>]*open/,'secondary assumptions start collapsed');
});

test('optional cost shows unknown and zero distinctly without removing capacity chart or blocking calculation',()=>{
 const previous=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=callback=>{callback();return 0;};
 try{
  for(const [rate,expected,cents] of [['','Unknown',null],['0','$0.00',0],['12.34','$98.72',9872]]){
   const view=worksheet({...session,draft:{...draft,costRate:rate}});nodes(view.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
   const next=view.updated();assert.equal(next.result.status,'calculated');assert.equal(next.cost.points.at(-1).runRateCents,cents);
   const html=renderToStaticMarkup(worksheet(next).tree);assert.ok(html.includes(expected));assert.match(html,/USD\/month/);assert.match(html,/not actual pay, cumulative spend or savings/);assert.ok(html.indexOf('Work needed and time available')<html.indexOf('Contracted supply cost estimate'));
  }
 }finally{if(previous===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previous;}
});

test('worksheet labels separate contracted time, productive hours and monthly cost',()=>{
 const html=renderToStaticMarkup(worksheet().tree);
 for(const text of ['Contracted time at start (FTE)','Productive hours per FTE / month','Assume each person joining or leaving accounts for 1 FTE','with no transfers','People leave before new hires join; new hires contribute for the full month','Estimated monthly workforce cost - final month','not actual pay, cumulative spend or savings'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/Positive gap = shortfall; negative gap = surplus/g)||[]).length,1);
 assert.doesNotMatch(html,/Supply run-rate|Final-month contracted supply run-rate/);
});
test('role FTE labels retain full-time guidance, bounds and unknown input instructions',()=>{
 const {SwpDemandEditor}=component('components/swp-demand-editor.tsx',{'@/lib/swp-demand':demand,'@/lib/swp-demand-editor':demandEditor});
 const context={conversationMode:demand.SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'copy-fixture',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1};
 const review=demand.illustrativeServiceReview(context,'2026-10-08T12:00:00Z'),before=structuredClone(review);
 const html=renderToStaticMarkup(React.createElement(SwpDemandEditor,{review,disabled:false,onReview:()=>{},onCancel:()=>{}}));
 for(const label of ['FTE per current role','FTE per new role'])assert.match(html,new RegExp(label+'<input[^>]*min="0" max="1"'));
 assert.equal((html.match(/Use 1 for full-time or 0.5 for half-time/g)||[]).length,2);
 assert.match(html,/Leave unknown inputs blank/);assert.match(html,/Whole planning period/);assert.deepEqual(review,before);
});


test('calculation live feedback excludes changing tables and retains an empty alert before errors',()=>{
 for(const input of [session,{...session,result:null,draft:{...draft,confirmed:false}},{...session,result:null,error:'Contracted FTE exceeds people.'}]){
  const tree=worksheet(input).tree,all=nodes(tree);
  const feedback=all.find(n=>n.props['aria-label']==='Capacity calculation feedback');
  assert.equal(feedback.props.tabIndex,-1);assert.equal(feedback.props['aria-live'],undefined);
  const live=all.filter(n=>['status','alert'].includes(n.props.role));
  assert.equal(live.length,2);
  for(const region of live){assert.equal(region.props['aria-atomic'],'true');assert(!nodes(region).some(n=>['table','details'].includes(n.type)));}
  const alert=live.find(n=>n.props.role==='alert'),status=live.find(n=>n.props.role==='status');
  assert.equal(alert.props.children,input.error);
  assert.match(status.props.children,input.error?/^$/:input.result?/Calculated from your assumptions/:/Preview.*Confirm and calculate/);
 }
});
