import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceHomeDecisionContext, buildHomeActionPlanRequest, HOME_FIND_ISSUE_PROMPT } from '../lib/home-decision-journey.ts';
import { overviewBriefingPrompt } from '../lib/overview-briefing.ts';

test('question to plan retains the issue and latest correction in the same scope', () => {
  let context = advanceHomeDecisionContext(null, 'scopeA', 'Improve manager feedback by Q2');
  context = advanceHomeDecisionContext(context, 'scopeA', 'Use Q3 instead; budget is unknown');
  const plan = buildHomeActionPlanRequest(context, 'scopeA');
  assert.match(plan, /Improve manager feedback by Q2/);
  assert.match(plan, /Use Q3 instead; budget is unknown/);
  assert.match(plan, /later correction supersedes/);
});
test('reset and changed scope cannot reuse stale action-plan context', () => {
  const old = advanceHomeDecisionContext(null, 'scopeA', 'Old issue');
  assert.equal(buildHomeActionPlanRequest(null, 'scopeA'), null);
  assert.equal(buildHomeActionPlanRequest(old, 'scopeB'), null);
  const fresh = advanceHomeDecisionContext(old, 'scopeB', 'New scoped issue');
  assert.doesNotMatch(buildHomeActionPlanRequest(fresh, 'scopeB'), /Old issue/);
  const reset = advanceHomeDecisionContext(null, 'scopeA', 'Separate issue');
  assert.doesNotMatch(buildHomeActionPlanRequest(reset, 'scopeA'), /Old issue/);
});
test('a suggested issue retains the actual follow-up goal without treating a signal as proof', () => {
  let context = advanceHomeDecisionContext(null, 'scopeA', HOME_FIND_ISSUE_PROMPT);
  context = advanceHomeDecisionContext(context, 'scopeA', 'Investigate open positions; I need to understand capacity');
  const request = buildHomeActionPlanRequest(context, 'scopeA');
  assert.match(request, /Investigate open positions/);
  assert.match(request, /user-provided, not source evidence/);
  assert.match(request, /essential clarifying question/);
});
test('original issue survives longer conversations independently of bounded model history', () => {
  let context = advanceHomeDecisionContext(null, 'scopeA', 'Original business goal');
  for (let i = 0; i < 12; i++) context = advanceHomeDecisionContext(context, 'scopeA', 'Follow-up ' + i);
  const request = buildHomeActionPlanRequest(context, 'scopeA');
  assert.match(request, /Original business goal/);
  assert.match(request, /Follow-up 11/);
});
test('full-plan rules require evidence, options, unknown costs, next steps and proposed measures', () => {
  const rules = overviewBriefingPrompt([]);
  for (const text of ['Evidence and scope', 'Options and tradeoffs', 'Costs and unknown assumptions', 'Proposed next steps', 'Suggested success measures', 'ask one short essential clarifying question', 'do not invent owners, dates, commitments, ROI, skill improvement or results', 'No tool calls', 'company-wide']) assert.ok(rules.includes(text), text);
});
