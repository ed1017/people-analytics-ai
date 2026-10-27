import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as onboarding from '../lib/home-onboarding.ts';
import {lockIntroPageScroll} from '../lib/intro-scroll-lock.ts';
const require=createRequire(import.meta.url);
const empty={getItem:()=>null},token='workforce-demo-9037-public-aggregates-v4:5';
test('only explicit opt-out suppresses a new load; legacy dismissal and saved state do not',()=>{
 assert.equal(onboarding.isFirstHomeVisit(empty,empty,token),true);
 assert.equal(onboarding.isFirstHomeVisit({getItem:k=>k===onboarding.HOME_INTRO_OPT_OUT_KEY?'1':null},empty,token),false);
 for(const key of [onboarding.HOME_INSTRUCTIONS_DISMISSED_KEY,'insights-to-action.decisions.v1','insights-to-action.decisions.v1.dataset.'+token,'insights-to-action.goals.v1','people-analytics.saved-workforce-scenarios.v1'])assert.equal(onboarding.isFirstHomeVisit({getItem:k=>k===key?'{}':null},empty,token),true);
 assert.equal(onboarding.isFirstHomeVisit(empty,{getItem:k=>k==='insights-to-action.decisions.recovery.v1.dataset.'+token?'{}':null},token),true);
 assert.equal(onboarding.isFirstHomeVisit({getItem:()=>{throw Error('blocked');}},empty,token),true);
});
function nodes(tree){const out=[];function walk(n){if(!n||typeof n!=='object')return;out.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return out;}
function harness(initial={}){
 let cursor=0,props={busy:false,active:true,ready:true,autoOpen:true,dismissKey:'one',onNavigate:()=>{},onStartDemo:()=>{starts++;},...initial},starts=0,focus='',writes=[],listeners={},current;
 const states=[],refs=[],deps=[],effects=[],cleanups=[],storage=new Map(initial.storedOptOut?[[onboarding.HOME_INTRO_OPT_OUT_KEY,'1']]:[]);
 const fallback={focus:()=>{focus='fallback';}},title={focus:()=>{focus='title';}},trigger={getClientRects:()=>[],focus:()=>{focus='trigger';}};
 const native={open:false,shown:0,showModal(){this.open=true;this.shown++;},close(){if(this.open){this.open=false;nodes(current).find(n=>n.type==='dialog').props.onClose();}}};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/home-getting-started.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 const style=()=>{const values=new Map();return {getPropertyValue:key=>values.get(key)?.value??'',getPropertyPriority:key=>values.get(key)?.priority??'',setProperty:(key,value,priority='')=>values.set(key,{value,priority}),removeProperty:key=>values.delete(key)};};
 const document={documentElement:{style:style()},body:{style:style()},activeElement:null,querySelector:()=>fallback};
 vm.runInNewContext(source,{exports,document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(...args)=>{if(props.storageFails)throw Error('blocked');storage.set(...args);writes.push(args);},removeItem:key=>{if(props.storageFails)throw Error('blocked');storage.delete(key);writes.push([key,null]);}},window:{addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}},require:name=>name==='react'?{...React,useCallback:fn=>fn,useId:()=>':intro:',useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef:value=>{const i=cursor++;return refs[i]??(refs[i]={current:value});},useEffect:(effect,next)=>{const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push(()=>{cleanups[i]?.();cleanups[i]=effect();});}}}:name==='react-dom'?{createPortal:x=>x}:name==='@/lib/home-onboarding'?onboarding:name==='@/lib/intro-scroll-lock'?{lockIntroPageScroll}:require(name)});
 const render=()=>{cursor=0;current=exports.HomeGettingStarted(props);for(const n of nodes(current)){if(n.type==='dialog')n.props.ref.current=native;if(n.type==='h2')n.props.ref.current=title;if(n.type==='button'&&n.props.ref)n.props.ref.current=trigger;}return current;};
 const flush=(next={})=>{props={...props,...next};render();for(const e of effects.splice(0))e();return render();};
 const button=text=>nodes(current).find(n=>n.type==='button'&&n.props.children===text);
 return {document,flush,unmount:()=>cleanups.forEach(cleanup=>cleanup?.()),button,checkbox:()=>nodes(current).find(n=>n.type==='input'&&n.props.type==='checkbox'),native,get starts(){return starts;},get focus(){return focus;},writes,dialog:()=>nodes(current).find(n=>n.type==='dialog'),listeners};
}
test('first visit waits for safe active readiness, opens once, dismisses and reopens explicitly',()=>{
 const h=harness({ready:false});h.flush();assert.equal(h.native.shown,0);h.flush({ready:true,busy:true});assert.equal(h.native.shown,0);
 h.flush({busy:false});assert.equal(h.native.shown,1);assert.equal(h.focus,'title');h.flush();assert.equal(h.native.shown,1);
 h.button('Explore on my own').props.onClick();h.flush();assert.equal(h.native.open,false);assert.equal(h.focus,'fallback');assert.deepEqual(h.writes,[]);assert.equal(h.starts,0);
 h.button('Introduction').props.onClick();h.flush();assert.equal(h.native.shown,2);h.dialog().props.onCancel({preventDefault(){}});h.flush();assert.equal(h.native.open,false);
});
test('launch is explicit and single-shot, disabled state cannot start, storage failure cannot trap dismissal',()=>{
 const h=harness({demoReady:false,storageFails:true});h.flush();h.button('Start guided demo').props.onClick();assert.equal(h.starts,0);assert.equal(h.native.open,true);
 h.flush({demoReady:true});const start=h.button('Start guided demo');start.props.onClick();start.props.onClick();h.flush();assert.equal(h.starts,1);assert.equal(h.native.open,false);
 h.button('Introduction').props.onClick();h.flush();h.button('Explore on my own').props.onClick();h.flush();assert.equal(h.native.open,false);
 h.button('Introduction').props.onClick();h.flush();const resume=h.button('Start guided demo');resume.props.onClick();resume.props.onClick();h.flush();assert.equal(h.starts,2,'an explicit immediate reopen permits one new launch, not two');
});
test('context interruption closes without opening a demo or stealing focus',()=>{
 const h=harness();h.flush();h.flush({active:false,dismissKey:'two'});assert.equal(h.native.open,false);assert.equal(h.starts,0);assert.equal(h.writes.length,0);
 h.flush({active:true});assert.equal(h.native.shown,1);
});
test('orientation about link preserves current tab; demo entry cannot fall through to provider',()=>{
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
 assert.equal(onboarding.isFirstHomeVisit({getItem:key=>fresh.local.get(key)??null},empty,token),true,'hydration does not mean introduction was seen');
 assert.equal(fresh.api.consumeFirstHomeVisit(),true);assert.equal(fresh.api.consumeFirstHomeVisit(),false,'remount is existing use');
 const switched=hydratedStore();switched.api.switchDecisionDataset(token);switched.api.switchDecisionDataset(token.replace(":5",":6"));assert.equal(switched.api.consumeFirstHomeVisit(),false,"switching datasets cannot reuse the initial observation");
 const returning=hydratedStore([...fresh.local]);returning.api.switchDecisionDataset(token);assert.equal(returning.api.consumeFirstHomeVisit(),true);
 const dismissed=hydratedStore();dismissed.api.switchDecisionDataset(token);dismissed.local.set(onboarding.HOME_INTRO_OPT_OUT_KEY,'1');assert.equal(dismissed.api.consumeFirstHomeVisit(),false);
 const recovery=hydratedStore([],[['insights-to-action.decisions.recovery.v1.dataset.'+token,'{}']]);recovery.api.switchDecisionDataset(token);assert.equal(recovery.api.consumeFirstHomeVisit(),true);
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
 assert.doesNotMatch(source,/>Planning Scenario<\/button>/);
 assert.ok(source.includes('onStartDemo={startIntroDemo}'));
 const intro=fs.readFileSync(new URL('../components/home-getting-started.tsx',import.meta.url),'utf8');assert.match(intro,/data-orientation-return[\s\S]*?onClick=\{show\}/);
});
test('product introduction keeps neutral attribution and keyboard-scrollable content separate from persistent actions',()=>{
 const h=harness(),all=nodes(h.flush()),region=all.find(n=>n.props?.role==='region'),header=all.find(n=>n.type==='header');
 assert.equal(region.props.tabIndex,0);assert.match(region.props.className,/overflow-y-auto/);assert.match(header.props.className,/shrink-0/);
 const headings=all.filter(n=>n.type==='h3').map(n=>n.props.children);
 assert.deepEqual(headings,['Purpose of the project','What you can do','Try a planning decision','How to read the results','Project development','Contact Ed Om']);
 assert.equal(nodes(header).filter(n=>n.type==='button').length,2);
 const source=fs.readFileSync(new URL('../components/home-getting-started.tsx',import.meta.url),'utf8');assert.match(source,/\[tabindex="0"\]/);assert.match(source,/AI assisted with implementation, design and testing/);
 assert.doesNotMatch(source,/Developed by Ed Om|Ed Om defined/);
 assert.match(source,/Product design focused on workforce decisions and practical tradeoffs/);
 assert.equal(region.props['aria-label'],'About Workforce Intelligence');
 assert.ok(all.some(n=>n.type==='h2'&&n.props.children==='Workforce Intelligence'));
 assert.ok(all.some(n=>n.type==='a'&&n.props.href==='/about'));
});

