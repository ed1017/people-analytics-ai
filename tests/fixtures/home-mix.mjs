import {actionBinding} from '../../lib/home-action-drafts.ts';
import {createBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {emptyWorkforcePlanInput} from '../../lib/workforce-increment.ts';
import {bundleProposalFixture} from './home-bundles.mjs';
export const entered = value => ({value, kind: 'user-entered', basis: 'Explicit synthetic Home test assumption; not verified evidence.'});
export const unknown = () => ({value: null, kind: 'unknown', basis: null});
export const bounds = (build, move, buy) => ({build: entered({min: build[0], max: build[1]}), move: entered({min: move[0], max: move[1]}), buy: entered({min: buy[0], max: buy[1]})});
export function refreshOrigins(draft) {
  const capacity = draft.inputs.capacity;
  capacity.origins = Object.fromEntries(Object.entries(capacity.input).map(([key, value]) => [key, {kind: value ? 'user-entered' : 'unknown', basis: value ? 'Explicit synthetic staffing assumption.' : null}]));
}
export async function homeMixFixture(patch = {}) {
  const roles = Number(patch.roles ?? 5), goal = `Add ${roles} engineering roles over 12 months`;
  const binding = await actionBinding('home-mix-test', goal, {sources: [{id: 'W1', status: 'loaded', facts: {headcount: 100}}]}, {});
  const draft = createBundleDraft(bundleProposalFixture(goal).bundles[0], binding);
  const staffing = {...emptyWorkforcePlanInput(), businessUnit: 'TECH', jobProfile: 'ENGINEER', intent: 'additional', roles: String(roles),
    build: '0', move: '0', buy: String(roles), backfills: '0', planningMonth: '2027-01', months: '12', recruitingStart: '2027-01-01',
    arrivalMode: 'explicit', arrivalDate: '2027-01-01', buildMonth: '2027-01', moveMonth: '2027-01', backfillDate: '2027-01-01',
    annualHireCost: '96000', hireFee: '0', annualBackfillCost: '96000', backfillFee: '0', internalAnnualCostChange: '0', trainingCash: '0', trainingHours: '0',
    budget: '1000000', maxAddedEmployees: String(roles * 2), deadlineMonth: '2027-12', ...patch};
  Object.assign(draft.inputs.scope, {population: entered('Engineering'), businessUnit: entered(staffing.businessUnit), jobProfile: entered(staffing.jobProfile),
    startMonth: entered(staffing.planningMonth), months: entered(Number(staffing.months)), demand: entered(roles), capacityRequired: entered(true)});
  draft.inputs.capacity = {input: staffing, origins: {}, flows: [
    {id: 'build', path: 'build', componentIds: ['c2'], groupId: 'builders'}, {id: 'move', path: 'move', componentIds: ['c3'], groupId: 'movers'},
    {id: 'buy', path: 'buy', componentIds: ['c5'], groupId: null}, {id: 'backfills', path: 'backfills', componentIds: ['c5'], groupId: null},
  ]};
  refreshOrigins(draft);
  draft.inputs.groups = [{id: 'builders', label: 'Build group', count: entered(roles)}, {id: 'movers', label: 'Move group', count: entered(roles)}];
  draft.inputs.groupsDisjoint = entered(true);
  draft.inputs.memberships = draft.bundle.components.map(component => ({componentId: component.id, groupIds: [component.id === 'c3' ? 'movers' : 'builders'], complete: entered(true)}));
  draft.inputs.timing.forEach(row => {row.start = entered(staffing.planningMonth + '-01'); row.finish = entered(staffing.planningMonth + '-01');});
  draft.inputs.dependenciesConfirmed = entered(true);
  draft.inputs.costsDistinct = entered(true);
  draft.inputs.costReviews.forEach(row => row.complete = entered(true));
  draft.inputs.expenses = [{id: 'vendor', label: 'Vendor allowance', kind: 'cash', amount: entered(7500), startMonth: entered(staffing.planningMonth), months: entered(1)}];
  draft.inputs.expenseLinks = ['hireStaffingCost', 'backfillStaffingCost', 'internalSalaryUplift', 'recruitingFees', 'trainingCash'].map(field => ({expenseId: 'capacity:' + field, componentIds: ['c2', 'c3', 'c5'], allocations: null}));
  draft.inputs.expenseLinks.push({expenseId: 'vendor', componentIds: ['c1', 'c5'], allocations: null});
  draft.inputs.budget = {amount: entered(Number(staffing.budget)), basis: entered('cash')};
  return {draft};
}
