/** Ephemeral synthetic recipient, never a run authorization or real review key. */
import {generateKeyPairSync,createHash} from 'node:crypto';
import {createPrivateReview,decodePrivateReview} from './private-review.mjs';
const pair=generateKeyPairSync('x25519');
const privatePem=pair.privateKey.export({type:'pkcs8',format:'pem'});
export const offlinePrivateConfig={transport:'sealed-vercel-build-log-v1',reviewId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 recipientPublicKeyPem:pair.publicKey.export({type:'spki',format:'pem'}),recipientKeySha256:createHash('sha256').update(pair.publicKey.export({type:'spki',format:'der'})).digest('hex'),
 retention:'private-until-reviewed',delivery:'private-task-messages'};
export function offlinePrivateReview(record=()=>{},binding={runId:'offline-only',appCommit:'64b5124b329c26bf35cdf6eed2fb02b98d06bad1'}){
 const envelopes=[];
 const sink=createPrivateReview({config:offlinePrivateConfig,binding,record:(stage,value)=>{record(stage,value);envelopes.push(value.envelope);}});
 return {sink,envelopes,decode:()=>decodePrivateReview(envelopes,privatePem,binding)};
}
