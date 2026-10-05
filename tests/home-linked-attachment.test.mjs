import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationFixture} from './fixtures/action-plan-application.mjs';
import {DecisionStore,DECISIONS_STORAGE_KEY,encodeDecisions} from '../lib/local-decisions.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {reconcileBundle,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {currentSolutionVersion,reviseWorkforceSolution} from '../lib/workforce-solution.ts';
import {previewLinkedAttachment,commitLinkedAttachment,planningDestination,resolveAttachedSourceBinding,readAttachmentLinks,linkedAttachmentField} from '../lib/home-linked-attachment.ts';
const at='2026-10-05T14:00:00Z',entered=value=>({value,kind:'user-entered',basis:'Reviewed fixture assumption.'});
async function setup(){
 const fixture=applicationFixture(),id=fixture.binding.goalId,external={headcount:100},fields={development:fixture.destination.development,workforceSolution:fixture.destination.workforceSolution,selectedPlanningScenario:'Baseline',unrelated:'Keep'};
 const project=destination=>actionBinding(id,fixture.binding.goal,{sources:[{id:'W1',status:'loaded',facts:external}]},{destination});
 const binding=await project(planningDestination(fields)),draft={...fixture.currentDraft,binding};
 const seed={version:1,revision:12,goals:{version:1,activeId:id,goals:[{id,statement:binding.goal},{id:'other',statement:'Other goal'}]},workspaces:{[id]:{savedAt:at,fields},other:{savedAt:at,fields:{sentinel:'Keep'}}}};
 const map=new Map([[DECISIONS_STORAGE_KEY,encodeDecisions(seed)]]),writes=[],port={getItem:key=>map.get(key)??null,setItem:(key,value)=>{writes.push(value);map.set(key,value)},removeItem:key=>map.delete(key)},store=new DecisionStore();store.initialize(port);
 const request={preparedAt:at,draft,result:reconcileBundle(draft),attachmentId:'attachment-1',at,replaceId:null,reviewed:true,acknowledgeUnknowns:true,development:{componentId:'c2',optionIndex:0,quoteReviewed:true,hourlyReviewed:true},capacityReviewed:true};
 return {id,external,binding,store,map,writes,port,project,request,fields:()=>store.getSnapshot().data.workspaces[id].fields};
}
const overrides={'workforceSolution.training.trainingCash':'replace'};
async function attach(f){const preview=await previewLinkedAttachment(f.store,f.request,overrides,f.project);await commitLinkedAttachment(f.store,preview,overrides,f.project,()=>true,'receipt-1');return preview;}
function revised(f,participants=12){const inputs=structuredClone(f.request.draft.inputs);inputs.groups.find(group=>group.id==='cohort').count=entered(participants);const draft=reviseBundleDraft(f.request.draft,inputs);return {...f.request,draft,result:reconcileBundle(draft),attachmentId:'attachment-2',replaceId:'attachment-1'};}
test('one atomic write attaches, fills compatible empty fields, applies selected replacements and survives reload',async()=>{
 const f=await setup(),before=structuredClone(f.store.getSnapshot().data),preview=await previewLinkedAttachment(f.store,f.request,overrides,f.project);
 assert.equal(f.writes.length,0);assert.equal(preview.choices['development.options[0].inputs.participants'],'fill-empty');assert.equal(preview.choices['development.options[0].inputs.fee'],undefined);
 await commitLinkedAttachment(f.store,preview,overrides,f.project,()=>true,'receipt-1');const fields=f.fields();
 assert.equal(f.writes.length,1);assert.equal(fields.homeSolutionBundlesV1.attachments.length,1);assert.equal(fields.development.options[0].inputs.participants,'10');assert.equal(fields.development.options[0].inputs.fee,'999');assert.equal(currentSolutionVersion(fields.workforceSolution).inputs.training.trainingCash,'10000');assert.deepEqual(fields.workforceSolution.versions[0],before.workspaces[f.id].fields.workforceSolution.versions[0]);assert.deepEqual(f.store.getSnapshot().data.workspaces.other,before.workspaces.other);assert.equal(fields.unrelated,'Keep');
 assert.equal(fields.actionPlanApplicationsV1.receipts.length,1);assert.ok(readAttachmentLinks(fields[linkedAttachmentField],fields));assert.notDeepEqual(await f.project(planningDestination(fields)),f.binding);
 assert.deepEqual(await resolveAttachedSourceBinding(f.binding,await f.project(planningDestination(fields)),fields,f.project),f.binding);
 const reopened=new DecisionStore();reopened.initialize(f.port);assert.deepEqual(reopened.getSnapshot().data,f.store.getSnapshot().data);assert.deepEqual(await resolveAttachedSourceBinding(f.binding,await f.project(planningDestination(fields)),reopened.getSnapshot().data.workspaces[f.id].fields,f.project),f.binding);
});
test('accepted update follows only receipt-owned unchanged fields and preserves previous attached versions',async()=>{
 const f=await setup();await attach(f);const first=structuredClone(f.fields().homeSolutionBundlesV1.attachments[0]),request=revised(f),preview=await previewLinkedAttachment(f.store,request,{},f.project);
 assert.equal(preview.choices['development.options[0].inputs.participants'],'replace');assert.equal(preview.choices['development.options[0].inputs.fee'],undefined);
 await commitLinkedAttachment(f.store,preview,{},f.project,()=>true,'receipt-2');assert.equal(f.fields().development.options[0].inputs.participants,'12');assert.equal(f.fields().development.options[0].inputs.fee,'999');assert.deepEqual(f.fields().homeSolutionBundlesV1.attachments[0],first);assert.equal(f.fields().homeSolutionBundlesV1.attachments[1].supersedes,first.id);assert.equal(f.fields().homeSolutionBundlesV1.attachments[1].draft.revision,request.draft.revision);
 assert.deepEqual(await resolveAttachedSourceBinding(f.binding,await f.project(planningDestination(f.fields())),f.fields(),f.project),f.binding);
});
test('manual linked Development changes are preserved by default and require explicit replacement',async()=>{
 const f=await setup();await attach(f);const development=structuredClone(f.fields().development);development.options[0].inputs.participants='11';f.store.setField(f.id,'development',development);const request=revised(f),preview=await previewLinkedAttachment(f.store,request,{},f.project);
 assert.ok(preview.manualConflicts.includes('development.options[0].inputs.participants'));assert.equal(preview.choices['development.options[0].inputs.participants'],undefined);
 const selected={'development.options[0].inputs.participants':'replace'},confirmed=await previewLinkedAttachment(f.store,request,selected,f.project);await commitLinkedAttachment(f.store,confirmed,selected,f.project,()=>true,'receipt-2');assert.equal(f.fields().development.options[0].inputs.participants,'12');assert.equal(f.fields()[linkedAttachmentField].entries.at(-1).links.find(link=>link.destination==='development.options[0].inputs.participants').written,'12');
});
test('manual workforce version changes to linked fields remain reviewable, preserving full prior history',async()=>{
 const f=await setup();await attach(f);const solution=f.fields().workforceSolution,input=structuredClone(currentSolutionVersion(solution).inputs);input.training.trainingCash='9000';const manual=reviseWorkforceSolution(solution,2,input,'sidebar','Manual budget assumption',at);f.store.setField(f.id,'workforceSolution',manual);
 const request=revised(f),preview=await previewLinkedAttachment(f.store,request,{},f.project);assert.ok(preview.manualConflicts.includes('workforceSolution.training.trainingCash'));assert.equal(preview.choices['workforceSolution.training.trainingCash'],undefined);
 await commitLinkedAttachment(f.store,preview,{},f.project,()=>true,'receipt-2');assert.deepEqual(f.fields().workforceSolution,manual);assert.equal(f.fields().development.options[0].inputs.participants,'12');
});
test('unlinked fields, external evidence, quotes, goals and tampered history invalidate the transition',async()=>{
 for(const kind of ['unlinked','evidence','quote','goal','history']){const f=await setup();await attach(f);if(kind==='evidence')f.external.headcount=101;else if(kind==='history'){const history=structuredClone(f.fields()[linkedAttachmentField]);history.entries[0].links[0].written='fake';f.store.setField(f.id,linkedAttachmentField,history);}else {const development=structuredClone(f.fields().development);if(kind==='unlinked')development.options[0].inputs.fee='123';if(kind==='quote')development.options[0].quote.provider='Changed provider';if(kind==='goal')development.goal='Different goal';f.store.setField(f.id,'development',development);}
  assert.equal(await resolveAttachedSourceBinding(f.binding,await f.project(planningDestination(f.fields())),f.fields(),f.project),null,kind);await assert.rejects(previewLinkedAttachment(f.store,revised(f),{},f.project));
 }
});
test('quota, stale source/destination and concurrent commits publish no partial attachment or destination',async()=>{
 for(const kind of ['quota','destination','guard']){const f=await setup(),preview=await previewLinkedAttachment(f.store,f.request,overrides,f.project);if(kind==='destination')f.store.setField(f.id,'unrelated','Changed');const before=structuredClone(f.store.getSnapshot().data),raw=f.map.get(DECISIONS_STORAGE_KEY);f.writes.length=0;if(kind==='quota')f.port.setItem=()=>{throw Error('Quota exceeded')};await assert.rejects(commitLinkedAttachment(f.store,preview,overrides,f.project,()=>kind!=='guard','receipt-1'));assert.equal(f.writes.length,0);assert.deepEqual(f.store.getSnapshot().data,before);assert.equal(f.map.get(DECISIONS_STORAGE_KEY),raw);}
 const f=await setup(),preview=await previewLinkedAttachment(f.store,f.request,overrides,f.project),results=await Promise.allSettled([commitLinkedAttachment(f.store,preview,overrides,f.project,()=>true,'receipt-1'),commitLinkedAttachment(f.store,preview,overrides,f.project,()=>true,'receipt-2')]);assert.equal(results.filter(item=>item.status==='fulfilled').length,1);assert.equal(f.writes.length,1);await assert.rejects(commitLinkedAttachment(f.store,preview,overrides,f.project,()=>true,'receipt-3'));
});
test('unavailable mappings can attach honestly without destination changes or a fabricated application receipt',async()=>{
 const f=await setup();f.request.development=null;f.request.capacityReviewed=false;const preview=await previewLinkedAttachment(f.store,f.request,{},f.project);assert.equal(preview.application.selectedChanges.length,0);await commitLinkedAttachment(f.store,preview,{},f.project,()=>true,'unused');assert.equal(f.fields().actionPlanApplicationsV1,undefined);assert.deepEqual(f.fields().development,f.request.development===null?applicationFixture().destination.development:null);assert.equal(f.fields().homeSolutionBundlesV1.attachments.length,1);assert.equal(f.fields()[linkedAttachmentField].entries[0].receiptId,null);
});
test('unknown source values and a changed component mapping do not silently overwrite prior linked values',async()=>{
 const f=await setup();await attach(f);const request=revised(f);request.draft.inputs.groups.find(group=>group.id==='cohort').count={value:null,kind:'unknown',basis:null};request.result=reconcileBundle(request.draft);
 const preview=await previewLinkedAttachment(f.store,request,{},f.project);assert.equal(preview.application.rows.find(row=>row.destination==='development.options[0].inputs.participants').proposed,null);await commitLinkedAttachment(f.store,preview,{},f.project,()=>true,'receipt-2');assert.equal(f.fields().development.options[0].inputs.participants,'10');
 const next={...revised(f),attachmentId:'attachment-3',replaceId:'attachment-2',development:{...f.request.development,componentId:'c1'}};next.draft.revision=3;next.result=reconcileBundle(next.draft);const changed=await previewLinkedAttachment(f.store,next,{},f.project);assert.equal(changed.choices['development.options[0].inputs.participants'],undefined);assert.equal(changed.application.rows.find(row=>row.destination==='development.options[0].inputs.participants').proposed,'5');
});
test('explicit review is required and unsupported selected fields block attachment as well as application',async()=>{
 const f=await setup(),before=structuredClone(f.store.getSnapshot().data);await assert.rejects(previewLinkedAttachment(f.store,{...f.request,reviewed:false},{},f.project),/Review/);
 const choices={headcount:'replace'},preview=await previewLinkedAttachment(f.store,f.request,choices,f.project);assert.ok(preview.application.blockers.length);await assert.rejects(commitLinkedAttachment(f.store,preview,choices,f.project,()=>true,'receipt-1'),/blocked/);assert.deepEqual(f.store.getSnapshot().data,before);assert.equal(f.writes.length,0);
});
test('destination changes during async validation and external-tab writes reject the entire commit',async()=>{
 const f=await setup(),preview=await previewLinkedAttachment(f.store,f.request,overrides,f.project);let release,started;const gate=new Promise(resolve=>started=resolve),wait=new Promise(resolve=>release=resolve);let held=false;
 const project=async destination=>{if(!held){held=true;started();await wait;}return f.project(destination);};const pending=commitLinkedAttachment(f.store,preview,overrides,project,()=>true,'receipt-1');await gate;f.store.setField(f.id,'unrelated','Changed during validation');f.writes.length=0;const before=structuredClone(f.store.getSnapshot().data);release();await assert.rejects(pending);assert.equal(f.writes.length,0);assert.deepEqual(f.store.getSnapshot().data,before);
 const g=await setup(),current=await previewLinkedAttachment(g.store,g.request,overrides,g.project),other=structuredClone(g.store.getSnapshot().data);other.revision++;other.workspaces[g.id].fields.otherTab='Preserve';const raw=encodeDecisions(other);g.map.set(DECISIONS_STORAGE_KEY,raw);await assert.rejects(commitLinkedAttachment(g.store,current,overrides,g.project,()=>true,'receipt-1'),/Another tab/);assert.equal(g.writes.length,0);assert.equal(g.map.get(DECISIONS_STORAGE_KEY),raw);
});
test('transition validation also protects inputs omitted from a physical context digest',async()=>{
 const f=await setup(),project=()=>actionBinding(f.id,f.binding.goal,{sources:[{id:'W1',status:'loaded',facts:f.external}]},{});const binding=await project();f.request.draft.binding=binding;f.request.result=reconcileBundle(f.request.draft);f.request.development=null;f.request.capacityReviewed=false;const preview=await previewLinkedAttachment(f.store,f.request,{},project);await commitLinkedAttachment(f.store,preview,{},project,()=>true,'unused');
 const development=structuredClone(f.fields().development);development.options[0].inputs.fee='123';f.store.setField(f.id,'development',development);assert.equal(await resolveAttachedSourceBinding(binding,await project(),f.fields(),project),null);
});
test('a freshly prepared context does not inherit automatic field ownership from an older preparation',async()=>{
 const f=await setup();await attach(f);const request=revised(f);request.preparedAt='2026-10-06T14:00:00Z';request.draft.binding=await f.project(planningDestination(f.fields()));request.draft.revision=1;request.result=reconcileBundle(request.draft);
 const preview=await previewLinkedAttachment(f.store,request,{},f.project);assert.equal(preview.choices['development.options[0].inputs.participants'],undefined);assert.equal(preview.application.rows.find(row=>row.destination==='development.options[0].inputs.participants').after,'10');await commitLinkedAttachment(f.store,preview,{},f.project,()=>true,'unused');assert.equal(f.fields().development.options[0].inputs.participants,'10');assert.equal(f.fields().homeSolutionBundlesV1.attachments.length,2);
});
