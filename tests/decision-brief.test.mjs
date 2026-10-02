import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDecisionBrief,recordExplicitApproval} from '../lib/decision-brief.ts';
import {evidenceTrustLabel} from '../lib/evidence-trust.ts';
test('proposals and assumptions never become approvals',()=>{const b={...emptyDecisionBrief(),proposals:'AI suggests approving a pilot',assumptions:'Estimated cost'};assert.deepEqual(b.approvals,[]);assert.equal(recordExplicitApproval(b,'','2026-10-02'),b)});
test('approval requires an explicit recorded statement and remains bounded',()=>{const b=emptyDecisionBrief();const next=recordExplicitApproval(b,'User confirms review only','2026-10-02');assert.equal(b.approvals.length,0);assert.deepEqual(next.approvals,[{text:'User confirms review only',recordedAt:'2026-10-02'}]);assert.equal(recordExplicitApproval(next,'x'.repeat(1001),'2026-10-02'),next)});
test('trust labels distinguish public benchmarks, synthetic evidence and modeled costs',()=>{assert.match(evidenceTrustLabel('skills'),/Synthetic/);assert.match(evidenceTrustLabel('labor-market'),/Public BLS/);assert.match(evidenceTrustLabel('training-coaching'),/Fictional/);assert.match(evidenceTrustLabel('development-planning'),/Deterministic/);assert.match(evidenceTrustLabel('scenario-modeling'),/not approvals/)});
