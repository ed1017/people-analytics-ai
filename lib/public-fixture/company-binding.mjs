import {importCompanyFixture} from './company-import.mjs';
import {canonicalJson,createPublicFixtureProvider,sha256} from './read-provider.mjs';

export const COMPANY_BINDING_CONTRACT='invented-company-binding-v1';
const fail=()=>{throw Error('Company binding rejected');};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
/** Trusted pins come from the reviewed fixture configuration, never a request.
 * Pure in-memory integration. No environment, IO, production fallback or AI.
 */
export function createCompanyBinding({configText,rowsText,expected}){
 if(!expected||Object.keys(expected).sort().join('|')!=='companyKey|configSha256|sourceSha256'||
  typeof configText!=='string'||typeof rowsText!=='string'||!hash(expected.configSha256)||!hash(expected.sourceSha256)||
  sha256(configText)!==expected.configSha256||sha256(rowsText)!==expected.sourceSha256)fail();
 const imported=importCompanyFixture(configText,rowsText);
 if(imported.report.companyKey!==expected.companyKey)fail();
 const provider=createPublicFixtureProvider(imported.manifestText,imported.manifestSha256);
 const trend=provider.read('/api/headcount-trend').body;
 const identity=Object.freeze({contract:COMPANY_BINDING_CONTRACT,companyKey:imported.report.companyKey,
  configSha256:expected.configSha256,sourceSha256:expected.sourceSha256,manifestSha256:imported.manifestSha256,
  firstSnapshot:trend[0].snapshot_date,asOf:trend.at(-1).snapshot_date,dataClass:'invented-test-only',scope:'company',parity:'none'});
 const token=`${COMPANY_BINDING_CONTRACT}:${identity.companyKey}:${sha256(canonicalJson(identity))}`;
 return Object.freeze({identity,token,read(target,{method='GET',datasetToken}={}){
  const headers=Object.freeze({'content-type':'application/json','cache-control':'no-store',
   'x-content-type-options':'nosniff','x-workforce-dataset':token,'x-company-key':identity.companyKey,'x-company-as-of':identity.asOf,
   'x-fixture-contract':COMPANY_BINDING_CONTRACT});
  // A token identifies a snapshot, not a credential or authorization boundary.
  if(datasetToken!==token)return Object.freeze({status:409,headers,body:Object.freeze({error:'company_snapshot_mismatch'})});
  const result=provider.read(target,{method});
  return Object.freeze({...result,headers});
 }});
}
