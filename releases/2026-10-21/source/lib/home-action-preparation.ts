// @ts-expect-error Native Node tests share TypeScript source.
import {readHomeActionProposal} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,validActionBinding,readActionDraft,actionDraftPatch,actionUsage,type ActionBinding,type ActionDraft} from './home-action-drafts.ts';
type Outcome={status:'ready'|'cached';draft:ActionDraft}|{status:'explicit_required'|'stale'|'failed'};
type Args={mode:'new-pin'|'explicit'|'passive';binding:ActionBinding;packet:unknown;stored:unknown;isCurrent:()=>boolean;prepare:(signal:AbortSignal)=>Promise<{proposal:unknown;usage?:unknown}>;commit:(patch:ReturnType<typeof actionDraftPatch>)=>void};
/** Local orchestration only. No transport, model inputs, automatic retry, or calculator invocation. */
export function createHomeActionPreparation(){
 let epoch=0;
 const attemptedGoals=new Set<string>(),flights=new Map<string,{promise:Promise<Outcome>;abort:AbortController}>();
 return {
  invalidate(){epoch++;for(const flight of flights.values())flight.abort.abort();flights.clear();},
  run(args:Args):Promise<Outcome>{
   if(!validActionBinding(args.binding))return Promise.resolve({status:'failed'});
   if(!args.isCurrent())return Promise.resolve({status:'stale'});
   const binding=structuredClone(args.binding),packet=structuredClone(args.packet),key=actionBindingKey(binding),cached=readActionDraft(args.stored,binding,packet);
   if(cached)return Promise.resolve({status:'cached',draft:cached});
   if(args.mode==='passive')return Promise.resolve({status:'explicit_required'});
   const running=flights.get(key);if(running)return running.promise;
   if(args.mode==='new-pin'&&attemptedGoals.has(binding.goalId))return Promise.resolve({status:'explicit_required'});
   // Bound session bookkeeping; overflow requires a later explicit preparation, never an automatic retry.
   if(args.mode==='new-pin'&&attemptedGoals.size>=100)return Promise.resolve({status:'explicit_required'});
   if(attemptedGoals.size<100)attemptedGoals.add(binding.goalId);
   if(flights.size){epoch++;for(const flight of flights.values())flight.abort.abort();flights.clear();}
   const ticket=epoch,abort=new AbortController(),start=Date.now();
   const current=()=>ticket===epoch&&!abort.signal.aborted&&args.isCurrent();
   const promise=Promise.resolve().then(async():Promise<Outcome>=>{
    try{
     if(!current())return {status:'stale'};
     const reply=await args.prepare(abort.signal);
     if(!current())return {status:'stale'};
     const proposal=readHomeActionProposal(reply.proposal,binding.goal,packet);if(!proposal)return {status:'failed'};
     const draft:ActionDraft={version:1,status:'proposed',binding,preparedAt:new Date().toISOString(),proposal,localEvaluations:[],usage:actionUsage(reply.usage,Math.max(0,Date.now()-start))};
     if(!readActionDraft(draft,binding,packet))return {status:'failed'};
     if(!current())return {status:'stale'};
     args.commit(actionDraftPatch(draft));return {status:'ready',draft:structuredClone(draft)};
    }catch{return {status:current()?'failed':'stale'}}
    finally{if(flights.get(key)?.promise===promise)flights.delete(key);}
   });
   flights.set(key,{promise,abort});return promise;
  },
 };
}
