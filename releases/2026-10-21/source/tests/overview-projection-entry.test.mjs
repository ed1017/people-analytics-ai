import test from 'node:test';import assert from 'node:assert/strict';
import {overviewProjectionQuestion,projectionEntryValues} from '../lib/projection-entry.ts';

test('submitted headcount planning remains reachable after composer clears',()=>{
 const question='Project headcount for 6 months with 12 hires per month and 3 exits per month.';
 assert.equal(overviewProjectionQuestion('',question),question);
 assert.equal(overviewProjectionQuestion('   ',question),question);
});
test('eligible current draft takes precedence over the previous planning request',()=>{
 const previous='Model headcount for 3 months.',draft='Project headcount for 6 months with 12 hires per month and 3 exits per month.';
 assert.equal(overviewProjectionQuestion(draft,previous),draft);
 assert.deepEqual(projectionEntryValues(overviewProjectionQuestion(draft,previous)),projectionEntryValues(overviewProjectionQuestion('',draft)));
 assert.deepEqual(projectionEntryValues(draft),{months:'6',hires:'12',exits:'3',transfersIn:'',transfersOut:''});
});
test('generic gap planning opens editable controls without inventing numerical assumptions',()=>{
 for(const verb of ['close','fill','address','solve','plan','manage'])for(const domain of ['staffing','capacity','headcount']){
  const q=`Help me ${verb} the ${domain} gap.`;
  assert.equal(overviewProjectionQuestion(q,''),q);
  assert.equal(overviewProjectionQuestion('',q),q);
  assert.deepEqual(projectionEntryValues(q),{months:'',hires:'',exits:'',transfersIn:'',transfersOut:''});
 }
});
test('unrelated editing or follow-up text does not erase the last submitted planning entry',()=>{
 const previous='Help me close the staffing gap.';
 for(const draft of ['What assumptions are being used?','Thank you','How do we improve financial analysis skills?','Show headcount last year'])assert.equal(overviewProjectionQuestion(draft,previous),previous);
});
test('ordinary questions, skill plans and history do not create headcount forecasts',()=>{
 for(const q of ['What is current headcount?','Show headcount last year','Compare recorded headcount from January through September','Which groups have a capacity gap?','How do we close the financial analysis skills gap?','Model training effort for analysts','What is causing turnover?','']){
  assert.equal(overviewProjectionQuestion(q,''),null,q);
  assert.equal(overviewProjectionQuestion('',q),null,q);
 }
});
test('selection preserves original draft and question text without rewriting history',()=>{
 const state={draft:'  Model headcount for six months with two hires per month.  ',lastQuestion:'Project headcount for 3 months.'},before=structuredClone(state);
 assert.equal(overviewProjectionQuestion(state.draft,state.lastQuestion),state.draft);
 assert.deepEqual(state,before);
 assert.deepEqual(projectionEntryValues(state.draft),{months:'6',hires:'2',exits:'',transfersIn:'',transfersOut:''});
});
