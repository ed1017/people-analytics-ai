// Generate and verify local public projections without network requests.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPublic9037Binding} from '../../releases/2026-10-21/source/lib/public-9037.server.mjs';
import {LOCAL_COMPANY_GET_ROUTES} from '../../releases/2026-10-21/source/lib/dataset-company-routes.mjs';
import {roleRecruitingComparison} from '../../releases/2026-10-21/source/lib/home-role-recruiting.mjs';
import {readDashboardScopeReceipt} from '../../releases/2026-10-21/source/lib/dashboard-scope.ts';
import {resolvePublicWorkforcePerformance} from '../../releases/2026-10-21/source/lib/workforce-performance.ts';
import {validateCompensationContext} from '../../releases/2026-10-21/source/lib/compensation-release-context.ts';
import {readCapacityRiskGroups} from '../../releases/2026-10-21/source/lib/group-capacity-risk-source.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../synthetic-october-candidate-20261103');
const target=path.join(root,'.private-9037');
fs.mkdirSync(target,{recursive:true});
for(const name of ['integrity-manifest.json','component-contracts.json','components.json','joint-dashboard.json'])fs.copyFileSync(path.join(root,'components-final',name),path.join(target,name));
fs.copyFileSync(path.join(root,'capture.json'),path.join(target,'captured-62-queries.json'));
process.chdir(root);
const binding=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
const token=await binding.router.bootstrapToken(),responses={};
for(const route of [...LOCAL_COMPANY_GET_ROUTES,'/api/position-structure']){
 const response=await binding.handle(new Request('https://www.ed-ai.app'+route,{headers:{'x-workforce-dataset':token}}));
 if(!response.ok)throw Error(route+': '+response.status);
 responses[route]=await response.json();
}
fs.writeFileSync(path.join(root,'public-projections.json'),JSON.stringify(responses));
async function get(route){
 const response=await binding.handle(new Request('https://www.ed-ai.app'+route,{headers:{'x-workforce-dataset':token}}));
 if(!response.ok)throw Error(route+': '+response.status+' '+await response.text());
 return response.json();
}
const catalog=await get('/api/occupational-reference'),timings=[];
const dashboard=responses['/api/dashboard'];
if(!readDashboardScopeReceipt(dashboard.workforce_filter_scope))throw Error('Current dashboard scope rejected');
const ratings=resolvePublicWorkforcePerformance(dashboard.performance_rating,{country:'all',org:'all',level:'all'},9092,dashboard.workforce_filter_scope);
if(ratings?.counts.population!==9037||ratings.snapshotDate!=='2026-09-30')throw Error('Retained ratings invalid');
validateCompensationContext(await get('/api/compensation-job-release'),token);
const attrition=responses['/api/attrition'];
const scopes=await Promise.all([...attrition.business_units.map(b=>b.org_code),'all'].map(org=>get('/api/dashboard?'+new URLSearchParams({country:'all',org,level:'all'}))));
if(readCapacityRiskGroups(attrition,scopes).length!==8)throw Error('Risk group context invalid');
for(const profile of catalog.profiles){
 const query='?job_profile='+encodeURIComponent(profile.code);
 timings.push(await get('/api/role-buy-feasibility'+query));
 const readiness=await get('/api/internal-talent-readiness'+query);
 if(readiness.as_of!=='2026-10-31'||readiness.assessment_status!=='not_assessed')throw Error('Talent date/readiness mismatch');
}
const comparison=roleRecruitingComparison(catalog,timings,'2026-10-31');
if(comparison.period_start!=='2025-11-01'||comparison.period_end!=='2026-10-31')throw Error('Trailing year mismatch');
fs.writeFileSync(path.join(root,'role-period-validation.json'),JSON.stringify({status:'passed',roles:timings.length,start:comparison.period_start,end:comparison.period_end,networkRequests:0}));
console.log(JSON.stringify({status:'passed',routes:Object.keys(responses).length,identity:binding.router.current(),networkRequests:0},null,2));
