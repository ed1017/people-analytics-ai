import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual route with no configured connection or an in-memory reader.
// No credentials or network access are needed to verify these contracts.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw new Error('Network is disabled in this route test')};
const routeUrl=new URL('../app/api/occupational-reference/route.ts',import.meta.url);
const helperUrl=new URL('../lib/occupational-reference.ts',import.meta.url).href;
const clientUrl='data:text/javascript;base64,'+Buffer.from('export const supabaseServer = { from: (...args) => globalThis.referenceDiagnosticTestFrom(...args) };').toString('base64');
const source=(await readFile(routeUrl,'utf8')).replace('"../../../lib/occupational-reference"',JSON.stringify(helperUrl)).replace('"../../../lib/reference-source-diagnostics.mjs"',JSON.stringify(new URL('../lib/reference-source-diagnostics.mjs',import.meta.url).href)).replace('"../../../lib/supabase-server"',JSON.stringify(clientUrl));
const {GET}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));

test('unconfigured reference index returns structured unknowns without network or raw errors',async()=>{
 const response=await GET(new Request('http://local.test/api/occupational-reference'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert.equal(body.kind,'index');assert.equal(body.mappedProfileCount,null);
 assert.deepEqual(body.profiles,[]);assert.ok(Object.values(body.sources).every(value=>value==='unavailable'));
 assert.equal(body.error,undefined);assert.equal(networkCalls,0);
});

test('detail source unavailability retains exact code and rejects unsupported code formats',async()=>{
 const response=await GET(new Request('http://local.test/api/occupational-reference?occupation=15-1252.00'));
 const body=await response.json();assert.equal(body.code,'15-1252.00');assert.equal(body.kind,'detail');
 assert.equal(body.sources.essentialSkills,'unavailable');assert.equal(body.sources.softwareSkills,'unavailable');
 for(const code of ['15-1252','arbitrary','15-1252.00/../../other']){
  const invalid=await GET(new Request('http://local.test/api/occupational-reference?occupation='+encodeURIComponent(code)));
  assert.equal(invalid.status,400);
 }
 assert.equal(networkCalls,0);
});

test('access denial aborts sibling reads with sanitized server diagnostics and no retry',async()=>{
 const previousWarn=console.warn;
 const diagnostics=[];const calls=[];const signals=[];
 console.warn=(label,value)=>diagnostics.push({label,...JSON.parse(value)});
 process.env.SUPABASE_URL='https://local-test.invalid';process.env.SUPABASE_SECRET_KEY='local-test-placeholder';
 globalThis.referenceDiagnosticTestFrom=table=>{
  calls.push(table);
  const query={select(){return query},order(){return query},range(){return query},eq(){return query},abortSignal(signal){
   signals.push(signal);
   if(table==='job_profiles')return Promise.resolve({data:null,status:403,error:{code:'42501',message:'PRIVATE_TOKEN permission denied',details:'PRIVATE_ROW'}});
   return new Promise(resolve=>{
    const cancel=()=>resolve({data:null,status:0,error:{name:'AbortError',message:'PRIVATE_CANCEL'}});
    if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true});
   });
  }};
  return query;
 };
 try{
  const response=await GET(new Request('http://local.test/api/occupational-reference'));
  const body=await response.json();
  assert.equal(response.status,200);assert.ok(Object.values(body.sources).every(value=>value==='unavailable'));
  assert.deepEqual(calls,['job_profiles','job_onet_mapping','onet_occupations','job_skill_requirements','skills']);
  assert.ok(signals.every(signal=>signal.aborted));assert.equal(networkCalls,0);
  assert.equal(diagnostics.filter(item=>item.category==='access_denied').length,1);
  assert.equal(diagnostics.find(item=>item.category==='access_denied').source,'job_profiles');
  assert.equal(diagnostics.find(item=>item.category==='access_denied').httpStatus,403);
  assert.ok(!JSON.stringify({diagnostics,body}).includes('PRIVATE_'));
 }finally{
  console.warn=previousWarn;delete globalThis.referenceDiagnosticTestFrom;
  delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;
 }
});
