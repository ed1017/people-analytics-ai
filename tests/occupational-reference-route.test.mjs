import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual route with no configured data connection. No credentials or
// network access are needed to verify its unavailable and invalid-input contracts.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw new Error('Network is disabled in this route test')};
const routeUrl=new URL('../app/api/occupational-reference/route.ts',import.meta.url);
const helperUrl=new URL('../lib/occupational-reference.ts',import.meta.url).href;
const source=(await readFile(routeUrl,'utf8')).replace('"../../../lib/occupational-reference"',JSON.stringify(helperUrl));
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
