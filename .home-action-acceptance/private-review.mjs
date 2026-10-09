/** Visible model output only; sealed before any durable receipt or log emission. */
import {createHash,createPublicKey,createPrivateKey,generateKeyPairSync,diffieHellman,hkdfSync,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {sanitize} from './sanitize.mjs';
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const algorithm='X25519-HKDF-SHA256-AES-256-GCM';
const fail=()=>{throw Error('private_review_invalid');};
const initialized=new WeakSet();
export function requirePrivateReview(value){if(!initialized.has(value))throw Error('private_review_required');}
const stages=['request','provider-1','provider-2','provider-3','reply','checks','canary','completion'];
const b64=(value,size)=>{if(typeof value!=='string'||value.length>1500000)fail();const bytes=Buffer.from(value,'base64');if(bytes.toString('base64')!==value||size&&bytes.length!==size)fail();return bytes;};
export function recipientIdentity(pem){
 try{const key=createPublicKey(pem);if(key.asymmetricKeyType!=='x25519'||key.export({format:'pem',type:'spki'})!==pem)fail();const der=key.export({format:'der',type:'spki'});return {key,sha256:digest(der)};}catch{fail();}
}
export function validatePrivateReview(config){
 if(!config||Object.keys(config).sort().join(',')!=='delivery,recipientKeySha256,recipientPublicKeyPem,retention,reviewId,transport'||
  config.transport!=='sealed-vercel-build-log-v1'||config.delivery!=='private-task-messages'||config.retention!=='private-until-reviewed'||
  !/^[a-f0-9-]{36}$/.test(config.reviewId??'')||typeof config.recipientPublicKeyPem!=='string'||config.recipientPublicKeyPem.length>2000||
  recipientIdentity(config.recipientPublicKeyPem).sha256!==config.recipientKeySha256)fail();
 return true;
}
export const privateReviewTemplate=()=>({transport:'sealed-vercel-build-log-v1',reviewId:null,recipientPublicKeyPem:null,recipientKeySha256:null,retention:'private-until-reviewed',delivery:'private-task-messages'});
export function sealReview(value,config,binding,stage,knownSecret=''){
 validatePrivateReview(config);if(!stages.includes(stage))fail();
 const sanitized=sanitize({stage,binding,value},knownSecret),bytes=Buffer.from(JSON.stringify(sanitized));
 if(bytes.length>1000000)throw Error('private_review_size');
 const ephemeral=generateKeyPairSync('x25519'),salt=randomBytes(32),iv=randomBytes(12);
 const header={version:1,algorithm,reviewId:config.reviewId,recipientKeySha256:config.recipientKeySha256,binding,stage,
  ephemeralPublicKey:ephemeral.publicKey.export({format:'der',type:'spki'}).toString('base64'),salt:salt.toString('base64'),iv:iv.toString('base64')};
 const key=hkdfSync('sha256',diffieHellman({privateKey:ephemeral.privateKey,publicKey:recipientIdentity(config.recipientPublicKeyPem).key}),salt,Buffer.from('home-private-review-v1'),32);
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(header)));
 const envelope={header,ciphertext:Buffer.concat([cipher.update(bytes),cipher.final()]).toString('base64'),tag:cipher.getAuthTag().toString('base64')};
 return {envelope,sha256:digest(envelope),plaintextSha256:digest(bytes),redacted:sanitized.sanitization.redacted};
}
export function openReview(envelope,privatePem,expectedBinding){
 try{
  const h=envelope?.header,key=createPrivateKey(privatePem);
  if(h?.version!==1||h.algorithm!==algorithm||!stages.includes(h.stage)||key.asymmetricKeyType!=='x25519'||
   digest(createPublicKey(key).export({format:'der',type:'spki'}))!==h.recipientKeySha256||digest(h.binding)!==digest(expectedBinding))fail();
  const ephemeral=createPublicKey({key:b64(h.ephemeralPublicKey),format:'der',type:'spki'});if(ephemeral.asymmetricKeyType!=='x25519')fail();
  const secret=hkdfSync('sha256',diffieHellman({privateKey:key,publicKey:ephemeral}),b64(h.salt,32),Buffer.from('home-private-review-v1'),32);
  const decipher=createDecipheriv('aes-256-gcm',secret,b64(h.iv,12));decipher.setAAD(Buffer.from(JSON.stringify(h)));decipher.setAuthTag(b64(envelope.tag,16));
  const bytes=Buffer.concat([decipher.update(b64(envelope.ciphertext)),decipher.final()]);if(bytes.length>1000000)fail();
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(value.receipt?.stage!==h.stage||digest(value.receipt.binding)!==digest(h.binding)||value.sanitization?.truncated!==false||typeof value.sanitization.redacted!=='boolean')fail();
  return value;
 }catch{fail();}
}
export function createPrivateReview({config,binding,record,knownSecret=''}){
 validatePrivateReview(config);if(typeof record!=='function'||!binding||!binding.runId)fail();
 const receipts=[],seen=new Set();let finished=false,redacted=false;
 // Prove crypto/key support before any aggregate/provider call, without emitting prose.
 sealReview({preflight:true},config,binding,'canary',knownSecret);
 const sink={
  write(stage,value){
   if(finished||seen.has(stage)||stage==='completion')fail();
   const sealed=sealReview(value,config,binding,stage,knownSecret);
   record('private-review-'+stage,{envelope:sealed.envelope});
   seen.add(stage);redacted||=sealed.redacted;receipts.push({stage,sha256:sealed.sha256,plaintextSha256:sealed.plaintextSha256});
  },
  finish(report){
   if(finished)fail();finished=true;
   const sealed=sealReview({receipts,report,replayEligible:report.executionComplete===true&&report.phase==='model-assessment'&&!redacted},config,binding,'completion',knownSecret);
   record('private-review-completion',{envelope:sealed.envelope});
   return {reviewId:config.reviewId,recipientKeySha256:config.recipientKeySha256,completionSha256:sealed.sha256,redacted:redacted||sealed.redacted,recordCount:receipts.length+1};
  },
 };
 initialized.add(sink);return sink;
}
export function decodePrivateReview(envelopes,privatePem,binding){
 if(!Array.isArray(envelopes)||envelopes.length>8||!envelopes.length)fail();
 const records=new Map(),sealed=new Map();let reviewId;
 for(const envelope of envelopes){
  const row=openReview(envelope,privatePem,binding),stage=row.receipt.stage;
  if(records.has(stage)||reviewId&&reviewId!==envelope.header.reviewId)fail();reviewId=envelope.header.reviewId;
  records.set(stage,row);sealed.set(stage,digest(envelope));
 }
 const completion=records.get('completion');if(!completion)fail();const manifest=completion.receipt.value;
 if(!Array.isArray(manifest.receipts)||manifest.receipts.length!==records.size-1)fail();
 for(const item of manifest.receipts)if(item.stage==='completion'||sealed.get(item.stage)!==item.sha256||digest(records.get(item.stage))!==item.plaintextSha256)fail();
 if(new Set(manifest.receipts.map(row=>row.stage)).size!==manifest.receipts.length)fail();
 return {version:1,reviewId,binding,redacted:[...records.values()].some(row=>row.sanitization.redacted),records:Object.fromEntries([...records].map(([stage,row])=>[stage,row.receipt.value]))};
}
