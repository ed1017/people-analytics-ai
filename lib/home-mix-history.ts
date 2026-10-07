/** Immutable browser history of actually executed searches; writes belong to the caller's transaction. */
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {verifyHomeMix,type HomeMixEvaluation} from './home-mix-runtime.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {createHomeMixRecord,readHomeMixRecord,type HomeMixRecord} from './home-mix-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical} from './workforce-mix-search-core.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
export const homeMixHistoryField='homeMixHistoryV1';
export type HomeMixHistoryEntry={before:BundleDraft;evaluation:HomeMixEvaluation;selection:HomeMixRecord|null;createdAt:string};
export type HomeMixHistory={version:1;goalId:string;entries:HomeMixHistoryEntry[]};
export type HomeMixCommit={previous:unknown;history:HomeMixHistory;draft:BundleDraft};
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export async function readHomeMixHistory(raw:unknown,goalId:string,signal?:AbortSignal):Promise<HomeMixHistory|null>{
 if(raw===undefined||raw===null)return {version:1,goalId,entries:[]};
 try{
  if(!validateJson(raw)||JSON.stringify(raw).length>2*1024*1024)return null;
  const h=raw as HomeMixHistory;
  if(Object.keys(h).sort().join()!=='entries,goalId,version'||h.version!==1||h.goalId!==goalId||!Array.isArray(h.entries)||h.entries.length>12)return null;
  for(const entry of h.entries){
   signal?.throwIfAborted();if(Object.keys(entry).sort().join()!=='before,createdAt,evaluation,selection'||!readBundleDraft(entry.before)||entry.before.binding.goalId!==goalId||!/^\d{4}-\d\d-\d\dT/.test(entry.createdAt)||!Number.isFinite(Date.parse(entry.createdAt)))return null;
   const checked=await verifyHomeMix(entry.evaluation,entry.before,signal);if(!checked?.report||checked.context.status!=='ready')return null;
   if(entry.selection){const selected=await readHomeMixRecord(entry.selection,signal);if(!selected||!same(selected.request,checked.context.source.request)||!same(selected.report,checked.report)||selected.createdAt!==entry.createdAt)return null;}
  }
  return structuredClone(h);
 }catch(error){if(signal?.aborted)throw error;return null;}
}
export async function prepareHomeMixCommit(before:BundleDraft,raw:unknown,candidateId:string|null,createdAt:string,previous:unknown,signal?:AbortSignal):Promise<HomeMixCommit>{
 const evaluation=await verifyHomeMix(raw,before,signal);
 if(!evaluation?.report||evaluation.context.status!=='ready')throw Error('The current staffing search cannot be verified.');
 const history=await readHomeMixHistory(previous,before.binding.goalId,signal);if(!history)throw Error('Saved staffing search history cannot be verified; it is retained.');
 const selection=candidateId?await createHomeMixRecord(evaluation.context,evaluation.report,candidateId,createdAt,signal):null;
 const draft=selection?.proposal.draft??before;
 if(!/^\d{4}-\d\d-\d\dT/.test(createdAt)||!Number.isFinite(Date.parse(createdAt)))throw Error('Supply a valid search receipt timestamp.');
 const duplicate=history.entries.some(entry=>bundleInputKey(entry.before)===bundleInputKey(before)&&entry.evaluation.report?.reportFingerprint===evaluation.report!.reportFingerprint&&(entry.selection?.proposal.candidateId??null)===candidateId);
 if(!duplicate){if(history.entries.length>=12)throw Error('Staffing search history is full. Existing reports are kept.');history.entries.push({before:structuredClone(before),evaluation,selection,createdAt});}
 if(JSON.stringify(history).length>2*1024*1024)throw Error('Staffing search history is full. Existing reports are kept.');
 return {previous:previous??null,history,draft:structuredClone(draft)};
}
export async function verifyHomeMixCommit(commit:HomeMixCommit,current:unknown,draft:BundleDraft,signal?:AbortSignal){
 if(!same(commit.previous,current??null)||!same(commit.draft,draft))throw Error('Staffing search or saved history changed before this action.');
 const history=await readHomeMixHistory(commit.history,draft.binding.goalId,signal);if(!history)throw Error('Staffing search history cannot be verified.');
 const previous=await readHomeMixHistory(current,draft.binding.goalId,signal);if(!previous||history.entries.length<previous.entries.length||history.entries.length>previous.entries.length+1||!same(history.entries.slice(0,previous.entries.length),previous.entries))throw Error('Previous staffing searches must remain unchanged.');
 if(!history.entries.some(entry=>bundleInputKey(entry.selection?.proposal.draft??entry.before)===bundleInputKey(draft)))throw Error('This draft does not match the verified staffing search.');
 return history;
}
