// One offline regression through the real Page and DatasetBoundary, with no selector writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {DecisionStore,encodeDecisions,datasetDecisionKey,datasetRecoveryKey} from '../../lib/local-decisions.ts';
import {capacitySpec,emptyCapacityDraft} from '../../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../../lib/swp-monthly-workload.ts';
import {capacityCostAssumptions,calculateCapacityCost,capacityCalculationKey} from '../../lib/swp-capacity-cost.ts';
import {capacityContext,capacityBinding,saveCapacityScenario,monthlyCapacityField,readCapacityBucket} from '../../lib/swp-capacity-store.ts';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';

const tokens=['legacy-v1:0','fixture-next:1','legacy-v1:2'];
const goal={id:'rollback-capacity',statement:'Review synthetic service capacity'};
const at='2026-10-14T00:00:00.000Z';
function seed(token){
 const local={},session={};let fail=false;
 const port=values=>({getItem:k=>values[k]??null,setItem:(k,v)=>{if(values===local&&fail)throw Error('Synthetic quota failure');values[k]=v;},removeItem:k=>{delete values[k];}});
 local[datasetDecisionKey(token)]=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:goal.id,goals:[goal]},workspaces:{}});
 const store=new DecisionStore(token);store.initialize(port(local),undefined,port(session));
 const context=capacityContext(store,token,goal.id),scope={id:'synthetic-service',label:'Synthetic service tickets',workUnit:'Synthetic service tickets'};
 for(const [name,productivity] of [['Base','0'],['Improved','25']]){
  const draft={...emptyCapacityDraft,scope:scope.label,openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity,fullTimeMovements:true,confirmed:true,costRate:'12.34'};
  const result=calculateMonthlyWorkload(capacitySpec(draft)),cost=calculateCapacityCost(result,capacityCostAssumptions(draft.costRate));
  saveCapacityScenario({store,context,scope,session:{draft,result,cost,error:''},capture:{inputKey:capacityCalculationKey(result,cost),binding:capacityBinding(context,scope)},name:`${token} ${name}`,id:name.toLowerCase(),at,revision:store.getSnapshot().data.revision,assertActive:()=>{}});
 }
 assert.equal(readCapacityBucket(store.getField(goal.id,monthlyCapacityField),context).entries.length,2);
 fail=true;store.setField(goal.id,'chat',{messages:[],input:`Unsent recovery request for ${token}`});
 assert.equal(store.getSnapshot().saved,false);assert.ok(session[datasetRecoveryKey(token)]);
 return {local,session};
}
export async function runDatasetRollback({browser,base,html,build,payload,report}){
 const item={domain:'Retained release rollback',checks:[],errors:[],blocked:[],requests:[]};report.cases.push(item);
 const check=(name,ok)=>{assert.ok(ok,name);item.checks.push(name);console.log('PASS rollback '+name);};
 const context=await browser.newContext({viewport:{width:1350,height:1000},offline:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>item.errors.push(e.message));
 try{
  const old=seed(tokens[0]),candidate=seed(tokens[1]),local={...old.local,...candidate.local},session={...old.session,...candidate.session};
  await context.addInitScript(({local,session,header})=>{
   // Seed exactly once: reload must exercise the bytes left by the real app.
   if(!sessionStorage.getItem('rollback-seeded')){
    for(const [k,v] of Object.entries(local))localStorage.setItem(k,v);
    for(const [k,v] of Object.entries(session))sessionStorage.setItem(k,v);
    sessionStorage.setItem('rollback-seeded','true');
   }
   const transport=window.fetch,state=window.__rollback={held:false,bodyPending:false,bodyDone:false,aborted:false};let release;
   window.__releaseRollbackBody=()=>release();
   window.fetch=async(input,init)=>{
    const hold=!state.held&&String(input).startsWith('/api/workforce')&&new Headers(init?.headers).get(header)==='legacy-v1:0';
    if(!hold)return transport(input,init);
    state.held=true;init?.signal?.addEventListener('abort',()=>{state.aborted=true;},{once:true});
    const response=await transport(input,{...init,signal:undefined});state.headersDone=true;
    return new Proxy(response,{get(target,key){
     if(key==='json')return async()=>{state.bodyPending=true;await new Promise(resolve=>{release=resolve;});const value=await target.json();state.bodyDone=true;return value;};
     const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
   };
  },{local,session,header:DATASET_HEADER});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),token=req.headers()[DATASET_HEADER];
   // Opening a Planning section can request a read-only explanation. Fail it locally; never invoke a provider.
   if(url.origin===base&&url.pathname==='/api/chat'&&req.method()==='POST'){
    const body=req.postDataJSON();assert.ok(!JSON.stringify(body).includes('Unsent recovery request'),'old recovery text must never be submitted');
    item.requests.push({path:url.pathname,token,method:'POST',syntheticUnavailable:true});
    return route.fulfill({status:503,headers:{[DATASET_HEADER]:token},json:{error:'Synthetic explanation unavailable'}});
   }
   if(url.origin!==base||req.method()!=='GET'){item.blocked.push(url.href);return route.abort();}
   if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
   if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});
   item.requests.push({path:url.pathname,token});
   const data=payload(url.pathname,url.search,token===tokens[1]);
   if(url.pathname==='/api/workforce')data.summary.headcount=token===tokens[0]?777777:token===tokens[1]?9100:6100;
   return route.fulfill({headers:{[DATASET_HEADER]:token??tokens[0]},...(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable'}})});
  });
  const readBuckets=()=>page.evaluate(({localKeys,sessionKeys})=>({local:Object.fromEntries(localKeys.map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(sessionKeys.map(k=>[k,sessionStorage.getItem(k)]))}),{localKeys:Object.keys(local),sessionKeys:Object.keys(session)});
  const metric=page.locator('p[title]').filter({hasText:/^Headcount$/}).locator('..');
  const waitMetric=value=>metric.getByText(value,{exact:true}).waitFor();
  const switchTo=async token=>{await page.getByLabel('Fixture server bootstrap token',{exact:true}).selectOption(token);await page.getByText('Dataset changed. Saved goals and requirements are retained. Earlier evidence and planning drafts remain in their previous dataset workspace.',{exact:true}).waitFor();};
  await page.goto(base+'/?page=workforce');await dismissHomeOnboarding(page);
  await page.waitForFunction(()=>window.__rollback.bodyPending);
  check('legacy response headers arrived while its body remains pending',await page.evaluate(()=>window.__rollback.headersDone&&!window.__rollback.bodyDone));
  const before=await readBuckets();
  assert.deepEqual(before.local,local,'initial load preserves both saved envelopes');
  check('both generations retain two validated saved scenarios and a recovery draft',Object.values(before.local).every(raw=>JSON.parse(raw).payload.workspaces[goal.id].fields[monthlyCapacityField].entries.length===2)&&Object.values(before.session).every(raw=>JSON.parse(raw).version===1));
  await switchTo(tokens[1]);await waitMetric('9,100');
  check('candidate evidence renders before old body completes',!await page.evaluate(()=>window.__rollback.bodyDone));
  await switchTo(tokens[2]);await waitMetric('6,100');
  await page.evaluate(()=>window.__releaseRollbackBody());await page.waitForFunction(()=>window.__rollback.bodyDone);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const assertFresh=async label=>{
   const text=await metric.innerText();
   check(label+' shows retained-release evidence without legacy/candidate results',text.includes('6,100')&&!/777,?777|9,100/.test(text));
   assert.deepEqual(await readBuckets(),before);check(label+' preserves previous saved and recovery buckets byte for byte',true);
   const fresh=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,datasetDecisionKey(tokens[2]));
   assert.deepEqual(fresh.goals.goals,[goal]);
   check(label+' carries authored goals without old capacity scenarios or recovery chat',Object.values(fresh.workspaces).every(slot=>!slot.fields[monthlyCapacityField]&&(!slot.fields.chat||slot.fields.chat.input===''&&slot.fields.chat.messages.length===0))&&await page.evaluate(key=>sessionStorage.getItem(key)===null,datasetRecoveryKey(tokens[2])));
  };
  await assertFresh('Rollback');
  item.held=await page.evaluate(()=>window.__rollback);
  await page.reload();await dismissHomeOnboarding(page);await waitMetric('6,100');await assertFresh('Reload');
  check('reload requests only generation 2 evidence',item.requests.filter(r=>r.path==='/api/workforce').at(-1)?.token===tokens[2]);
  // Enter planning after reload to exercise saved-scenario and session consumers too.
  await page.evaluate(()=>{history.pushState(null,'','/?page=planning-overview');dispatchEvent(new PopStateEvent('popstate'));});
  await page.locator('summary').filter({hasText:/^Advanced tools.*your capacity scenarios$/}).click();
  const area=page.getByRole('region',{name:'Workload capacity planning',exact:true});await area.waitFor();
  check('retained release has no revived capacity draft or calculation',await area.getByLabel('Workload scope',{exact:true}).inputValue()===''&&await area.getByRole('region',{name:'Monthly capacity comparison'}).count()===0);
  const text=await page.locator('body').innerText();check('previous saved scenario names and recovery requests are absent',!text.includes('legacy-v1:0 Base')&&!text.includes('fixture-next:1 Base')&&!text.includes('Unsent recovery request'));
  assert.deepEqual(await readBuckets(),before);
  check('no browser exceptions, external requests or mutations',item.errors.length===0&&item.blocked.length===0);
 }finally{await context.close();}
}
