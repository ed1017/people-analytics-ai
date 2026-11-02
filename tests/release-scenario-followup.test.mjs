import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createSwpDemo,swpDemoField} from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {bundleInputKey} from '../releases/2026-10-21/source/lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../releases/2026-10-21/source/lib/local-decisions.ts';
import {scenarioChatField,scenarioChatReceipt,readScenarioChatReceipt} from '../releases/2026-10-21/source/lib/scenario-chat-continuity.ts';
const app=fileURLToPath(new URL('../releases/2026-10-21/source/',import.meta.url));
const require=createRequire(path.join(app,'package.json')),ts=require('typescript'),React=require('react');
const at='2026-10-16T12:00:00Z';
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function context(store){return {datasetToken:store.getDatasetToken(),ownerGoalId:'',discussionKey:'scope-a',savedSignature:'null'};}
function harness(store,problemPort=null){
 const hooks=[];let cursor=0,dirty=false,layouts=[],effects=[],tree;
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));
 const hookEffect=(queue,fn,deps)=>{const i=cursor++,old=hooks[i];if(!old||changed(old.deps,deps)){hooks[i]={deps,cleanup:old?.cleanup};queue.push(()=>{old?.cleanup?.();hooks[i].cleanup=fn();});}};
 const react={...React,useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{const next=typeof value==='function'?value(hooks[i]):value;if(!Object.is(next,hooks[i])){hooks[i]=next;dirty=true;}}];},useRef(value){const i=cursor++;return hooks[i]??(hooks[i]={current:value});},useEffect(fn,deps){hookEffect(effects,fn,deps);},useLayoutEffect(fn,deps){hookEffect(layouts,fn,deps);},useEffectEvent(fn){const ref=this.useRef(fn);ref.current=fn;const stable=this.useRef((...args)=>ref.current(...args));return stable.current;}};
 // Destructured hooks cannot rely on React's receiver.
 react.useEffectEvent=fn=>{const ref=react.useRef(fn);ref.current=fn;const stable=react.useRef((...args)=>ref.current(...args));return stable.current;};
 const conversation={activeGoalId:'',focusedIssue:'',resetEpoch:0,messages:[],continueGuidedConversation(){},beginGuidedExploration(){},endGuidedExploration(){},setMessages(update){this.messages=update(this.messages);},setInput(){},selectProposalGoal(goal,revision,fields){store.commitGoalSelection(goal.id,goal.statement,revision,new Date().toISOString(),()=>fields,true);this.activeGoalId=goal.id;this.focusedIssue=goal.statement;}};
 const props={conversation,active:true,busy:false,discussionKey:'scope-a',sources:[],onNavigate(){},scenarioTarget:{},commandRef:{current:null},modelContextRef:{current:null},demandControlRef:{current:null},demandReviewRef:{current:null},demandContextRef:{current:null}};
 const module={exports:{}};
 const load=name=>{if(name==='react')return react;if(name==='react-dom')return {createPortal:child=>child};if(name==='./decision-store'||name==='@/components/decision-store')return {decisionStore:store,useDecisionStorage:()=>store.getSnapshot(),consumeFirstHomeVisit:()=>false};if(name==='./use-pending-request'){const pending={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(app,'components/use-pending-request.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',code)(pending,pending.exports,load);return pending.exports;}if(name.startsWith('@/lib/'))return require(path.join(app,name.slice(2)+'.ts'));if(name==='react/jsx-runtime')return require(name);return new Proxy({}, {get:(_,key)=>String(key)});};
 const code=ts.transpileModule(fs.readFileSync(path.join(app,problemPort?'components/problem-conversation.tsx':'components/swp-guided-journey.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require','requestAnimationFrame','document','localStorage','sessionStorage','window',code)(module,module.exports,load,fn=>fn(),{querySelector:()=>null},problemPort,storage(),{addEventListener(){},removeEventListener(){}});
 function render(){let rounds=0;do{dirty=false;cursor=0;layouts=[];effects=[];tree=problemPort?module.exports.useProblemConversation():module.exports.SwpGuidedJourney(props);layouts.forEach(fn=>fn());effects.forEach(fn=>fn());assert.ok(++rounds<30,'hooks must settle');}while(dirty);return tree;}
 function nodes(node){return Array.isArray(node)?node.flatMap(n=>nodes(n)):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];}
 async function settle(){for(let i=0;i<12;i++){render();await new Promise(resolve=>setImmediate(resolve));}render();}
 return {props,render,settle,nodes,find:type=>nodes(tree).find(n=>n.type===type),button:text=>nodes(tree).find(n=>n.type==='button'&&n.props.children===text)};
}
test('receipt validation binds exact dataset, discussion, goal and saved revision; serialized round trip preserves draft',async()=>{
 const store=new DecisionStore();store.initialize(storage());const draft=await createSwpDemo('guided-followup',at),ctx=context(store),receipt=scenarioChatReceipt(draft,ctx,'candidate-a');
 assert.deepEqual(readScenarioChatReceipt(JSON.parse(JSON.stringify(receipt)),ctx),receipt);
 for(const key of ['datasetToken','discussionKey','ownerGoalId','savedSignature'])assert.equal(readScenarioChatReceipt(receipt,{...ctx,[key]:'different'}),null,key);
 for(const bad of [{...receipt,version:2},{...receipt,extra:true},{...receipt,inputKey:'tampered'},{...receipt,selectedCandidateId:5}])assert.equal(readScenarioChatReceipt(bad,ctx),null);
 const altered=structuredClone(receipt);altered.draft.inputs.budget.amount.value=1;assert.equal(readScenarioChatReceipt(altered,ctx),null);
 const clone=readScenarioChatReceipt(receipt,ctx);clone.draft.revision++;assert.equal(receipt.draft.revision,draft.revision);
 const wrongGoal={...ctx,ownerGoalId:'different'};assert.equal(readScenarioChatReceipt({...receipt,...wrongGoal},wrongGoal),null);
});
test('real component Continue and ordinary follow-ups retain exact draft; reviewed edits, reload and reset are isolated',async()=>{
 const priorFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Provider/network calls prohibited');};
 try{
 const port=storage(),store=new DecisionStore();store.initialize(port);const draft=await createSwpDemo('guided-followup',at),ctx=context(store);
 store.commitExplorationFields(store.getSnapshot().data.revision,at,()=>({[scenarioChatField]:scenarioChatReceipt(draft,ctx,null)}));
 const h=harness(store);await h.settle();
 h.button('Resume planning scenario').props.onClick();await h.settle();
 const simple=h.find('SimpleSwpDemo');assert.ok(simple);const option=simple.props.comparison.options[0];simple.props.onSelect(option.id);h.render();
 const continueButton=h.button('Continue this scenario in chat');assert.ok(continueButton&&!continueButton.props.disabled);continueButton.props.onClick();await h.settle();
 assert.ok(h.props.modelContextRef.current?.inputKey, JSON.stringify(h.nodes(h.render()).filter(n=>n.props?.role==='status').map(n=>n.props.children)));let before=structuredClone(h.props.modelContextRef.current);assert.equal(before.inputKey,bundleInputKey(draft));assert.equal(before.selectedCandidateId,option.id);
 for(const question of ['What about backfill?','What if attrition increases?']){assert.equal(await h.props.commandRef.current(question),null);h.render();assert.deepEqual(h.props.modelContextRef.current,before);}
 assert.match(await h.props.commandRef.current('Set budget to 100000'),/review/i);h.render();assert.equal(h.props.modelContextRef.current.inputKey,before.inputKey);h.find('SimpleSwpDemo').props.onCancel();h.render();assert.equal(h.props.modelContextRef.current.inputKey,before.inputKey);
 await h.props.commandRef.current('Set budget to 100000');h.render();h.find('SimpleSwpDemo').props.onAccept();await h.settle();before=structuredClone(h.props.modelContextRef.current);assert.notEqual(before.inputKey,bundleInputKey(draft));assert.equal(before.draft.inputs.budget.amount.value,100000);assert.equal(before.selectedCandidateId,null);
 const reopened=new DecisionStore();reopened.initialize(port);const restored=harness(reopened);await restored.settle();assert.equal(restored.props.modelContextRef.current.inputKey,before.inputKey);assert.deepEqual(restored.props.modelContextRef.current.draft,before.draft);
 const otherGoal=harness(reopened);await otherGoal.settle();otherGoal.props.conversation.activeGoalId='other-goal';otherGoal.props.conversation.focusedIssue='Different decision';otherGoal.render();assert.equal(otherGoal.props.modelContextRef.current,null);assert.equal(await otherGoal.props.commandRef.current('What if attrition increases?'),null);
 const changedSaved=new DecisionStore();changedSaved.initialize(port);const savedView=harness(changedSaved);await savedView.settle();changedSaved.setField('',swpDemoField,{version:999});savedView.render();assert.equal(savedView.props.modelContextRef.current,null,'changed saved revision must retire old chat receipt');
 restored.props.discussionKey='scope-b';restored.render();assert.equal(restored.props.modelContextRef.current,null);assert.equal(await restored.props.commandRef.current('What about backfill?'),null);
 h.props.conversation.resetEpoch++;h.render();assert.equal(h.props.modelContextRef.current,null);assert.equal(await h.props.commandRef.current('What about backfill?'),null);
 }finally{globalThis.fetch=priorFetch;}
});

test('empty workspace renders safely; continued scenario saves receipt and reviewed plan atomically',async()=>{
 const port=storage(),store=new DecisionStore();store.initialize(port);const empty=harness(store);empty.render();assert.equal(empty.props.modelContextRef.current,null);assert.equal(await empty.props.commandRef.current('What about backfill?'),null);
 const draft=await createSwpDemo('guided-save-followup',at);store.commitExplorationFields(store.getSnapshot().data.revision,at,()=>({[scenarioChatField]:scenarioChatReceipt(draft,context(store),null)}));
 const h=harness(store);await h.settle();assert.ok(h.props.modelContextRef.current.draft);
 const option=h.find('SimpleSwpDemo').props.comparison.options.find(o=>o.candidate.status==='met');assert.ok(option);h.find('SimpleSwpDemo').props.onSelect(option.id);h.render();h.find('SimpleSwpDemo').props.onPrepare();await h.settle();
 const save=h.button('Save reviewed plan and goal');assert.ok(save&&!save.props.disabled);save.props.onClick();await h.settle();
 const snapshot=store.getSnapshot();assert.equal(snapshot.data.goals.activeId,draft.binding.goalId);assert.ok(snapshot.data.workspaces[draft.binding.goalId].fields[swpDemoField]);assert.equal(snapshot.data.workspaces[draft.binding.goalId].fields[scenarioChatField],null);
 const reopened=new DecisionStore();reopened.initialize(port);assert.deepEqual(reopened.getSnapshot().data.workspaces[draft.binding.goalId],snapshot.data.workspaces[draft.binding.goalId]);
});

test('hydration and receipt-only backup replacement restore current inputs without changing owner or saved revision',async()=>{
 const port=storage(),writer=new DecisionStore();writer.initialize(port);const draft=await createSwpDemo('guided-hydration',at);
 writer.commitExplorationFields(writer.getSnapshot().data.revision,at,()=>({[scenarioChatField]:scenarioChatReceipt(draft,context(writer),null)}));
 const store=new DecisionStore(),h=harness(store);h.render();assert.equal(h.props.modelContextRef.current,null);store.initialize(port);await h.settle();assert.equal(h.props.modelContextRef.current.inputKey,bundleInputKey(draft));
 const {previewBundleChatEdit,acceptBundleChatEdit}=await import('../releases/2026-10-21/source/lib/home-bundle-chat-edit.ts');const changed=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 200000'));
 const original=store.getSnapshot().data,backup=structuredClone(original);backup.exploration.fields[scenarioChatField]=scenarioChatReceipt(changed,context(store),null);
 store.restoreBackup(backup,store.getDatasetToken(),original.revision,JSON.stringify(original));await h.settle();assert.equal(h.props.modelContextRef.current.inputKey,bundleInputKey(changed));assert.equal(h.props.modelContextRef.current.draft.inputs.budget.amount.value,200000);
});
test('actual problem hook clears only current receipt before reset/new problem and preserves it when storage fails',async()=>{
 for(const command of ['resetConversation','startNewProblem'])for(const fail of [false,true]){
  const base=storage();let deny=false;const port={...base,setItem(k,v){if(deny)throw Error('Quota denied');base.setItem(k,v);}};const store=new DecisionStore();store.initialize(port);const draft=await createSwpDemo('guided-hook',at),ctx={...context(store),ownerGoalId:draft.binding.goalId};
  store.commitGoalSelection(draft.binding.goalId,draft.binding.goal,store.getSnapshot().data.revision,at,()=>({[scenarioChatField]:scenarioChatReceipt(draft,ctx,null),unrelated:{kept:true}}),true);
  const h=harness(store,port);let conversation=h.render();assert.equal(conversation.activeGoalId,draft.binding.goalId);assert.ok(conversation.storageReady);const before=structuredClone(store.getSnapshot().data);deny=fail;conversation[command]();conversation=h.render();
  if(fail){assert.equal(conversation.activeGoalId,draft.binding.goalId);assert.equal(conversation.resetEpoch,0);assert.ok(conversation.error);assert.deepEqual(store.getSnapshot().data,before);}
  else{assert.equal(conversation.activeGoalId,'');assert.equal(conversation.resetEpoch,1);assert.equal(store.getSnapshot().data.workspaces[draft.binding.goalId].fields[scenarioChatField],null);assert.deepEqual(store.getSnapshot().data.workspaces[draft.binding.goalId].fields.unrelated,{kept:true});}
  deny=false;const reopened=new DecisionStore();reopened.initialize(port);assert.deepEqual(reopened.getSnapshot().data.workspaces[draft.binding.goalId].fields[scenarioChatField],fail?before.workspaces[draft.binding.goalId].fields[scenarioChatField]:null);
 }
});
