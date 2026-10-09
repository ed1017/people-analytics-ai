/** Private inputs are supplied externally; this script contains no model receipt. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {reviseDemandReview} from '../../lib/swp-demand.ts';
import {reviseReferencedDemandReview,demandReferenceId} from '../../lib/swp-demand-reference.ts';
import {fixture} from '../fixtures/swp-clarification-continuation.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const [reviewPath,reviewHash,argsPath,argsHash]=process.argv.slice(2);
if(process.argv.length!==6||![reviewHash,argsHash].every(x=>/^[a-f0-9]{64}$/.test(x??'')))throw Error('Supply review path/hash and argument path/hash from the separate private evidence manifest.');
const reviewBytes=readFileSync(reviewPath),argsBytes=readFileSync(argsPath);
assert.equal(hash(reviewBytes),reviewHash);assert.equal(hash(argsBytes),argsHash);
const review=JSON.parse(reviewBytes),args=JSON.parse(argsBytes),requestId='swp-preview-4',turnId='swp-preview-user-4';
const context={conversationMode:'business-swp-demand-v1',classification:'unverified-business-inputs',intakeId:'swp-demand-preview-fixture',datasetToken:fixture.datasetToken,boundGoal:{id:'',statement:''},revision:1};
const turns=[{id:turnId,text:fixture.followups[2]}],reviewRef=demandReferenceId(requestId,0);
const edit={reviewRef,changes:args.edit.changes.map(c=>{
 assert.equal(c.quantity.scope,review.spec[c.field].scope);assert.equal(c.quantity.period,review.spec[c.field].period);
 const {basis:ignored,...quantity}=c.quantity;void ignored;
 return {...c,quantity:{...quantity,scope:{ref:'retain'},period:{ref:'retain'}}};
})};
const next=reviseReferencedDemandReview(review,edit,context,requestId,turns,turnId,reviewRef);
const legacy=reviseDemandReview(review,args.edit,context,requestId,turns,turnId);
assert.equal(JSON.stringify(next),JSON.stringify(legacy));assert.equal(next.result.status,'needs-inputs');assert.equal(next.result.missing.length,2);
console.log(JSON.stringify({previousReviewSha256:reviewHash,oldArgumentsSha256:argsHash,referenceArgumentsSha256:hash(JSON.stringify({edit})),resultSha256:hash(JSON.stringify(next)),oldArgumentBytes:argsBytes.length,newArgumentBytes:Buffer.byteLength(JSON.stringify({edit})),status:next.result.status,missing:next.result.missing,exactLegacyFixedResultRetained:true,origin:'Reference arguments reconstructed from recorded legacy edit; outputs are offline replay, not newly observed model behavior.',providerCalls:0,historicalPaidRunReclassified:false},null,2));
