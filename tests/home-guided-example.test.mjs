import test from 'node:test';import assert from 'node:assert/strict';
import {GUIDED_EXAMPLE_PROMPT} from '../lib/home-decision-journey.ts';
import {homeUserGoalForPin} from '../lib/home-planning-intent.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
test('guided capacity prompt reaches the real user Pin and assumption parsers without an investigation proposal',async()=>{
 const goal=homeUserGoalForPin([GUIDED_EXAMPLE_PROMPT]);assert.equal(goal,GUIDED_EXAMPLE_PROMPT);
 const binding=await actionBinding('guided',goal,{sources:[]},{}),draft=prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z',{goalContext:{goal,notes:[]}});
 assert.equal(draft.inputs.whatIf.kind,'capacity');assert.equal(draft.inputs.whatIf.target.value,3);assert.equal(draft.inputs.whatIf.target.kind,'user-entered');assert.equal(draft.inputs.scope.months.value,6);assert.equal(draft.inputs.whatIf.unitCost.kind,'illustrative');
});
