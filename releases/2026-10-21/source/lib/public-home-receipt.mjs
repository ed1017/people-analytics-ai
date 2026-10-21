import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {normalizeHomePack} from './home-pack.mjs';
const issued=new WeakMap();
export const PUBLIC_HOME_RECEIPT_CONTRACT='public-home-supplied-evidence-v1';
const basis=s=>s.status!=='loaded'?'unavailable':['I3','D1'].includes(s.id)?'fictional-or-unverified-session-input':s.id==='P1'?'synthetic-public-scenario':'synthetic-public-aggregate';
export const publicHomeSourceReceipts=pack=>pack.sources.map(s=>({id:s.id,scope:s.scope,asOf:s.date,status:s.status,basis:basis(s),limitation:s.limitation}));
/** Internal issuance after server verification, never an HTTP deserializer or authorization API. */
export function bindPublicHomeReceipt(receipt,pack,context){
 issued.set(receipt,{receipt:JSON.stringify(receipt),packet:JSON.stringify(pack),scope:context.scope,filters:JSON.stringify(context.filters)});
 return receipt;
}
export function isPublicHomeReceiptCandidate(receipt){return !!receipt&&(issued.has(receipt)||receipt.datasetToken===P.token||receipt.contract!==undefined||receipt.provenance==='synthetic-public-projection');}
/** Synchronous consumers require the same issued object and exact normalized packet.
 * Serialization/round trips must reverify; no client-supplied receipt can authorize reads. */
export function acceptsPublicHomeReceipt(receipt,evidence,context){
 try{
  const bound=issued.get(receipt),pack=normalizeHomePack(evidence);
  return !!bound&&(!context||(context.scope===bound.scope&&JSON.stringify(context.filters)===bound.filters))&&receipt.contract===PUBLIC_HOME_RECEIPT_CONTRACT&&receipt.provenance==='synthetic-public-projection'&&receipt.datasetToken===P.token&&receipt.databaseIntegrityCertified===false&&receipt.independentForecastValidation===false&&/^[a-f0-9]{64}$/.test(receipt.bundleDigest)&&/^[a-f0-9]{64}$/.test(receipt.packetSha256)&&bound.receipt===JSON.stringify(receipt)&&bound.packet===JSON.stringify(pack)&&JSON.stringify(receipt.sources)===JSON.stringify(publicHomeSourceReceipts(pack));
 }catch{return false;}
}
export function acceptsGroundedAggregate(receipt,evidence,source,context){
 if(!receipt||!source)return false;
 const publicReceipt=isPublicHomeReceiptCandidate(receipt);
 if(publicReceipt&&!acceptsPublicHomeReceipt(receipt,evidence,context))return false;
 const entry=Array.isArray(receipt.sources)?receipt.sources.find(s=>s?.id===source.id):null;
 return !!entry&&entry.status==='loaded'&&entry.scope===source.scope&&entry.asOf===source.date&&entry.basis===(publicReceipt?'synthetic-public-aggregate':'database-backed-aggregate');
}
