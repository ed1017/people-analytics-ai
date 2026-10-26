import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as onboarding from '../lib/home-onboarding.ts';
const require=createRequire(import.meta.url);
const empty={getItem:()=>null},token='workforce-demo-9037-public-aggregates-v4:5';
test('first visit honors old dismissal and exact dataset decisions/recovery without changing storage',()=>{
 assert.equal(onboarding.isFirstHomeVisit(empty,empty,token),true);
 for(const key of [onboarding.HOME_INSTRUCTIONS_DISMISSED_KEY,'insights-to-action.decisions.v1','insights-to-action.decisions.v1.dataset.'+token])assert.equal(onboarding.isFirstHomeVisit({getItem:k=>k===key?'{}':null},empty,token),false);
 assert.equal(onboarding.isFirstHomeVisit(empty,{getItem:k=>k==='insights-to-action.decisions.recovery.v1.dataset.'+token?'{}':null},token),false);
 assert.equal(onboarding.isFirstHomeVisit({getItem:()=>{throw Error('blocked');}},empty,token),false);
});
function nodes(tree){const out=[];function walk(n){if(!n||typeof n!=='object')return;out.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return out;}
function harness(initial={}){
 let cursor=0,props={busy:false,active:true,ready:true,autoOpen:true,dismissKey:'one',onNavigate:()=>{},onStartDemo:()=>{starts++;},...initial},starts=0,focus='',writes=[],listeners={},current;
 const states=[],refs=[],deps=[],effects=[];
 const fallback={focus:()=>{focus='fallback';}},title={focus:()=>{focus='title';}},trigger={getClientRects:()=>[],focus:()=>{focus='trigger';}};
 const native={open:false,shown:0,showModal(){this.open=true;this.shown++;},close(){if(this.open){this.open=false;nodes(current).find(n=>n.type==='dialog').props.onClose();}}};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/home-getting-started.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 const document={body:{},activeElement:null,querySelector:()=>fallback};
 vm.runInNewContext(source,{exports,document,localStorage:{setItem:(...args)=>{if(props.storageFails)throw Error('blocked');writes.push(args);}},window:{addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}},require:name=>name==='react'?{...React,useCallback:fn=>fn,useId:()=>':intro:',useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef:value=>{const i=cursor++;return refs[i]??(refs[i]={current:value});},useEffect:(effect,next)=>{const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push(effect);}}}:name==='react-dom'?{createPortal:x=>x}:name==='@/lib/home-onboarding'?onboarding:require(name)});
 const render=()=>{cursor=0;current=exports.HomeGettingStarted(props);for(const n of nodes(current)){if(n.type==='dialog')n.props.ref.current=native;if(n.type==='h2')n.props.ref.current=title;if(n.type==='button'&&n.props.ref)n.props.ref.current=trigger;}return current;};
 const flush=(next={})=>{props={...props,...next};render();for(const e of effects.splice(0))e();return render();};
 const button=text=>nodes(current).find(n=>n.type==='button'&&n.props.children===text);
 return {flush,button,native,get starts(){return starts;},get focus(){return focus;},writes,dialog:()=>nodes(current).find(n=>n.type==='dialog'),listeners};
}
test('first visit waits for safe active readiness, opens once, dismisses and reopens explicitly',()=>{
 const h=harness({ready:false});h.flush();assert.equal(h.native.shown,0);h.flush({ready:true,busy:true});assert.equal(h.native.shown,0);
 h.flush({busy:false});assert.equal(h.native.shown,1);assert.equal(h.focus,'title');h.flush();assert.equal(h.native.shown,1);
 h.button('Explore on my own').props.onClick();h.flush();assert.equal(h.native.open,false);assert.equal(h.focus,'fallback');assert.deepEqual(h.writes,[[onboarding.HOME_INSTRUCTIONS_DISMISSED_KEY,'1']]);assert.equal(h.starts,0);
 h.button('About Workforce Intelligence').props.onClick();h.flush();assert.equal(h.native.shown,2);h.dialog().props.onCancel({preventDefault(){}});h.flush();assert.equal(h.native.open,false);
});
test('launch is explicit and single-shot, disabled state cannot start, storage failure cannot trap dismissal',()=>{
 const h=harness({demoReady:false,storageFails:true});h.flush();h.button('Start guided demo').props.onClick();assert.equal(h.starts,0);assert.equal(h.native.open,true);
 h.flush({demoReady:true});const start=h.button('Start guided demo');start.props.onClick();start.props.onClick();h.flush();assert.equal(h.starts,1);assert.equal(h.native.open,false);
 h.button('About Workforce Intelligence').props.onClick();h.flush();h.button('Explore on my own').props.onClick();h.flush();assert.equal(h.native.open,false);
 h.button('About Workforce Intelligence').props.onClick();h.flush();const resume=h.button('Start guided demo');resume.props.onClick();resume.props.onClick();h.flush();assert.equal(h.starts,2,'an explicit immediate reopen permits one new launch, not two');
});
test('context interruption closes without opening a demo or stealing focus',()=>{
 const h=harness();h.flush();h.flush({active:false,dismissKey:'two'});assert.equal(h.native.open,false);assert.equal(h.starts,0);assert.equal(h.writes.length,0);
 h.flush({active:true});assert.equal(h.native.shown,1);
});
test('orientation is compact and about link preserves current tab; demo entry cannot fall through to provider',()=>{
 const h=harness();const tree=h.flush(),all=nodes(tree);const about=all.find(n=>n.type==='a');assert.equal(about.props.href,'/about');assert.equal(about.props.target,'_blank');assert.match(about.props.rel,/noopener/);
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');assert.ok(source.includes('onStartDemo={startIntroDemo}'));
 assert.ok(source.includes("if(message===swpDemoPrompt){setChatError('The planning scenario is not ready."));
});
import * as localDecisions from '../lib/local-decisions.ts';
import * as datasetIdentity from '../lib/dataset-identity.mjs';
function hydratedStore(localEntries=[],sessionEntries=[]){
 const local=new Map(localEntries),session=new Map(sessionEntries),storage=map=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}),localStorage=storage(local),sessionStorage=storage(session),exports={};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/decision-store.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,window:{},localStorage,sessionStorage,require:name=>name==='@/lib/local-decisions'?localDecisions:name==='@/lib/dataset-identity.mjs'?datasetIdentity:name==='@/lib/home-onboarding'?onboarding:require(name)});
 return {api:exports,local,session};
}
test('actual dataset initialization preserves fresh first-visit observation, consumes it once and respects existing data',()=>{
 const fresh=hydratedStore();fresh.api.switchDecisionDataset(token);
 assert.ok(fresh.local.has(localDecisions.datasetDecisionKey(token)),'real initialize writes an envelope before Home mounts');
 assert.equal(onboarding.isFirstHomeVisit({getItem:key=>fresh.local.get(key)??null},empty,token),false,'post-hydration check alone reproduces the bug');
 assert.equal(fresh.api.consumeFirstHomeVisit(),true);assert.equal(fresh.api.consumeFirstHomeVisit(),false,'remount is existing use');
 const switched=hydratedStore();switched.api.switchDecisionDataset(token);switched.api.switchDecisionDataset(token.replace(":5",":6"));assert.equal(switched.api.consumeFirstHomeVisit(),false,"switching datasets cannot reuse the initial observation");
 const returning=hydratedStore([...fresh.local]);returning.api.switchDecisionDataset(token);assert.equal(returning.api.consumeFirstHomeVisit(),false);
 const dismissed=hydratedStore();dismissed.api.switchDecisionDataset(token);dismissed.local.set(onboarding.HOME_INSTRUCTIONS_DISMISSED_KEY,'1');assert.equal(dismissed.api.consumeFirstHomeVisit(),false);
 const recovery=hydratedStore([],[['insights-to-action.decisions.recovery.v1.dataset.'+token,'{}']]);recovery.api.switchDecisionDataset(token);assert.equal(recovery.api.consumeFirstHomeVisit(),false);
});

test('explicit intro resume releases only local demo debounce and retains shared duplicate guards',()=>{
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');
 const body=source.match(/function startIntroDemo\(\)\{([\s\S]*?)\n  \}/)[1];
 const recentSuggestions={current:new Set(['starter:demo','question:other'])};let launches=0;
 const run=new Function('recentSuggestions','swpDemoPrompt','submitStarterQuestion',body);
 run(recentSuggestions,'demo',prompt=>{assert.equal(prompt,'demo');assert.equal(recentSuggestions.current.has('starter:demo'),false);launches++;});
 assert.equal(launches,1);assert.equal(recentSuggestions.current.has('question:other'),true);
 assert.match(source,/queuedSuggestion.current\|\|chatLoading\|\|sending.current/);
 assert.match(source,/if\(!allowSuggestion\(key,allowDraft\)\)return/);
});
