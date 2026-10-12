// Synthetic-token boundary coverage. Only the transport is delayed; product consumers are unchanged.
import assert from 'node:assert/strict';
import {buildCompensationResponse} from '../../lib/compensation.ts';
import {SOURCE_SUCCESS_TTL_MS} from '../../lib/source-request-cache.ts';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';

const specs={
 workforce:['/api/workforce','loadWorkforce','People Managers','23,456','12,345'],
 attrition:['/api/attrition','loadAttrition','Voluntary Turnover YTD','4.2%','12.3%'],
 finance:['/api/finance','loadFinance','Total Labor Cost','$234,567','$123,456'],
 'talent-acquisition':['/api/talent-acquisition','loadTalentAcquisition','Median Time to Fill','234 days','123 days'],
 skills:['/api/skills','loadSkills','Requirement Met','82.2%','61.1%'],
 'survey-sentiment':['/api/survey-sentiment','readHomeSource','Engagement Favorable','81.2%','71.1%'],
 'career-growth-mobility':['/api/career-growth-mobility','loadCareerGrowthMobility','Recorded Movement Events','23,456','12,345'],
 'planning-overview':['/api/workforce-planning','loadPlanning','Current workforce plan','23,456','12,345'],
 'scenario-modeling':['/api/scenario-modeler','loadScenarioDefaults','Company Growth','2.34','1.23'],
 compensation:['/api/compensation','load','Reported labor cost · USD','$234,567','$123,456'],
};
export const hasDomainRace=destination=>Object.hasOwn(specs,destination);
export function createDomainRace(destination,phase,payload){
 const [endpoint,caller,label,freshValue,staleValue]=specs[destination];
 let releaseHeaders;
 const heldRequests=[];
 function data(next,query){
  if(destination==='compensation')return buildCompensationResponse([{org_code:'FIXTURE',org_name:'Fictional cost group',org_type:'business_unit',headcount:100,fte:100,labor_cost_usd:next?234567:123456}]);
  const value=structuredClone(payload(endpoint,query,next));
  if(destination==='workforce')value.summary.people_managers=next?23456:12345;
  if(destination==='attrition')value.summary.voluntary_turnover_ytd_pct=next?4.2:12.3;
  if(destination==='finance')value.current.labor_cost_usd=next?234567:123456;
  if(destination==='talent-acquisition')value.summary.median_time_to_fill_days=next?234:123;
  if(destination==='skills')value.summary.weighted_requirement_met_pct=next?82.2:61.1;
  if(destination==='survey-sentiment')value.summary.engagement_favorable_pct=next?81.2:71.1;
  if(destination==='career-growth-mobility')value.source.total_recorded_events=next?23456:12345;
  if(destination==='planning-overview')for(const scenario of value.scenarios)for(const point of scenario.points)point.planned_headcount=next?23456:12345;
  if(destination==='scenario-modeling')value.defaults.annual_growth_pct=next?2.34:1.23;
  return value;
 }
 return {endpoint,phase,
  async install(context){
   await context.addInitScript(({endpoint,caller,destination,phase,header})=>{
    const state=window.__domainRace={rows:[],armed:false,held:null,clockShift:0};
    const now=Date.now;Date.now=()=>now()+state.clockShift;
    let sequence=0,releaseBody;
    window.__releaseDomainBody=()=>releaseBody();
    const transport=window.fetch;
    window.fetch=async(input,init)=>{
     const path=new URL(String(input),location.href).pathname;
     if(path!==endpoint)return transport(input,init);
     const headers=new Headers(init?.headers),view=new URLSearchParams(location.search).get('page')??'home';
     const row={id:++sequence,path,view,token:headers.get(header),stack:new Error().stack,signal:!!init?.signal,aborted:false,headersDone:false,bodyPending:false,bodyDone:false};
     state.rows.push(row);
     const isConsumer=row.stack.includes(caller+' (');
     if(state.armed&&view===destination&&row.token==='legacy-v1:0'&&isConsumer){
      state.armed=false;state.held=row.id;row.held=true;
      headers.set('x-fixture-held-request',String(row.id));
      init?.signal?.addEventListener('abort',()=>{row.aborted=true;},{once:true});
      // Simulate an uncancellable transport, retaining the original signal's exact-request observation.
      init={...init,headers,signal:undefined};
     }
     const response=await transport(input,init);row.headersDone=true;
     return new Proxy(response,{get(target,key){
      if(key==='json')return async()=>{
       if(row.held&&phase==='body'){row.bodyPending=true;await new Promise(resolve=>{releaseBody=resolve;});}
       const result=await target.json();row.bodyDone=true;return result;
      };
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
     }});
    };
   },{endpoint,caller,destination,phase,header:DATASET_HEADER});
  },
  async respond(route){
   const request=route.request(),url=new URL(request.url());
   if(url.pathname!==endpoint)return false;
   const token=request.headers()[DATASET_HEADER],held=request.headers()['x-fixture-held-request'];
   if(held){heldRequests.push(Number(held));if(phase==='headers')await new Promise(resolve=>{releaseHeaders=resolve;});}
   await route.fulfill({headers:{[DATASET_HEADER]:token},json:data(token==='fixture-next:1',url.search)});
   return true;
  },
  async exercise({page,navigate,check,state,key,nextKey,id,oldId,attached,legacy,card,item}){
   // The gate is armed only after Home's work. It additionally requires the actual view and named consumer stack.
   await page.waitForFunction(()=>window.__domainRace.rows.every(row=>row.bodyDone));
   const prefetchCount=await page.evaluate(()=>window.__domainRace.rows.length);
   // Listening shares Home's demand-driven cache. Expire it with a fixture clock shift; no timer initiates a fetch.
   await page.evaluate(({expire,ttl})=>{window.__domainRace.armed=true;if(expire)window.__domainRace.clockShift=ttl+1;},{expire:destination==='survey-sentiment',ttl:SOURCE_SUCCESS_TTL_MS});
   await navigate(destination);
   await page.waitForFunction(phase=>{
    const state=window.__domainRace,row=state.rows.find(row=>row.id===state.held);
    return row&&(phase==='headers'?!row.headersDone:row.bodyPending);
   },phase);
   const held=await page.evaluate(()=>window.__domainRace.rows.find(row=>row.id===window.__domainRace.held));
   check('held request originated in the entered view consumer, not Home prefetch',held.view===destination&&held.path===endpoint&&held.token==='legacy-v1:0'&&held.stack.includes(caller+' (')&&heldRequests.includes(held.id)&&held.id>prefetchCount);
   const before=await state(key);
   await page.getByLabel('Fixture server bootstrap token',{exact:true}).selectOption('fixture-next:1');
   await page.getByText('Dataset changed. Saved goals and requirements are retained. Earlier evidence and planning drafts remain in their previous dataset workspace.',{exact:true}).waitFor();
   await page.waitForFunction(({caller,destination})=>window.__domainRace.rows.some(row=>row.view===destination&&row.token==='fixture-next:1'&&row.stack.includes(caller+' (')&&row.bodyDone),{caller,destination});
   const metric=destination==='scenario-modeling'
    ?page.getByRole('spinbutton',{name:/^Company Growth % Baseline/})
    :page.locator('p:visible, dt:visible').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).locator('..');
   await metric.waitFor();assert.equal(await metric.count(),1,'unique visible domain metric');
   const readMetric=()=>destination==='scenario-modeling'?metric.inputValue():metric.innerText();
   assert.ok((await readMetric()).includes(freshValue),'fresh domain metric before old completion');
   check('new dataset has rendered the actual domain metric while the old response remains held',true);
   if(phase==='headers')releaseHeaders();else await page.evaluate(()=>window.__releaseDomainBody());
   await page.waitForFunction(({id,phase})=>{
    const row=window.__domainRace.rows.find(row=>row.id===id);return phase==='headers'?row.headersDone:row.bodyDone;
   },{id:held.id,phase});
   // Completion, promise continuations, then two render frames; no fixed response-arrival sleep.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const completed=await page.evaluate(id=>window.__domainRace.rows.find(row=>row.id===id),held.id);
   check('the exact held transport completed and its stale value did not replace current domain state',(await readMetric()).includes(freshValue)&&!(await readMetric()).includes(staleValue));
   if(['compensation','scenario-modeling'].includes(destination))check('cancellation intent belongs to the exact held request',held.signal&&completed.aborted);
   else check('completed old evidence is ignored without requiring view cancellation',completed.headersDone);
   if(phase==='body')check('old JSON body completed after the boundary switch',completed.bodyPending&&completed.bodyDone);
   const fresh=await state(nextKey),retained=await state(key);
   check('authored goals carry forward without adopting the old working draft or saved evidence',JSON.stringify(fresh.goals.goals)===JSON.stringify(before.goals.goals)&&Object.values(fresh.workspaces).every(slot=>!slot.fields.homePlanAlternativesV1&&!slot.fields.homeSolutionBundlesV1&&!slot.fields.homeSolutionConversationV1));
   check('immutable pinned and legacy history stays in the old workspace with the old working scope',JSON.stringify(retained.workspaces[id].fields.homePlanAlternativesV1)===JSON.stringify(attached)&&JSON.stringify(retained.workspaces[oldId].fields.homeSolutionBundlesV1)===JSON.stringify(legacy.raw)&&JSON.stringify(retained.workspaces[id].fields.homeSolutionConversationV1)===JSON.stringify(before.workspaces[id].fields.homeSolutionConversationV1));
   check('old working proposal is absent from the new workspace',await card.count()===0);
   item.race={endpoint,phase,prefetchCount,cacheExpired:destination==='survey-sentiment',held:completed,freshValue,metric:await readMetric(),requests:await page.evaluate(()=>window.__domainRace.rows)};
  },
 };
}
