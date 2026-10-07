import {localWorkforceTask} from './workforce-search-client';
import type {BundleDraft} from './home-bundle-reconciliation';
import type {HomeMixEvaluation} from './home-mix-runtime';
import type {HomeMixAdapter} from './home-mix-orchestration';
export const homeMixAdapter:HomeMixAdapter<BundleDraft,HomeMixEvaluation>={
 version:'home-planning-source-v1/home-assumption-mix-v1',
 search:(request,signal)=>localWorkforceTask('home-mix',{draft:request.source},signal),
 read:(raw,request,signal)=>localWorkforceTask('home-mix-read',{raw,draft:request.source},signal),
};
