import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {appPageFromSearch,appPageHref,subscribeToAppPage,currentAppPage,APP_PAGE_CHANGE_EVENT} from '../lib/app-page-url.ts';
const require=createRequire(import.meta.url);
const publicEnv={NODE_ENV:'production',VERCEL:'1',VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production',VERCEL_PROJECT_ID:'prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF',VERCEL_ORG_ID:'team_UNDjIdAbXXQZ63p0YuNQQ9zp',VERCEL_URL:'people-analytics-aliasqa-ed-56dc.vercel.app'};
const compiled=ts.transpileModule(fs.readFileSync(new URL('../proxy.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function proxy(env=publicEnv){const exports={};vm.runInNewContext(compiled,{exports,process:{env},URL,Request,require:name=>name.startsWith('./lib/')?require('../'+name.slice(2)):require(name)});return exports.proxy;}
const request=(path,method='GET',host='www.ed-ai.app')=>new Request('https://'+host+path,{method});
test('public aliases redirect exactly to existing Scenarios while preserving filters, goal and fragment',()=>{
 for(const method of ['GET','HEAD'])for(const path of ['/scenarios','/Scenarios','/?page=scenarios']){
  const input=path+(path.includes('?')?'&':'?')+'country=US&goal=g1&level=L2#comparison';
  const r=proxy()(request(input,method));assert.equal(r.status,307);const u=new URL(r.headers.get('location'));
  assert.equal(u.pathname,'/');assert.equal(u.searchParams.get('page'),'planning-overview');assert.equal(u.searchParams.get('country'),'US');assert.equal(u.searchParams.get('goal'),'g1');assert.equal(u.hash,'#comparison');
  assert.equal(proxy()(request(u.pathname+u.search)).status,200,'canonical destination does not redirect again');
 }
});
test('aliases do not widen host, method, case, encoded path or API permissions',()=>{
 const run=proxy();
 for(const path of ['/SCENARIOS','/scenarios/extra','/%73cenarios','/api/scenarios'])assert.equal(run(request(path)).status,503,path);
 for(const method of ['POST','PUT','DELETE'])assert.equal(run(request('/scenarios',method)).status,503,method);
 assert.equal(run(request('/scenarios','GET','unapproved.example')).status,503);
 assert.throws(()=>proxy({...publicEnv,VERCEL_ORG_ID:'wrong'})(request('/scenarios')),/VERCEL_ORG_ID/);
 assert.equal(run(request('/?page=scenarios&page=home')).headers.get('location'),null,'ambiguous page query keeps existing fallback');
});
test('existing About alias and unrelated public route behavior remain unchanged',()=>{
 const run=proxy();assert.equal(new URL(run(request('/?page=about&goal=g1')).headers.get('location')).pathname,'/about');
 assert.equal(run(request('/about')).status,200);assert.equal(run(request('/unknown')).status,503);
});
test('query alias resolves in client navigation and retains URL state through back/forward notifications',()=>{
 assert.equal(appPageFromSearch('?page=scenarios'),'planning-overview');assert.equal(appPageFromSearch('?page=scenarios&page=home'),'home');
 assert.equal(appPageHref({pathname:'/',search:'?page=scenarios&country=US&goal=g1',hash:'#comparison'},'planning-overview'),'/?page=planning-overview&country=US&goal=g1#comparison');
 const listeners=new Map(),seen=[],previous=globalThis.window;
 globalThis.window={location:{search:'?page=scenarios'},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{assert.equal(listeners.get(name),fn);listeners.delete(name);}};
 try{const unsubscribe=subscribeToAppPage(()=>seen.push(currentAppPage()));listeners.get('popstate')();window.location.search='';listeners.get('popstate')();window.location.search='?page=planning-overview';listeners.get(APP_PAGE_CHANGE_EVENT)();assert.deepEqual(seen,['planning-overview','home','planning-overview']);unsubscribe();assert.equal(listeners.size,0);}finally{globalThis.window=previous;}
});
