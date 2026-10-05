import assert from 'node:assert/strict';
import test from 'node:test';
import {explicitHomeGoal} from '../lib/home-explicit-goal.ts';
test('direct outcomes preserve exact wording without inferred population or research reframing',()=>{for(const value of ['Reduce turnover','Improve retention by Q3','I need more AI capability without increasing headcount','We want better manager support'])assert.equal(explicitHomeGoal(value),value);assert.equal(explicitHomeGoal('  Reduce turnover  '),'Reduce turnover');});
test('open discovery, questions and oversized text do not become direct goal declarations',()=>{for(const value of ['What issues should we investigate?','Find a workforce problem','Explain this evidence','Reduce turnover?','Reduce turnover\nwith an unspecified scope','Improve '+ 'x'.repeat(240),''])assert.equal(explicitHomeGoal(value),null);});
