import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioPlannerEntry} from '../lib/scenario-planner-entry.ts';
import {sliderNumber,sliderEdit} from '../lib/planning-slider.ts';
test('ordinary planning variations reveal the UI without treating exploration as planning',()=>{
 for(const q of ['How can we close a staffing gap?','We need 12 people in HR at level 10','Compare hiring and redeployment','What if demand increases?','Create a scenario plan','I need FTE to fill a capacity gap'])assert.equal(scenarioPlannerEntry(q),true,q);
 for(const q of ['', 'Which groups are at risk of a capacity gap in the next 3 months?','What was turnover last year?','Which roles had the fastest time to fill?','How has our headcount changed?'])assert.equal(scenarioPlannerEntry(q),false,q);
});
test('risk sliders retain adopted fractional rates and increment from the actual value',()=>{
 const spec={min:0,max:1e7,precision:6,preservePrecision:true,keyboardStep:1,extent:100,unit:'people/month'};
 for(const rate of [134/9,0,3.123456789]){
  assert.equal(sliderNumber(String(rate),spec),rate);
  assert.equal(Number(sliderEdit(sliderNumber(String(rate),spec)+1,spec)),rate+1);
 }
 assert.equal(sliderNumber('',spec),null);assert.equal(sliderNumber('-1',spec),null);
 assert.equal(sliderNumber('3.123456789',{...spec,preservePrecision:false}),null);
});
