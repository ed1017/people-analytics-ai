// Shared synthetic local application fixture; no model or service requests.
import {actionBinding, actionBindingKey} from '../../lib/home-action-drafts.ts';
import {createBundleDraft, bundleInputKey} from '../../lib/home-bundle-reconciliation.ts';
import {saveBundleDraftPatch, attachBundlePatch} from '../../lib/home-bundle-records.ts';
import {bundleProposalFixture} from './home-bundles.mjs';
import {blankDevelopmentQuote, developmentCatalog} from '../../lib/development-costs.ts';
import {emptyWorkforcePlanInput} from '../../lib/workforce-increment.ts';
import {workforceInputGroups} from '../../lib/workforce-guided-intake.ts';
import {emptySolutionInputs, createWorkforceSolution} from '../../lib/workforce-solution.ts';
import {actionPlanApplicationSource, actionPlanDevelopmentScopeKey, actionPlanQuoteKey} from '../../lib/action-plan-application-preview.ts';

const stamp = '2026-10-05T12:00:00Z';
const binding = await actionBinding('preview-goal', 'Review additional engineering capacity', {sources: [{id: 'W1', status: 'loaded', facts: {headcount: 100}}]}, {});
const entered = value => ({value, kind: 'user-entered', basis: 'Explicit reviewed fixture assumption; unverified.'});
function attach(draft, workspace, id = 'attachment-1', supersedes = null) {
  return attachBundlePatch(saveBundleDraftPatch(workspace, draft).value, draft,
    {confirmed: true, bindingKey: actionBindingKey(draft.binding), inputKey: bundleInputKey(draft), acknowledgeUnknowns: true}, id, stamp, supersedes).value;
}
export function applicationFixture(editDraft = () => {}) {
  const draft = createBundleDraft(bundleProposalFixture(binding.goal).bundles[0], binding);
  Object.assign(draft.inputs.scope, {population: entered('Engineering cohort'), businessUnit: entered('TECH'), jobProfile: entered('ENGINEER'),
    startMonth: entered('2027-01'), months: entered(6), demand: entered(2), capacityRequired: entered(true)});
  draft.inputs.groups = [{id: 'cohort', label: 'Reviewed learning group', count: entered(10)}, {id: 'other', label: 'Separate manager group', count: entered(5)}];
  draft.inputs.groupsDisjoint = entered(true);
  draft.inputs.memberships = draft.bundle.components.map(item => ({componentId: item.id, groupIds: [item.id === 'c1' ? 'other' : 'cohort'], complete: entered(true)}));
  const input = {...emptyWorkforcePlanInput(), businessUnit: 'TECH', jobProfile: 'ENGINEER', intent: 'additional', roles: '2',
    build: '1', move: '0', buy: '1', backfills: '0', planningMonth: '2027-01', months: '6', arrivalMode: 'explicit',
    arrivalDate: '2027-03-01', buildMonth: '2027-04', trainingCash: '10000', trainingHours: '200', loadedHourlyCost: '50',
    annualHireCost: '120000', hireFee: '2000', internalAnnualCostChange: '12000'};
  draft.inputs.capacity = {input, origins: Object.fromEntries(Object.entries(input).map(([key, value]) =>
    [key, {kind: value ? 'user-entered' : 'unknown', basis: value ? 'Explicit reviewed capacity assumption.' : null}])),
    flows: [{id: 'build', path: 'build', componentIds: ['c2', 'c3'], groupId: 'cohort'}, {id: 'buy', path: 'buy', componentIds: ['c5'], groupId: null}]};
  editDraft(draft);
  const workspace = attach(draft), source = actionPlanApplicationSource(workspace.attachments[0]);
  const inputs = emptySolutionInputs();
  for (const [section, , fields] of workforceInputGroups) for (const [field] of fields) inputs[section][field] = input[field];
  inputs.scope.goalStatement = binding.goal;
  inputs.training.trainingCash = '7000';
  const solution = createWorkforceSolution('solution-1', binding.goalId, inputs, stamp);
  const quote = structuredClone(developmentCatalog[0]);
  return {binding, workspace, attachmentId: 'attachment-1', currentDraft: draft,
    destination: {goalId: binding.goalId, revision: 12, workforceSolution: solution, selectedPlanningScenario: 'Baseline', headcount: 100,
      development: {custom: [], draft: blankDevelopmentQuote(), goal: binding.goal, selected: quote.id,
        options: [{quote, goal: binding.goal, inputs: {participants: '', sessions: '9', hours: '', fee: '999', additionalFees: '', hourlyCost: ''}}]}},
    developmentTarget: {componentId: 'c2', optionIndex: 0, quoteReview: {source, componentId: 'c2', optionIndex: 0, quoteKey: actionPlanQuoteKey(quote),
      scopeKey: actionPlanDevelopmentScopeKey(draft), confirmedCompatible: true, loadedHourlyCostCompatible: true}},
    capacityReview: {source, solutionId: solution.id, version: 1, confirmedAdditionalCapacity: true}};
}
