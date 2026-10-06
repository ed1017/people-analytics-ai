// @ts-expect-error Native Node tests share TypeScript source.
import {readHomeBundleProposal,inspectHomeBundleProposal,readBundleDiagnostic,type BundleDiagnostic,type BundleProposal} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,validActionBinding,actionUsage,type ActionBinding,type ActionUsage} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {evidenceFingerprint,readEvidenceFingerprint,type EvidenceFingerprint} from './home-evidence-identity.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleResponseDiagnostic,type BundleResponseDiagnostic} from './home-bundle-response-diagnostic.ts';
export const HOME_BUNDLE_REQUEST='Prepare coordinated solution bundles for my exact pinned goal.';
// @ts-expect-error Native Node tests share TypeScript source.
export {homeBundleOutputTokens} from './home-bundle-response-diagnostic.ts';
export const bundlePreparationField='homeBundlePreparationV1';
export type BundlePreparation={version:1;binding:ActionBinding;proposal:BundleProposal;preparedAt:string;usage:ActionUsage;evidenceFingerprint?:EvidenceFingerprint};
export function readBundlePreparation(raw:unknown,binding:ActionBinding,packet:unknown):BundlePreparation|null{
 try{
  if(!validActionBinding(binding)||!validateJson(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>40*1024)return null;
  const value=plain(raw);if(!value||!exactKeys(value,['version','binding','proposal','preparedAt','usage',...(value.evidenceFingerprint!==undefined?['evidenceFingerprint']:[])])||value.version!==1||!validActionBinding(value.binding)||actionBindingKey(value.binding)!==actionBindingKey(binding)||typeof value.preparedAt!=='string'||!Number.isFinite(Date.parse(value.preparedAt)))return null;
  if(value.evidenceFingerprint!==undefined&&!readEvidenceFingerprint(value.evidenceFingerprint,binding))return null;
  const usage=plain(value.usage),keys=Object.keys(actionUsage(null,0));if(!usage||!exactKeys(usage,keys)||typeof usage.model!=='string'||usage.model.length>80||Object.entries(usage).some(([key,item])=>key!=='model'&&item!==null&&(!Number.isSafeInteger(item)||Number(item)<0||Number(item)>100000000)))return null;
  const proposal=readHomeBundleProposal(value.proposal,binding.goal,packet);return proposal?structuredClone({...value,proposal}) as BundlePreparation:null;
 }catch{return null}
}
type Outcome={status:'ready'|'cached';draft:BundlePreparation}|{status:'explicit_required'|'stale'|'failed';diagnostic?:BundleDiagnostic;responseDiagnostic?:BundleResponseDiagnostic};
type Args={mode:'new-pin'|'explicit'|'passive';binding:ActionBinding;packet:unknown;stored:unknown;isCurrent:()=>boolean;prepare:(signal:AbortSignal)=>Promise<{proposal:unknown;usage?:unknown;diagnostic?:unknown;responseDiagnostic?:unknown}>;commit:(patch:{field:string;value:BundlePreparation})=>void};
export function createHomeBundlePreparation(){
 let epoch=0;const attemptedGoals=new Set<string>(),flights=new Map<string,{promise:Promise<Outcome>;abort:AbortController}>();
 return {
  invalidate(){epoch++;for(const flight of flights.values())flight.abort.abort();flights.clear();},
  run(args:Args):Promise<Outcome>{
   if(!validActionBinding(args.binding))return Promise.resolve({status:'failed'});if(!args.isCurrent())return Promise.resolve({status:'stale'});
   const binding=structuredClone(args.binding),packet=structuredClone(args.packet),key=actionBindingKey(binding),cached=readBundlePreparation(args.stored,binding,packet);
   if(cached)return Promise.resolve({status:'cached',draft:cached});if(args.mode==='passive')return Promise.resolve({status:'explicit_required'});
   const running=flights.get(key);if(running)return running.promise;
   if(args.mode==='new-pin'&&(attemptedGoals.has(binding.goalId)||attemptedGoals.size>=100))return Promise.resolve({status:'explicit_required'});
   if(attemptedGoals.size<100)attemptedGoals.add(binding.goalId);
   if(flights.size){epoch++;for(const flight of flights.values())flight.abort.abort();flights.clear();}
   const ticket=epoch,abort=new AbortController(),start=Date.now(),current=()=>ticket===epoch&&!abort.signal.aborted&&args.isCurrent();
   const promise=Promise.resolve().then(async():Promise<Outcome>=>{
    try{if(!current())return {status:'stale'};const reply=await args.prepare(abort.signal);if(!current())return {status:'stale'};
     const remote=readBundleDiagnostic(reply.diagnostic);if(remote){const responseDiagnostic=readBundleResponseDiagnostic(reply.responseDiagnostic);return {status:'failed',diagnostic:remote,...(responseDiagnostic?{responseDiagnostic}:{})};}
     const inspected=inspectHomeBundleProposal(reply.proposal,binding.goal,packet),proposal=inspected.proposal;if(!proposal)return {status:'failed',diagnostic:inspected.diagnostic};
     const fingerprint=await evidenceFingerprint(packet,'canonical');
     if(binding.evidenceDigest!==fingerprint.canonical)fingerprint.mode='ordered';
     const draft:BundlePreparation={version:1,binding,proposal,preparedAt:new Date().toISOString(),usage:actionUsage(reply.usage,Date.now()-start),evidenceFingerprint:fingerprint};
     if(!readBundlePreparation(draft,binding,packet))return {status:'failed'};if(!current())return {status:'stale'};
     try{args.commit({field:bundlePreparationField,value:draft})}catch{return {status:'failed',diagnostic:'storage_failure'}}return {status:'ready',draft:structuredClone(draft)};
    }catch{return {status:current()?'failed':'stale',diagnostic:'client_transport'}}finally{if(flights.get(key)?.promise===promise)flights.delete(key);}
   });flights.set(key,{promise,abort});return promise;
  },
 };
}
