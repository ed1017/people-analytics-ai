import test from 'node:test';
import assert from 'node:assert/strict';
import {readDemandSkills,skillClientDraft} from '../lib/skill-client-demand.ts';
import {capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
const row={skill_id:1,skill_code:'DATA',skill_name:'Data analysis',employees_meeting_requirement:9999};
const source={as_of:'2026-09-30',summary:{current_workforce:10000},largest_gaps:[row],highest_demand:[row],strongest_coverage:[]};
test('skill reference reader deduplicates identities without carrying counts as capacity',()=>{
 const catalog=readDemandSkills(source);assert.deepEqual(catalog,{asOf:'2026-09-30',skills:[{id:'1',code:'DATA',name:'Data analysis'}]});
 const draft=skillClientDraft(catalog,'1');assert.match(draft.scope,/DATA; reference 2026-09-30/);assert.match(draft.scope,/- clients$/);
 for(const key of ['people','fte','volume','effort','hours','openingDate','allocation','productivity','hires','exits'])assert.equal(draft[key],'');assert.equal(draft.confirmed,false);assert.equal(source.largest_gaps[0].employees_meeting_requirement,9999);
 assert.throws(()=>skillClientDraft(catalog,'missing'),/Choose a skill/);
});
test('missing, contradictory and malformed skill references fail closed',()=>{
 for(const bad of [null,{}, {...source,as_of:'2026-02-31'},{...source,summary:{current_workforce:0}},{...source,highest_demand:null},{...source,largest_gaps:[],highest_demand:[]},{...source,highest_demand:[{...row,skill_name:'Other'}]},{...source,highest_demand:[{...row,skill_id:2}]},{...source,largest_gaps:[{...row,skill_id:null}]},{...source,largest_gaps:[{...row,skill_code:''}]}])assert.throws(()=>readDemandSkills(bad),/unavailable/);
});
test('client assumptions reuse monthly engine timing and retain unknown supply until entered',()=>{
 const draft={...skillClientDraft(readDemandSkills(source),'1'),openingDate:'2026-09-30',months:'2',volume:'20',effort:'8',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true};
 const unknown=calculateMonthlyWorkload(capacitySpec(draft));assert.deepEqual(unknown.points.map(p=>p.month),['2026-10','2026-11']);assert.equal(unknown.points[0].requiredFte,1);assert.equal(unknown.points[0].allocatedFte,null);assert.equal(unknown.points[0].gapFte,null);
 const known=calculateMonthlyWorkload(capacitySpec({...draft,people:'3',fte:'2'}));assert.equal(known.points[0].gapFte,0);
 const changed=calculateMonthlyWorkload(capacitySpec({...draft,people:'3',fte:'2',volume:'40'}));assert.equal(changed.points[0].requiredFte,2);assert.equal(changed.points[0].allocatedFte,1);assert.equal(changed.points[0].gapFte,1);
});