test('top actions precede scroll region, verified contacts wrap, and focus wraps in DOM order',()=>{
 const h=harness(),all=nodes(h.flush()),dialog=h.dialog(),region=all.find(n=>n.props?.role==='region'),start=h.button('Start guided demo');
 assert.ok(all.indexOf(start)<all.indexOf(region));assert.match(dialog.props.className,/max-w-4xl/);
 const links=all.filter(n=>n.type==='a'),email=links.find(n=>n.props.href==='mailto:edwinom.nyc@gmail.com'),linkedin=links.find(n=>n.props.href==='https://www.linkedin.com/in/ed-om-62a57818');
 assert.ok(email);assert.match(nodes(email).find(n=>n.type==='span').props.className,/break-all/);assert.equal(linkedin.props.target,'_blank');assert.match(linkedin.props.rel,/noopener/);
 let focused='',prevented=false;const first={focus:()=>focused='start'},last={focus:()=>focused='linkedin'},currentTarget={querySelectorAll:()=>[first,last]};
 h.document.activeElement=last;dialog.props.onKeyDown({key:'Tab',shiftKey:false,currentTarget,preventDefault(){prevented=true;}});assert.equal(focused,'start');assert.equal(prevented,true);
 h.document.activeElement=first;dialog.props.onKeyDown({key:'Tab',shiftKey:true,currentTarget,preventDefault(){}});assert.equal(focused,'linkedin');
});


