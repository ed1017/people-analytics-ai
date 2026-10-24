import test from 'node:test';
import assert from 'node:assert/strict';
import {sliderEdit,sliderNumber,sliderExtent,discreteMonths} from '../lib/planning-slider.ts';
const month={min:1,max:24,extent:24,precision:0,preservePrecision:true,keyboardStep:1,unit:'months'};
test('months remain discrete even with legacy preservePrecision flag',()=>{
 assert.equal(discreteMonths(month),true);
 for(const value of [1,1.1,2.49,2.5,14.148153,23.9,24,100,-10]){const n=Number(sliderEdit(value,month));assert.ok(Number.isInteger(n)&&n>=1&&n<=24);}
 assert.equal(sliderEdit(14.148153,month),'14');assert.equal(sliderEdit(14.8,month),'15');
 for(const value of ['','14.148153','-','25','0','NaN'])assert.equal(sliderNumber(value,month),null);
 assert.equal(sliderNumber('14',month),14);assert.equal(sliderExtent('14.148153',month),24);
});
test('FTE/rates keep exact fractional precision',()=>{
 const rate={...month,min:-100,max:100,precision:6,unit:'FTE/month'};
 assert.equal(discreteMonths(rate),false);assert.equal(sliderNumber('-8.123456789',rate),-8.123456789);assert.equal(sliderEdit(-8.123456789,rate),'-8.123456789');
});
