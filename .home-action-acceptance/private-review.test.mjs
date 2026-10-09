import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {sealReview,openReview,decodePrivateReview,createPrivateReview,recipientIdentity} from './private-review.mjs';
import {recoverPrivateLogs,reviewText} from './private-artifact.mjs';
import {sanitize} from './sanitize.mjs';
import {encodeReceipt} from '../tests/helpers/swp-preview-receipt-log.mjs';
import {validatePrivateRetrieval} from './guards.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const pair=generateKeyPairSync('x25519'),privatePem=pair.privateKey.export({type:'pkcs8',format:'pem'}),publicPem=pair.publicKey.export({type:'spki',format:'pem'});
const config={transport:'sealed-vercel-build-log-v1',reviewId:'11111111-1111-4111-8111-111111111111',recipientPublicKeyPem:publicPem,recipientKeySha256:recipientIdentity(publicPem).sha256,retention:'private-until-reviewed',delivery:'private-task-messages'};
const binding={runId:'offline-capture',appCommit:'4d65d4e0dd86bd467687747827da8930cc0a25cc',phase:'model-assessment'};
test('sealed chunk logs recover exact sanitized prose privately, preserving all state bytes',()=>{
 const lines=[],envelopes=[],sink=createPrivateReview({config,binding,knownSecret:'secret-key-value',record:(stage,value)=>{envelopes.push(value.envelope);lines.push(...encodeReceipt(binding.runId+'_'+stage,sanitize({stage,...value})));}});
 const value={replyText:JSON.stringify({answer:'EXACT_PRIVATE_PROSE',state:{nested:['unchanged',42]}})};
 sink.write('reply',value);sink.finish({phase:'model-assessment',executionComplete:true});
 assert.ok(!lines.join('\n').includes('EXACT_PRIVATE_PROSE'));const {artifact}=recoverPrivateLogs(lines,privatePem,binding);
 assert.deepEqual(artifact.records.reply,value);assert.ok(reviewText(artifact).includes('EXACT_PRIVATE_PROSE'));assert.equal(artifact.redacted,false);
 assert.deepEqual(decodePrivateReview(envelopes,privatePem,binding),artifact);
 assert.throws(()=>recoverPrivateLogs([...lines,lines[0]],privatePem,binding));
 assert.throws(()=>recoverPrivateLogs(lines.slice(1),privatePem,binding));
});
test('redaction is explicit and cannot be used for exact save replay; ciphertext tamper, key and binding substitution fail',()=>{
 const envelopes=[],sink=createPrivateReview({config,binding,knownSecret:'secret-key-value',record:(_stage,value)=>envelopes.push(value.envelope)});
 sink.write('reply',{replyText:'EXACT_PRIVATE_PROSE secret-key-value'});sink.finish({phase:'model-assessment',executionComplete:true});
 const artifact=decodePrivateReview(envelopes,privatePem,binding);assert.equal(artifact.redacted,true);assert.equal(artifact.records.completion.replayEligible,false);
 assert.equal(artifact.records.reply.replyText,'EXACT_PRIVATE_PROSE [REDACTED]');
 const altered=structuredClone(envelopes[0]);altered.ciphertext='AAAA'+altered.ciphertext.slice(4);
 assert.throws(()=>openReview(altered,privatePem,binding));assert.throws(()=>openReview(envelopes[0],privatePem,{...binding,runId:'wrong'}));
 assert.throws(()=>openReview(envelopes[0],generateKeyPairSync('x25519').privateKey.export({format:'pem',type:'pkcs8'}),binding));
 assert.throws(()=>decodePrivateReview(envelopes.slice(0,1),privatePem,binding));
 assert.throws(()=>recipientIdentity(privatePem),'private key must never be accepted as publishable recipient configuration');
});
test('invalid sink, oversized records and repeated stages refuse without plaintext logging',()=>{
 assert.throws(()=>createPrivateReview({config:{...config,recipientKeySha256:'0'.repeat(64)},binding,record(){}}));
 assert.throws(()=>sealReview('x'.repeat(1000001),config,binding,'reply'),/private_review_size/);
 const sink=createPrivateReview({config,binding,record(){}});sink.write('reply',{});assert.throws(()=>sink.write('reply',{}));sink.finish({});assert.throws(()=>sink.write('checks',{}));
});
test('paid retrieval acknowledgment must prove the decrypted nonce and pinned zero-provider receipt',()=>{
 const nonce='a'.repeat(64),receipt={privateCanaryNonceSha256:hash(nonce),privateReview:{completionSha256:'b'.repeat(64)}};
 const auth={privateReview:config,aggregateVerificationReceiptSha256:'c'.repeat(64)};
 const value={version:1,reviewId:config.reviewId,recipientKeySha256:config.recipientKeySha256,aggregateVerificationReceiptSha256:auth.aggregateVerificationReceiptSha256,completionSha256:receipt.privateReview.completionSha256,canaryNonce:nonce,reviewerDelivery:'private-task-messages'};
 const bytes=Buffer.from(JSON.stringify(value));auth.privateReviewRetrievalSha256=hash(bytes);assert.equal(validatePrivateRetrieval(bytes,auth,receipt),true);
 for(const patch of [{canaryNonce:'d'.repeat(64)},{completionSha256:'e'.repeat(64)},{reviewerDelivery:'public-log'},{recipientKeySha256:'f'.repeat(64)}]){
  const bad=Buffer.from(JSON.stringify({...value,...patch}));assert.throws(()=>validatePrivateRetrieval(bad,{...auth,privateReviewRetrievalSha256:hash(bad)},receipt));
 }
});
