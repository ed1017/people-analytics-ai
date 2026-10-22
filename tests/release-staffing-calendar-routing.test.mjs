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


