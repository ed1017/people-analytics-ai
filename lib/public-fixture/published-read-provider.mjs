import { canonicalJson, sha256, validateReadBody } from './read-provider.mjs';
export const SNAPSHOT_CONTRACT = 'public-headcount-data-snapshot-v1';
const targets = ['/api/headcount', '/api/headcount-trend'];
const reject = message => { throw Error(`Invalid public snapshot: ${message}`); };
function keys(value, expected) {
 if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== expected.sort().join('|')) reject('keys');
}
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function freeze(value) { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);} return value; }
export function parsePublishedSnapshot(text, trustedDigest) {
 if(typeof text!=='string' || Buffer.byteLength(text)>1024*1024) reject('size');
 if(!isHash(trustedDigest) || sha256(text)!==trustedDigest) reject('manifest digest');
 let manifest; try {manifest=JSON.parse(text);} catch {reject('JSON');}
 keys(manifest,['schemaVersion','contract','provenance','documents']);
 if(manifest.schemaVersion!==1 || manifest.contract!==SNAPSHOT_CONTRACT) reject('identity');
 keys(manifest.provenance,['origin','capturedAt','parity']);
 const source=manifest.provenance;
 if(source.origin!=='https://www.ed-ai.app' || source.parity!=='two-unfiltered-get-data-fields-only' || typeof source.capturedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(source.capturedAt) || !Number.isFinite(Date.parse(source.capturedAt)) || new Date(source.capturedAt).toISOString()!==source.capturedAt) reject('provenance');
 if(!Array.isArray(manifest.documents) || manifest.documents.length!==2) reject('coverage');
 const seen=new Set();
 for(const doc of manifest.documents){
  keys(doc,['target','sha256','body']);
  if(!targets.includes(doc.target)||seen.has(doc.target))reject('target'); seen.add(doc.target);
  validateReadBody(doc.target,doc.body);
  if(doc.sha256!==sha256(canonicalJson(doc.body)))reject('content digest');
 }
 const headcount=manifest.documents.find(doc=>doc.target==='/api/headcount').body.headcount;
 const trend=manifest.documents.find(doc=>doc.target==='/api/headcount-trend').body;
 if(trend.length!==33 || trend[0].snapshot_date!=='2024-01-31' || trend.at(-1).snapshot_date!=='2026-09-30' || trend.at(-1).headcount!==headcount)reject('snapshot coverage');
 for(let i=0;i<trend.length;i++)if(trend[i].snapshot_date!==new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10))reject('monthly coverage');
 return freeze(manifest);
}
export function createPublishedReadProvider(text,trustedDigest){
 const manifest=parsePublishedSnapshot(text,trustedDigest);
 const bodies=new Map(manifest.documents.map(doc=>[doc.target,doc.body]));
 return Object.freeze({contract:SNAPSHOT_CONTRACT,parity:manifest.provenance.parity,read(target,{method='GET'}={}){
  const status=method!=='GET'?405:typeof target!=='string'||!/^\/api\/[a-z]+(?:-[a-z]+)*$/.test(target)?400:!bodies.has(target)?404:200;
  const body=status===200?bodies.get(target):{error:status===405?'method_not_supported':status===400?'noncanonical_target':'unsupported_fixture_target'};
  return freeze({status,headers:{'content-type':'application/json','cache-control':'no-store','x-fixture-contract':SNAPSHOT_CONTRACT},body});
 }});
}
