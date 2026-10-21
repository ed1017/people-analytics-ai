import test from 'node:test';
import assert from 'node:assert/strict';
import {staffingStarterIntake} from '../releases/2026-10-21/source/lib/home-staffing-intake.ts';
import {emptySolutionState} from '../releases/2026-10-21/source/lib/home-solution-conversation.ts';
const request=()=>({goal:{id:'',statement:''},selectedId:null,catalog:null,goalContext:null,state:emptySolutionState(),message:{id:'question',text:'How can we close a staffing gap?'}});
test('bare quantified capacity goal retains the stated FTE without importing fictional inputs',()=>{for(const text of ['Close the 5 FTE capacity gap','How would we close a 2.5 FTE capacity gap?']){const r=request();r.message.text=text;const answer=staffingStarterIntake(r);assert.ok(answer);assert.match(answer.answer,/does not specify a role, dates, budget/);assert.doesNotMatch(answer.answer,/325,000|Service Analyst|Nov 2026/);}const r=request();r.message.text='Close the 5 FTE capacity gap with a $325,000 budget';assert.equal(staffingStarterIntake(r),null);});
test('initial exact starter asks without inferring any quantities',()=>{
 const r=request();assert.equal(staffingStarterIntake(r).questions.length,2);
 for(const text of ['How can we close a staffing gap of 3 analysts?','How can we close a staffing gap? Use 6 months.','Revise our staffing gap plan']){r.message.text=text;assert.equal(staffingStarterIntake(r),null);}
});
test('existing context never gets replaced by starter intake',()=>{
 const changes=[r=>r.goal.statement='Fill the analyst gap',r=>r.selectedId='saved',r=>r.catalog={},r=>r.goalContext={},r=>r.state.turns.push({id:'prior',role:'user',text:'We need 3 analysts.'}),r=>r.state.constraints.push({}),r=>r.state.working.push({}),r=>r.state.analyses.push({}),r=>r.state.requiredStaffing={},r=>r.state.staffingDeliveryTarget={},r=>r.state.hiringBudget={},r=>r.state.businessPlanning={}];
 for(const change of changes){const r=request();change(r);assert.equal(staffingStarterIntake(r),null);}
});
