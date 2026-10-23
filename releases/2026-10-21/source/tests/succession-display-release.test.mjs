import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSuccessionContext} from '../lib/succession-release-context.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const fixture=()=>({as_of_date:P.cutoff,small_cell_threshold:10,critical_job_profiles:12,filled_critical_positions:2162,positions_with_recorded_plan:1097,positions_without_recorded_plan:1065,recorded_plan_coverage_pct:50.7,plan_coverage_suppressed:false,positions_with_ready_now:147,positions_without_ready_now:950,ready_now_plan_pct:13.4,ready_now_suppressed:false,suppression_reason:null,data_meta:{datasetToken:P.token,datasetId:P.datasetId,bundleDigest:'a'.repeat(64),cutoff:P.cutoff,dataClass:'constructed-synthetic',publicationApproved:true,contract:P.contract,publicationReceiptId:P.approval}});
test('approved public aggregate retains exact counts and explicitly illustrative readiness',()=>{
 const result=validateSuccessionContext(fixture(),P.token);
 assert.equal(result.recorded_plan_coverage_pct,50.7);assert.equal(result.positions_with_ready_now,147);
 assert.equal(result.data_meta.successionSemantics,'illustrative-plan-flags');
 assert.match(result.data_meta.sourceLabel,/not assessed readiness/);
});
test('public display adapter rejects altered identity, publication, date, shape and count evidence',()=>{
 for(const [key,value] of [['datasetToken','other:2'],['datasetId','other'],['publicationApproved',false],['publicationReceiptId','unapproved'],['contract','other'],['cutoff','2026-10-01'],['bundleDigest','bad']]){
  const d=fixture();d.data_meta[key]=value;assert.throws(()=>validateSuccessionContext(d,P.token));
 }
 for(const change of [{as_of_date:'2026-10-01'},{recorded_plan_coverage_pct:99},{positions_with_recorded_plan:1},{private_records:[]}])assert.throws(()=>validateSuccessionContext({...fixture(),...change},P.token));
 assert.throws(()=>validateSuccessionContext(fixture(),'legacy-v1:1'));
});
test('suppressed public partitions remain null and cannot disclose a small cell',()=>{
 const d={...fixture(),positions_with_recorded_plan:null,positions_without_recorded_plan:null,recorded_plan_coverage_pct:null,plan_coverage_suppressed:true,positions_with_ready_now:null,positions_without_ready_now:null,ready_now_plan_pct:null,ready_now_suppressed:true,suppression_reason:'plan_partition_small_cell'};
 const result=validateSuccessionContext(d,P.token);assert.equal(result.positions_with_recorded_plan,null);
 assert.throws(()=>validateSuccessionContext({...d,positions_with_recorded_plan:3},P.token));
});
