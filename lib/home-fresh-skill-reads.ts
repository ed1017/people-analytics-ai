import {AsyncLocalStorage} from 'node:async_hooks';
import type {SupabaseClient} from '@supabase/supabase-js';

const skillColumns='skill_id, skill_code, skill_name, skill_category, employees_in_roles_requiring_skill, employees_with_observed_proficiency, employees_meeting_requirement, employees_below_or_missing_requirement, avg_required_proficiency, avg_observed_proficiency, avg_proficiency_gap, profile_coverage_pct, requirement_met_pct, avg_requirement_weight';
const learningColumns='skill_id, skill_code, skill_name, skill_category, employees_in_roles_requiring_skill, employees_below_or_missing_requirement, requirement_met_pct';
type Client=Pick<SupabaseClient,'from'>;
type Binding={authorization:Client;datasetToken:string;schema:'public';scope:string;signal:AbortSignal};
type Entry=Binding&{operation:string;result:Promise<unknown>};
type RequestReads={active:boolean;shareGaps:boolean;entries:Entry[]};
const context=new AsyncLocalStorage<{request:RequestReads;binding:Binding}>();

function cancellableRead<T>(load:()=>PromiseLike<T>,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.throwIfAborted();signal.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>{signal.throwIfAborted();return load();}).then(
   value=>{signal.removeEventListener('abort',abort);resolve(value);},
   error=>{signal.removeEventListener('abort',abort);reject(error);},
  );
 });
}

/** Only the Home verifier creates this scope. No process, session or cross-turn cache.
 * Bind the original grounding signal, not the dependent signal on each local Request.
 */
export function createFreshSkillReadRequest(shareGaps:boolean){
 const request:RequestReads={active:true,shareGaps,entries:[]};
 return {
  run<T>(binding:Binding,work:()=>Promise<T>):Promise<T>{
   if(!request.active)throw Error('Fresh read request is closed');
   binding.signal.throwIfAborted();
   return context.run({request,binding:{...binding}},work);
  },
  close(){request.active=false;request.entries.length=0;},
 };
}

async function freshRead<T>(client:Client,datasetToken:string,operation:string,load:(signal?:AbortSignal)=>PromiseLike<T>):Promise<T>{
 const current=context.getStore();
 if(!current)return load();
 const {request,binding}=current;
 if(!request.active)throw Error('Fresh read request is closed');
 binding.signal.throwIfAborted();
 // Client object identity represents the existing authorization; never key by a token/header.
 const key={...binding,authorization:client,datasetToken,operation};
 let entry=request.entries.find(item=>item.authorization===key.authorization&&item.datasetToken===key.datasetToken&&item.schema===key.schema&&item.scope===key.scope&&item.signal===key.signal&&item.operation===key.operation);
 if(!entry){
  const result=cancellableRead(()=>load(binding.signal),binding.signal);
  entry={...key,result};request.entries.push(entry);
 }
 const result=await entry.result as T;
 binding.signal.throwIfAborted();
 if(!request.active)throw Error('Fresh read request is closed');
 // Readers can normalize independently without mutating another reader's evidence.
 return structuredClone(result);
}

const skillGapQuery=(client:Client)=>client.from('skills_proficiency_gap_summary').select(skillColumns);
const learningGapQuery=(client:Client)=>client.from('skills_proficiency_gap_summary').select(learningColumns);
type SkillResult=Awaited<ReturnType<typeof skillGapQuery>>;
type LearningResult=Awaited<ReturnType<typeof learningGapQuery>>;
export function readFreshSkillGaps(client:Client,datasetToken:string,reader:'skills'):Promise<SkillResult>;
export function readFreshSkillGaps(client:Client,datasetToken:string,reader:'learning-development'):Promise<LearningResult>;
export function readFreshSkillGaps(client:Client,datasetToken:string,reader:'skills'|'learning-development'){
 const current=context.getStore();
 const share=current?.request.shareGaps&&current.binding.authorization===client&&current.binding.datasetToken===datasetToken;
 const full=reader==='skills'||share,columns=full?skillColumns:learningColumns;
 return freshRead<SkillResult|LearningResult>(client,datasetToken,'skills_proficiency_gap_summary:'+columns,signal=>{
  const query=full?skillGapQuery(client):learningGapQuery(client);
  return signal?query.abortSignal(signal):query;
 });
}

export function readFreshSkillHeadcount(client:Client,datasetToken:string){
 return freshRead(client,datasetToken,'dashboard_overview_current:headcount:single',signal=>{
  const query=client.from('dashboard_overview_current').select('headcount');
  return (signal?query.abortSignal(signal):query).single();
 });
}
