import test from 'node:test';
import assert from 'node:assert/strict';
import {load9037PreviewBinding} from '../lib/dataset-9037-preview.server.mjs';
import {DEMO_JOB_CODES} from '../lib/dataset-demo-contracts.mjs';
import {LEGACY_PRESENTER_CONTRACT} from '../lib/dataset-presenter-contract.mjs';
import {isPublicProjectionVersion,isStoredPublicProjectionVersion} from '../lib/public-projection-contract.mjs';

const hostname='people-analytics-kapnmdmxs-ed-56dc.vercel.app';
const binding=await load9037PreviewBinding({hostname});
const token=await binding.router.bootstrapToken();
async function read(route){
 const response=await binding.handle(new Request(`https://${hostname}${route}`,{headers:{'x-workforce-dataset':token}}));
 assert.equal(response.status,200,route);
 return response.json();
}
test('candidate skills and learning expose all named fictional skills',async()=>{
 const skills=await read('/api/skills');
 assert.equal(skills.summary.active_skills,12);
 assert.equal(skills.largest_gaps.length,12);
 assert.ok(skills.largest_gaps.every(r=>!r.skill_code.startsWith('DEMO-SKILL')));
 await read('/api/learning-development');
});
test('all fifty roles retain honest readiness and complete reviewed requirements',async()=>{
 let requirements=0;
 for(const role of DEMO_JOB_CODES){
  const value=await read('/api/internal-talent-readiness?job_profile='+role);
  assert.equal(value.assessment_status,'not_assessed');
  assert.equal(value.candidate_pool.role_ready,null);
  assert.ok(value.required_skill_count>=3&&value.required_skill_count<=4);
  requirements+=value.required_skill_count;
 }
 assert.equal(requirements,155);
});
test('structural planning and response use the same role-specific skill bundle',async()=>{
 const actions=[{action_type:'add_positions',business_unit:null,level:null,job_profile:'CONS-TECH',amount:4,fill_pct:null}];
 for(const [route,body] of [
  ['/api/position-structure',{actions}],
  ['/api/role-workforce-response-plan',{actions,job_profile:'CONS-TECH',allocation:{build:1,move:1,buy:2,borrow:0,automate:0}}],
 ]){
  const response=await binding.handle(new Request(`https://${hostname}${route}`,{method:'POST',headers:{'x-workforce-dataset':token,'content-type':'application/json'},body:JSON.stringify(body)}));
  assert.equal(response.status,200,route+': '+(response.status===200?'':await response.text()));
  const result=await response.json();
  if(route.includes('response-plan')){
   assert.equal(result.skill_bundle.length,4);
   assert.equal(result.capacity_feasibility.overall_feasible,null);
   assert.equal(result.skill_bundle.find(r=>r.skill_code==='PROJECT-DELIVERY').required_proficiency,4);
  }
 }
});
test('legacy contracts remain fixed rather than accepting arbitrary new catalogues',()=>{
 assert.equal(LEGACY_PRESENTER_CONTRACT.skillCatalogSize,5);
 assert.equal(LEGACY_PRESENTER_CONTRACT.skillRequirementCount,150);
 assert.equal(LEGACY_PRESENTER_CONTRACT.roleSkillRequirements['FIN-ACC']['DEMO-SKILL-1'],3);
 assert.ok(Object.isFrozen(LEGACY_PRESENTER_CONTRACT.roleSkillRequirements));
});
test('prior published skill baseline remains readable but cannot become current',()=>{
 const old={datasetId:'workforce-demo-9037-public-aggregates-v2',datasetToken:'workforce-demo-9037-public-aggregates-v2:3',publicationReceiptId:'edwin-coordinated-synthetic-realism-2026-10-23',cutoff:'2026-09-30',provenance:'approved-public-projection-v1',contract:'public-synthetic-aggregates-and-calculations-v1',publicDigest:'b320608fd2edd49f838e9834cdcd13dea1a2cfc3167bdc84c5fbe487a4d0dc97'};
 assert.equal(isStoredPublicProjectionVersion(old),true);
 assert.equal(isPublicProjectionVersion(old),false);
 for(const edit of [{cutoff:'2026-10-01'},{datasetToken:old.datasetToken+':4'},{extra:true},{publicDigest:'invalid'}])assert.equal(isStoredPublicProjectionVersion({...old,...edit}),false);
});
