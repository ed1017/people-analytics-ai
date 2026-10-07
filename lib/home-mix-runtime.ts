// @ts-expect-error Native Node tests share TypeScript source.
import {homeMixPlanningRequest} from './home-mix-planning.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {resolveHomeMixContext, type HomeMixContext} from './home-mix-context.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {searchHomeMixes, type HomeMixReport} from './home-mix-search.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readHomeMixReport} from './home-mix-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical} from './workforce-mix-search-core.ts';
import type {BundleDraft} from './home-bundle-reconciliation';
export type HomeMixEvaluation={context:HomeMixContext;report:HomeMixReport|null;notes:string[]};
const applies=(draft:BundleDraft)=>!!draft.inputs.capacity||draft.inputs.whatIf?.kind==='capacity'||draft.inputs.scope.capacityRequired.value===true;
const notApplicable={status:'not-applicable' as const,reason:'This goal has no additional whole-position capacity requirement.'};
export async function evaluateHomeMix(draft:BundleDraft,signal?:AbortSignal):Promise<HomeMixEvaluation>{
 signal?.throwIfAborted();const {request,notes}=homeMixPlanningRequest(draft),context=applies(draft)?await resolveHomeMixContext(request):notApplicable;
 return {context,notes,report:context.status==='ready'?await searchHomeMixes(context,signal):null};
}
export async function verifyHomeMix(raw:unknown,draft:BundleDraft,signal?:AbortSignal):Promise<HomeMixEvaluation|null>{
 try{
  const value=raw as HomeMixEvaluation,{request,notes}=homeMixPlanningRequest(draft),context=applies(draft)?await resolveHomeMixContext(request):notApplicable;
  if(canonical(value.context)!==canonical(context)||canonical(value.notes)!==canonical(notes))return null;
  const report=context.status==='ready'?await readHomeMixReport(value.report,context,signal):null;
  if(context.status==='ready'&&!report||context.status!=='ready'&&value.report!==null)return null;
  return {context,notes,report};
 }catch(error){if(signal?.aborted)throw error;return null;}
}
