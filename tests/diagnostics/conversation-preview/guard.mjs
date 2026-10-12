/** No automatic execution, credential lookup or network import. */
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {application,applicationTree,branch,question,binding,limits,model} from './config.mjs';
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const fail=code=>{throw Object.assign(Error('Bounded conversation Preview stopped: '+code),{code});};
const same=(a,b)=>hash(a)===hash(b),hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const controlFiles=['config.mjs','guard.mjs','sdk.mjs','entry.ts','bundle.mjs','run.mjs','guard.test.mjs','route.test.mjs','README.md','application-files.json'].map(p=>'tests/diagnostics/conversation-preview/'+p).concat('vercel.json');
export function sourceManifest(root){
 const base=JSON.parse(readFileSync(join(root,'tests/diagnostics/conversation-preview/application-files.json'),'utf8'));
 if(base.commit!==application||base.tree!==applicationTree)fail('application_identity');
 const paths=[];const walk=dir=>{for(const item of readdirSync(join(root,dir),{withFileTypes:true})){const p=dir+'/'+item.name;if(item.isDirectory())walk(p);else if(item.isFile())paths.push(p);else fail('source_entry');}};
 for(const dir of ['app','components','lib','public'])walk(dir);
 if(!same(paths.sort(),Object.keys(base.files).filter(p=>/^(app|components|lib|public)\//.test(p)).sort()))fail('application_file_set');
 for(const [p,digest] of Object.entries(base.files))if(hash(readFileSync(join(root,p)))!==digest)fail('application_changed');
 return {applicationCatalogSha256:hash(base),controlFiles:Object.fromEntries(controlFiles.map(p=>[p,hash(readFileSync(join(root,p)))]))};
}
export function unarmedManifest(root){return {version:1,kind:'conversation-deadline-one-shot',application,applicationTree,branch,questionSha256:hash(question),binding,limits,model,files:sourceManifest(root),overlayCommit:null,reviewReceiptSha256:null,reviewerGo:false,parentRelease:false,createdAt:null,expiresAt:null};}
export function validateManifest(m,env,now=Date.now()){
 if(m?.version!==1||m.kind!=='conversation-deadline-one-shot'||m.application!==application||m.applicationTree!==applicationTree||m.branch!==branch||m.questionSha256!==hash(question)||!same(m.binding,binding)||!same(m.limits,limits)||!same(m.model,model))fail('manifest_identity');
 if(!m.reviewerGo||m.reviewerGo!==true||m.parentRelease!==true||!hex(m.reviewReceiptSha256)||!hex(env.CONVERSATION_PREVIEW_MANIFEST_SHA256))fail('release_missing');
 if(!/^[a-f0-9]{40}$/.test(m.overlayCommit??'')||env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==binding.projectId||env.VERCEL_GIT_COMMIT_REF!==branch||env.VERCEL_GIT_COMMIT_SHA!==m.overlayCommit||env.CONVERSATION_PREVIEW_RUN_ID!==binding.runId||!/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID??''))fail('preview_identity');
 if(env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION!=='true'||env.NEXT_PUBLIC_GOAL_PROGRESS!=='true'||['OPENAI_BASE_URL','OPENAI_ORG_ID','OPENAI_PROJECT_ID','OPENAI_LOG','SWP_DEMO_MODEL_PROFILE','SWP_DEMO_MODEL_ID'].some(k=>env[k]))fail('configuration_override');
 const start=Date.parse(m.createdAt),end=Date.parse(m.expiresAt);if(!Number.isFinite(start)||!Number.isFinite(end)||start>now||now>=end||end<=start||end-start>3600000)fail('manifest_expired');
 return limits.reservedMicrousd;
}
const allowed=new Set(['model','reasoning','service_tier','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens','truncation']);
export function checkPayload(p){
 if(!p||Object.keys(p).some(k=>!allowed.has(k))||p.model!==model.id||!same(p.reasoning,{effort:model.reasoning})||p.service_tier!==model.serviceTier||p.max_output_tokens!==limits.outputTokensPerCall||p.parallel_tool_calls!==false||(p.truncation!==undefined&&p.truncation!=='disabled')||!Array.isArray(p.input)||!Array.isArray(p.tools)||p.tools.some(t=>t.type!=='function'))fail('provider_policy');
 const c=p.tool_choice,staffing=c&&typeof c==='object'&&Object.keys(c).length===2&&c.type==='function'&&c.name==='compare_required_staffing'&&p.tools.some(t=>t.name===c.name);
 if(c!=='auto'&&c!=='none'&&!staffing)fail('tool_choice');
 const bytes=Buffer.byteLength(JSON.stringify(p));if(bytes>limits.serializedBodyBytes)fail('payload_bytes');return bytes;
}
/** One process/build only. Parent one-build control prevents a new-process reset. */
export function createControl(record=()=>{},admit=()=>{}){
 let calls=0,wires=0,phase='ready',expected=null;
 const stop=code=>{phase='stopped';fail(code);};
 return {
  get calls(){return calls;},get wires(){return wires;},get stopped(){return phase==='stopped';},
  stop(){phase='stopped';},
  async dispatch(payload,options,send){
   if(phase!=='ready'||calls>=limits.generationCalls)stop('call_limit_or_parallel');
   try{admit();options?.signal?.throwIfAborted();if(!options?.signal||options.maxRetries!==0||options.timeout!==limits.callTimeoutMs)stop('request_options');const bytes=checkPayload(payload);
    calls++;phase='dispatch';expected=hash(payload);
    record('before-'+calls,{attempt:calls,payloadSha256:expected,payloadBytes:bytes,reservedMicrousd:limits.reservedMicrousd});
    const response=await send();options.signal.throwIfAborted();
    if(phase!=='sent')stop('missing_or_extra_wire');
    const u=response?.usage;
    record('provider-'+calls,{attempt:calls,requestId:response?._request_id??null,responseId:response?.id??null,status:response?.status??null,model:response?.model??null,serviceTier:response?.service_tier??null,usage:u?{input_tokens:u.input_tokens??null,output_tokens:u.output_tokens??null,total_tokens:u.total_tokens??null,cached_input_tokens:u.input_tokens_details?.cached_tokens??null,reasoning_tokens:u.output_tokens_details?.reasoning_tokens??null}:null,functionCalls:Array.isArray(response?.output)?Math.min(7,response.output.filter(item=>item.type==='function_call').length):null,hasOutputText:typeof response?.output_text==='string'&&response.output_text.trim().length>0});
    if(response?.status!=='completed'||response?.model!==model.id||response?.service_tier!==model.serviceTier||!u||!Number.isSafeInteger(u.input_tokens)||u.input_tokens<0||u.input_tokens>limits.inputTokensPerCall||!Number.isSafeInteger(u.output_tokens)||u.output_tokens<0||u.output_tokens>limits.outputTokensPerCall)stop('provider_result_or_usage');
    phase='ready';expected=null;return response;
   }catch(error){phase='stopped';throw error;}
  },
  wrapFetch(baseFetch){return async(input,init)=>{
   try{
    admit();
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url),method=init?.method??(input?.method??'GET');
    if(phase!=='dispatch'||wires>=limits.generationCalls||url.origin!=='https://api.openai.com'||url.pathname!=='/v1/responses'||url.search||method!=='POST'||typeof init?.body!=='string')stop('wire_scope_or_limit');
    init.signal?.throwIfAborted();if(!init.signal)stop('wire_signal');
    if(Buffer.byteLength(init.body)>limits.serializedBodyBytes)stop('wire_bytes');const p=JSON.parse(init.body);checkPayload(p);if(hash(p)!==expected)stop('wire_payload_changed');
    // Consume before network I/O, including failures and ambiguous dispatches.
    wires++;phase='sent';record('wire-'+wires,{attempt:wires,reservedMicrousd:limits.reservedMicrousd});
    return await baseFetch(input,{...init,redirect:'error'});
   }catch(error){phase='stopped';throw error;}
  };},
 };
}
