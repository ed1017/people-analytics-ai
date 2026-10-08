import test from 'node:test';import assert from 'node:assert/strict';
import {workloadFixture} from './fixtures/workload-capacity.mjs';
import {createWorkloadPlanSnapshot,readWorkloadPlanSnapshot} from '../lib/workload-plan-records.ts';
import {reviewBundleProposal} from '../lib/home-bundle-reconciliation.ts';
import {validateJson} from '../lib/local-decisions.ts';
import {calculateWorkloadCapacity} from '../lib/workload-capacity.ts';
const at='2026-10-08T22:15:00Z';
async function fixture(){const i=await workloadFixture(),s=createWorkloadPlanSnapshot(i,i.options[0].id,at,calculateWorkloadCapacity(i).sourceKey),o=s.report.options[0],d=o.normalizedDraft,r=reviewBundleProposal(d);return {i,s,d,r};}
test('complete workload snapshot replays and fits existing JSON validation',async()=>{const {s,d,r}=await fixture();assert.ok(validateJson(s));assert.deepEqual(readWorkloadPlanSnapshot(s,d,r),s);assert.ok(JSON.stringify(s).length>100000);assert.equal(s.report.options[0].rows[0].managerRequiredHours,28);assert.equal(s.report.options[0].rows[0].sourceRemovedHours,80);});
test('tampered input/report/selection/ordinary draft/result cannot replay',async()=>{const {s,d,r}=await fixture();for(const mutate of [s=>s.input.managers[0].uncommittedHoursByMonth[0].value=200,s=>s.report.options[0].rows[0].sourceGapHours=4,s=>s.report.options[0].cash=1,s=>s.selectedOptionId='missing',s=>s.assumptionsAcceptedAt='never',s=>s.extra='bad']){const changed=structuredClone(s);mutate(changed);assert.equal(readWorkloadPlanSnapshot(changed,d,r),null);}const wrong=structuredClone(d);wrong.revision++;assert.equal(readWorkloadPlanSnapshot(s,wrong,r),null);const result=structuredClone(r);result.cashTotal=1;assert.equal(readWorkloadPlanSnapshot(s,d,result),null);});
