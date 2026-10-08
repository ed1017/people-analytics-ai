/** Portable replay of synthetic follow-ups on a separately supplied anchor.
 * An anchor hash proves bytes, not provider origin or a saved/reloaded UI state. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bindClarificationReply,digest,fixture} from '../fixtures/swp-reference-continuation.mjs';
import {lane} from '../fixtures/swp-reference-synthetic-driver.mjs';
const [path,expected]=process.argv.slice(2);
if(process.argv.length!==4||!/^[a-f0-9]{64}$/.test(expected??''))throw Error('Supply private anchor file and its independently pinned SHA256.');
const bytes=readFileSync(path),sha=createHash('sha256').update(bytes).digest('hex');if(sha!==expected)throw Error('Anchor file identity changed.');
const anchor=JSON.parse(bytes),checked=bindClarificationReply(anchor.reply);
if(checked.replySha256!==anchor.replySha256||checked.stateSha256!==anchor.stateSha256||digest(anchor.state)!==checked.stateSha256)throw Error('Anchor reply/state binding changed.');
const run=await lane({suppliedAnchor:anchor});
console.log(JSON.stringify({fixtureId:fixture.id,fixtureSha256:digest(fixture),anchorFileSha256:sha,anchorReplySha256:checked.replySha256,anchorStateSha256:checked.stateSha256,anchorOrigin:'Must be checked against separate private origin record; state may be reconstructed.',continuationOrigin:'synthetic offline tool calls and replies; not observed model behavior',statuses:run.result.completedStages.map(s=>s.reviewStatus),finalReviewSha256:digest(run.result.review),retainedOpenerExact:digest(run.result.state.turns.slice(0,2))===digest(anchor.state.turns),providerCalls:0,fullAcceptance:false,paidExecutionAuthorized:false},null,2));