test('blocking recovery defers introduction, then opens once without repeated navigation',()=>{
 const h=harness({deferAutoOpen:true});h.flush();assert.equal(h.native.shown,0);
 h.flush({deferAutoOpen:false});assert.equal(h.native.shown,1);
 h.button('Explore on my own').props.onClick();h.flush({active:false});h.flush({active:true});assert.equal(h.native.shown,1);
 assert.deepEqual(h.writes,[]);
});
test('checkbox persists both directions without closing and reflects opt-out on reopen',()=>{
 const h=harness();h.flush();assert.equal(h.checkbox().props.checked,false);
 h.checkbox().props.onChange({currentTarget:{checked:true}});h.flush();assert.equal(h.native.open,true);assert.equal(h.checkbox().props.checked,true);
 assert.deepEqual(h.writes,[[onboarding.HOME_INTRO_OPT_OUT_KEY,'1']]);
 h.button('Explore on my own').props.onClick();h.flush({autoOpen:false});h.button('Introduction').props.onClick();h.flush();assert.equal(h.checkbox().props.checked,true);
 h.checkbox().props.onChange({currentTarget:{checked:false}});h.flush();assert.equal(h.native.open,true);assert.equal(h.checkbox().props.checked,false);
 assert.deepEqual(h.writes.at(-1),[onboarding.HOME_INTRO_OPT_OUT_KEY,null]);
 const opted=harness({autoOpen:false,storedOptOut:true});opted.flush();opted.button('Introduction').props.onClick();opted.flush();assert.equal(opted.checkbox().props.checked,true);
});
test('checkbox has a matching label and participates in modal focus; cross-tab preference does not close it',()=>{
 const h=harness(),all=nodes(h.flush());assert.ok(all.some(n=>n.type==='label'&&n.props.htmlFor===h.checkbox().props.id));
 const source=fs.readFileSync(new URL('../components/home-getting-started.tsx',import.meta.url),'utf8');assert.match(source,/input:not\(:disabled\)/);
 h.listeners.storage({key:onboarding.HOME_INTRO_OPT_OUT_KEY,newValue:'1'});h.flush();assert.equal(h.checkbox().props.checked,true);assert.equal(h.native.open,true);
 h.listeners.storage({key:onboarding.HOME_INTRO_OPT_OUT_KEY,newValue:null});h.flush();assert.equal(h.checkbox().props.checked,false);assert.equal(h.native.open,true);
});
test('ordinary dismissal, Escape, backdrop and demo launch never write an opt-out',()=>{
 for(const action of ['close','escape','backdrop','demo']){
  const h=harness();h.flush();
  if(action==='close')h.button('Explore on my own').props.onClick();
  if(action==='escape')h.dialog().props.onCancel({preventDefault(){}});
  if(action==='backdrop'){const target={getBoundingClientRect:()=>({left:10,right:90,top:10,bottom:90})};h.dialog().props.onClick({target,currentTarget:target,clientX:1,clientY:1});}
  if(action==='demo')h.button('Start guided demo').props.onClick();
  h.flush();assert.equal(h.native.open,false,action);assert.deepEqual(h.writes,[],action);
  const nextLoad=harness();nextLoad.flush();assert.equal(nextLoad.native.open,true,action+' next load');
 }
});
test('failed opt-out is reported without trapping ordinary close',()=>{
 const h=harness({storageFails:true});h.flush();h.checkbox().props.onChange({currentTarget:{checked:true}});const tree=h.flush();assert.equal(h.checkbox().props.checked,false);
 assert.equal(h.native.open,true);assert.ok(nodes(tree).some(n=>n.props?.role==='alert'));assert.deepEqual(h.writes,[]);
 h.button('Explore on my own').props.onClick();h.flush();assert.equal(h.native.open,false);
});
test('manual open during recovery consumes automatic opportunity without changing work',()=>{
 const h=harness({deferAutoOpen:true});h.flush();h.button('Introduction').props.onClick();h.flush();
 h.button('Explore on my own').props.onClick();h.flush({deferAutoOpen:false});assert.equal(h.native.shown,1);assert.deepEqual(h.writes,[]);
});
test('introduction control remains outside More; recovery is a live deferral',()=>{
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');
 assert.ok(source.indexOf('<HomeGettingStarted')<source.indexOf('<details className="relative ml-auto"'));
 assert.ok(source.includes('deferAutoOpen={Boolean(conversation.recovery||conversation.issueEditor||!conversation.saved||swpDemoVisible||guidedExampleActive)}'));
});


