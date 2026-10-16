import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGuidedCompletion} from './helpers/guided-completion-render.mjs';

test('enabled tracking explains explicit confirmation and read-only Track without promising sharing or execution',()=>{
 const html=renderGuidedCompletion(true);
 assert.match(html,/review and confirm proposed dated measurements in chat/);
 assert.match(html,/inspect the saved measurements in Track/);
 assert.match(html,/Saving a plan does not record execution or achieved results/);
 assert.match(html,/Share Action Plan is not available yet/);
 assert.doesNotMatch(html,/future features|not enabled|<button|<a[ >]/);
});
test('disabled tracking stays unavailable and does not direct users into an enabled workflow',()=>{
 const html=renderGuidedCompletion(false);
 assert.match(html,/Progress tracking is not enabled in this environment/);
 assert.match(html,/Share Action Plan is not available yet/);
 assert.doesNotMatch(html,/confirm proposed|measurements in Track|<button|<a[ >]/);
});
