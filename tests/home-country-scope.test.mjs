import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedHomeCountries} from '../lib/home-country-scope.ts';
const options=[{value:'US',label:'United States'},{value:'CA',label:'Canada'},{value:'GB',label:'United Kingdom'}];
test('unambiguous US and Canada requests offer only supported explicit scope',()=>{
 for(const question of ['what about in the US','How about USA?','in the U.S.','in the United States'])assert.deepEqual(requestedHomeCountries(question,options,'all'),{kind:'apply',options:[options[0]]});
 assert.equal(requestedHomeCountries('Canada retention',options,'all').options[0].value,'CA');
 assert.equal(requestedHomeCountries('in the US',options,'US').kind,'none');
});
test('ambiguous unsupported pronouns and external macro questions do not silently pick a country',()=>{
 assert.equal(requestedHomeCountries('Canada and the US',options,'all').kind,'ambiguous');
 assert.deepEqual(requestedHomeCountries('in Mexico',options,'all'),{kind:'unsupported',options:[]});
 assert.equal(requestedHomeCountries('what about us?',options,'all').kind,'none');
 assert.equal(requestedHomeCountries('US BLS unemployment',options,'all').kind,'none');
 assert.equal(requestedHomeCountries('Canada',[],'all').kind,'unsupported');
});
