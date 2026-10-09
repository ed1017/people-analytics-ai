/** Coordinator-local artifact retrieval. Never deploy this as a runtime endpoint. */
import {readFileSync,mkdirSync,writeFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {decodeReceipt,receiptPrefix} from '../tests/helpers/swp-preview-receipt-log.mjs';
import {decodePrivateReview,recipientIdentity,privateReviewTemplate} from './private-review.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const write=(dir,name,value)=>writeFileSync(join(dir,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
export function recoverPrivateLogs(lines,privatePem,binding){
 if(!Array.isArray(lines)||lines.length>15000)throw Error('private_review_invalid');
 const groups=new Map();
 for(const line of lines){
  if(typeof line!=='string'||!line.startsWith(receiptPrefix))continue;
  const part=JSON.parse(line.slice(receiptPrefix.length));
  if(!part.recordId?.startsWith(binding.runId+'_private-review-'))continue;
  const group=groups.get(part.recordId)??[];group.push(line);groups.set(part.recordId,group);
 }
 const envelopes=[...groups.values()].map(group=>{
  const outer=decodeReceipt(group).receipt;
  if(outer.sanitization?.redacted!==false||outer.sanitization?.truncated!==false)throw Error('private_review_invalid');
  return outer.receipt?.envelope;
 });
 return {artifact:decodePrivateReview(envelopes,privatePem,binding),envelopes};
}
export function reviewText(artifact){
 const reply=artifact.records.reply,checks=artifact.records.checks;
 return '# Private model review\n\n'+JSON.stringify({reviewId:artifact.reviewId,binding:artifact.binding,redacted:artifact.redacted,
  replayEligible:artifact.records.completion.replayEligible,report:artifact.records.completion.report},null,2)+
  '\n\nExact sanitized route response (answer, plans and full state):\n\n'+(reply?.replyText??'No route response was captured.')+
  '\n\nExact sanitized visible provider outputs:\n\n'+JSON.stringify(Object.fromEntries(Object.entries(artifact.records).filter(([stage])=>stage.startsWith('provider-'))),null,2)+
  '\n\nStructural checks and provider final:\n\n'+JSON.stringify(checks??null,null,2)+'\n';
}
async function main(args){
 const [mode,...paths]=args;
 if(mode==='key'&&paths.length===1){
  const dir=paths[0];mkdirSync(dir,{mode:0o700});const pair=generateKeyPairSync('x25519');
  const publicPem=pair.publicKey.export({type:'spki',format:'pem'});
  write(dir,'recipient-private.pem',pair.privateKey.export({type:'pkcs8',format:'pem'}));
  write(dir,'recipient-public.pem',publicPem);
  write(dir,'private-review-template.json',{...privateReviewTemplate(),recipientPublicKeyPem:publicPem,recipientKeySha256:recipientIdentity(publicPem).sha256});
  console.log('Private recipient files created; no run authorized.');return;
 }
 if(mode!=='decrypt'||paths.length!==4)throw Error('private_artifact_arguments');
 const [keyPath,bindingPath,logsPath,dir]=paths;
 if(!lstatSync(keyPath).isFile()||(lstatSync(keyPath).mode&0o077)!==0)throw Error('private_key_permissions');
 const binding=JSON.parse(readFileSync(bindingPath)),lines=JSON.parse(readFileSync(logsPath));
 const {artifact,envelopes}=recoverPrivateLogs(lines,readFileSync(keyPath),binding);
 mkdirSync(dir,{mode:0o700});write(dir,'sealed-records.json',envelopes);write(dir,'artifact.json',artifact);write(dir,'review.md',reviewText(artifact));
 write(dir,'SHA256SUMS',['artifact.json','review.md','sealed-records.json'].map(name=>hash(readFileSync(join(dir,name)))+'  '+name).join('\n')+'\n');
 console.log(JSON.stringify({reviewId:artifact.reviewId,redacted:artifact.redacted,replayEligible:artifact.records.completion.replayEligible,recordCount:Object.keys(artifact.records).length}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main(process.argv.slice(2)).catch(()=>{console.error('PRIVATE_ARTIFACT_FAILED');process.exitCode=1;});
