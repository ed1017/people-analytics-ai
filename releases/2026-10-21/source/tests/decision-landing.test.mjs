import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {decisionLandingExample} from '../lib/decision-landing.ts';
import {createSwpDemo,compareSwpDemo,guidedOptionEffort} from '../lib/swp-demo.ts';
import {staffingCashBreakdown} from '../lib/guided-plan-summary.ts';
import {DecisionLanding} from './fixtures/decision-landing-module.mjs';
test('same demo engine retains every comparable eligible option for the reviewed five-FTE basis',async()=>{
 const x=await decisionLandingExample();assert.deepEqual([x.requiredFte,x.qualifiedFte,x.gapFte,x.existingPeople,x.budget],[8,3,5,10,325000]);
 const draft=await createSwpDemo('guided-landing','2026-09-30T12:00:00Z'),comparison=await compareSwpDemo(draft);
 const expected=comparison.options.filter(o=>!o.candidate.isReferenceMix&&o.candidate.status==='met');
 assert.equal(expected.length,3);assert.deepEqual(x.options.map(o=>o.id),expected.map(o=>o.id));
 for(const [i,option]of expected.entries()){
  assert.deepEqual(x.options[i].cash,staffingCashBreakdown(option.draft,option.candidate.cash));
  assert.equal(x.options[i].uncoveredHours,guidedOptionEffort(option)?.shortfallHours??null);
  assert.equal(x.options[i].cash.end,x.options[0].cash.end);
 }
 assert.deepEqual(x.options.map(o=>o.cash.total),[26800,319000,324000]);
});
test('retained historical decision-landing component has one popup entry; current Home is tested separately',()=>{const html=renderToStaticMarkup(React.createElement(DecisionLanding,{onQuestion:()=>{}}));assert.equal((html.match(/<button/g)||[]).length,1);assert.match(html,/Try a planning scenario/);assert.match(html,/aria-haspopup="dialog"/);assert.match(html,/fictional service team/);assert.doesNotMatch(html,/aria-pressed|Scripted example/);assert.match(html,/mailto:edwinom.nyc@gmail.com/);});
