import test from 'node:test';import assert from 'node:assert/strict';
import {captureStaffingDelivery} from '../releases/2026-10-21/source/lib/home-staffing-delivery.ts';
test('calendar deadlines defer to ordinary date interpretation, never become cost horizons',()=>{
 for(const text of ['The readiness deadline is January 2027.','We need 6 analysts by January 1, 2027.','Staffing deadline: 2027-01-16.','The budget covers twelve months. The delivery deadline is January 2027.','Change the deadline to January 2027.','Change the deadline to May 2027.'])assert.deepEqual(captureStaffingDelivery({id:'t',text}),{months:null,turnId:'t',quote:text,issue:null},text);
 for(const text of ['What if the deadline is January 2027?','Do not change the deadline to January 2027.'])assert.equal(captureStaffingDelivery({id:'t',text}),null);
});
test('invalid and conflicting relative deadlines still fail closed',()=>{
 for(const text of ['The deadline is 0 months.','The delivery deadline is 25 months.','We need 6 analysts within 2.5 months.','Deadline is January 2027 or within 0 months.','Deadline is within 3 months or 4 months.'])assert.ok(captureStaffingDelivery({id:'t',text})?.issue,text);
 assert.equal(captureStaffingDelivery({id:'t',text:'We need 6 analysts within 3 months.'}).months,3);
});


test('preserve-only deadline instructions do not block explicit calendar/budget corrections',()=>{
 for(const text of ['Reduce the budget to USD 50000. Hires arrive April 1, 2027; the readiness deadline remains January 2027. Do not invent lower costs or silently relax the deadline.','The deadline remains January 2027. Never extend the deadline.'])assert.equal(captureStaffingDelivery({id:'t',text})?.issue,null,text);
 for(const text of ["Do not change the deadline.","Don't relax the deadline.","Don\u2019t relax the deadline.",'Never move the staffing deadline.'])assert.equal(captureStaffingDelivery({id:'t',text}),null,text);
 for(const text of ['Do not change the deadline to 0 months.','Do not change the deadline to 25 months.','Do not change the deadline to within 2.5 months.'])assert.ok(captureStaffingDelivery({id:'t',text})?.issue,text);
});
