/** Server-only candidate input composition. No model, client credentials or writes. */
import {exact,DEMO_CUTOFF} from './dataset-demo-contracts.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import {readCandidateHomeContext} from './dataset-home-context.mjs';
import {projectionDigest,readHeadcountProjections} from './home-solution-projection.ts';
import {actionBinding} from './home-action-drafts.ts';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
const must=(v,m)=>{if(!v)throw Error(m);};
export function candidateFilterQuery(filters){
 must(exact(filters,['country','org','level'])&&Object.values(filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100),'Explicit workforce filters required');
 return '?'+new URLSearchParams(filters).toString();
}
export function createCandidateConversationInputs({api,metadata}){
 async function read(path,body,signal=new AbortController().signal){
  signal.throwIfAborted();
  const expected=metadata(),r=await api.handle(new Request('http://local.invalid'+path,{signal,...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})}));must(r.ok,'Candidate evidence unavailable');const value=await r.json(),m=value.data_meta;
  must(m?.datasetToken===expected.datasetToken&&m?.datasetId===expected.datasetId&&m?.bundleDigest===expected.bundleDigest&&m?.cutoff===DEMO_CUTOFF,'Mixed candidate evidence');signal.throwIfAborted();must(metadata().datasetToken===expected.datasetToken&&metadata().bundleDigest===expected.bundleDigest,'Candidate binding changed');return value;
 }
 async function projection(filters,signal){
  signal.throwIfAborted();const d=await read('/api/dashboard'+candidateFilterQuery(filters)),receipt=readDashboardScopeReceipt(d.workforce_filter_scope);
  must(receipt?.status==='verified_rpc'&&exact(receipt.effective,['country','org','level'])&&Object.keys(filters).every(k=>receipt.effective[k]===filters[k]),'Projection scope unavailable');
  const m=metadata(),version={datasetId:m.datasetId,datasetToken:m.datasetToken,bundleDigest:m.bundleDigest,cutoff:DEMO_CUTOFF};
  const input={asOf:d.overview.snapshot_date,opening:d.overview.headcount,filters:{...filters},scope:receipt.label,relations:['dashboard_overview_filtered'],datasetVersion:version,defaults:null,baseline:[]};
  must(input.asOf===DEMO_CUTOFF,'Projection cutoff mismatch');
  if(Object.values(filters).every(v=>v==='all')){
   const [scenario,planning]=await Promise.all([read('/api/scenario-modeler'),read('/api/workforce-planning')]);
   must(scenario.as_of===input.asOf&&planning.scenarios.length===1,'Projection opening identity');
   input.defaults=scenario.defaults;input.baseline=planning.scenarios[0].points.map(({planning_month,planned_headcount,planned_fte,planned_labor_cost_usd})=>({planning_month,planned_headcount,planned_fte,planned_labor_cost_usd}));input.relations.push('scenario_modeler_defaults','workforce_scenario_summary:Baseline');
  }
  signal.throwIfAborted();must(metadata().datasetToken===version.datasetToken&&metadata().bundleDigest===version.bundleDigest,'Projection binding changed');return input;
 }
 async function home(raw){
  const supplied=normalizeHomePack(raw),context=readCandidateHomeContext(supplied.datasetContext),m=metadata();
  must(context.datasetToken===m.datasetToken&&context.datasetId===m.datasetId&&context.bundleDigest===m.bundleDigest,'Stale Home dataset binding');
  const fresh=await api.groundHome(candidateFilterQuery(context.filters),context.selectionGoal,context.session);
  must(JSON.stringify(supplied)===JSON.stringify(fresh.pack),'Home evidence changed; refresh before continuing');
  return fresh.pack;
 }
 async function checkSaved(raw,pack){
  const evidenceDigest=async value=>(await actionBinding('binding-check','Check current evidence',value,null)).evidenceDigest;
  const valid=new Set([await evidenceDigest(pack)]),required=[...(raw.catalog?.plans??[]).map(p=>p.draft?.binding?.evidenceDigest),...(raw.state?.working??[]).map(p=>p.binding?.evidenceDigest)];
  const contexts=raw.state?.datasetEvidenceContexts??raw.datasetEvidenceContexts??[];
  must(Array.isArray(contexts)&&contexts.length<=16,'Bounded evidence recipes required');
  for(const rawContext of contexts){
   if(required.every(d=>valid.has(d)))break;
   const context=readCandidateHomeContext(rawContext),m=metadata();must(context.datasetToken===m.datasetToken&&context.bundleDigest===m.bundleDigest,'Earlier dataset evidence recipe');
   const rebuilt=await api.groundHome(candidateFilterQuery(context.filters),context.selectionGoal,context.session);
   valid.add(await evidenceDigest(rebuilt.pack));
  }
  must(required.every(d=>valid.has(d)),'Saved or working evidence cannot be rebuilt within the current dataset');
  const m=metadata(),loaded=new Map();for(const item of readHeadcountProjections(raw.state?.analyses??[])){
   const v=item.inputs?.datasetVersion;must(v?.datasetToken===m.datasetToken&&v?.bundleDigest===m.bundleDigest,'Saved projection belongs to an earlier dataset');
   const key=candidateFilterQuery(item.inputs.filters);if(!loaded.has(key))loaded.set(key,await projection(item.inputs.filters,new AbortController().signal));
   const current=loaded.get(key);must(JSON.stringify(item.inputs)===JSON.stringify(current)&&item.inputDigest===await projectionDigest(current),'Saved projection source cannot be verified');
  }
 }
 return Object.freeze({projection,read,home,checkSaved});
}
