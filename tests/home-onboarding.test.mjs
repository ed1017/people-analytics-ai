import test from 'node:test';
import assert from 'node:assert/strict';
import {isFirstHomeVisit,HOME_INSTRUCTIONS_DISMISSED_KEY} from '../lib/home-onboarding.ts';
const reader=entries=>({getItem:key=>Object.hasOwn(entries,key)?entries[key]:null});
test('only an untouched readable browser qualifies for automatic Home instructions',()=>assert.equal(isFirstHomeVisit(reader({}),reader({})),true));
for(const key of [HOME_INSTRUCTIONS_DISMISSED_KEY,'insights-to-action.decisions.v1','insights-to-action.goals.v1','people-analytics.saved-workforce-scenarios.v1']){
 test(key+' suppresses automatic instructions, including empty or damaged saved work',()=>{for(const value of ['', 'invalid', '{}'])assert.equal(isFirstHomeVisit(reader({[key]:value}),reader({})),false)});
}
for(const key of ['insights-to-action.decisions.recovery.v1','insights-to-action.guided-return.v1'])test(key+' recovery suppresses automatic instructions',()=>assert.equal(isFirstHomeVisit(reader({}),reader({[key]:'pending'})),false));
test('unreadable local or session storage fails closed without writing',()=>{const blocked={getItem:()=>{throw Error('blocked')}};assert.equal(isFirstHomeVisit(blocked,reader({})),false);assert.equal(isFirstHomeVisit(reader({}),blocked),false)});