test('open introduction locks background scroll and restores exact styles on close and unmount',()=>{
 const h=harness({autoOpen:false});
 h.document.documentElement.style.setProperty('overflow','scroll','important');
 h.document.body.style.setProperty('overflow','auto');
 h.flush();h.button('Introduction').props.onClick();h.flush();
 assert.equal(h.document.documentElement.style.getPropertyValue('overflow'),'hidden');
 assert.equal(h.document.body.style.getPropertyValue('overflow'),'hidden');
 h.button('Explore on my own').props.onClick();h.flush();
 assert.equal(h.document.documentElement.style.getPropertyValue('overflow'),'scroll');
 assert.equal(h.document.documentElement.style.getPropertyPriority('overflow'),'important');
 assert.equal(h.document.body.style.getPropertyValue('overflow'),'auto');
 h.button('Introduction').props.onClick();h.flush();h.unmount();
 assert.equal(h.document.documentElement.style.getPropertyValue('overflow'),'scroll');
 assert.equal(h.document.body.style.getPropertyValue('overflow'),'auto');
 const clean=harness();clean.flush();clean.flush();clean.unmount();
 assert.equal(clean.document.body.style.getPropertyValue('overflow'),'');
});

test('intro scroll region contains boundary scrolling and route dismissal restores page scrolling',()=>{
 const h=harness(),all=nodes(h.flush());h.flush();
 assert.match(all.find(n=>n.props?.role==='region').props.className,/overscroll-contain/);
 assert.match(h.dialog().props.className,/overscroll-none/);
 h.flush({active:false});h.flush();
 assert.equal(h.native.open,false);
 assert.equal(h.document.documentElement.style.getPropertyValue('overflow'),'');
 assert.equal(h.document.body.style.getPropertyValue('overflow'),'');
});
