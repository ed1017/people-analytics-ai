import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {request} from 'node:http';
import {once} from 'node:events';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createCompanyBinding} from '../lib/public-fixture/company-binding.mjs';
import {createCompanyFixtureServer} from '../lib/public-fixture/company-http.mjs';
import {sha256} from '../lib/public-fixture/read-provider.mjs';
const read=n=>fs.readFileSync(new URL(`./fixtures/company-import/${n}`,import.meta.url),'utf8').replaceAll('\r\n','\n');
const configText=read('lantern-config.json'),rowsText=read('lantern-rows.json'),expected=JSON.parse(read('lantern-binding-pins.json'));
const make=()=>createCompanyBinding({configText,rowsText,expected});
function modified(edit){const c=JSON.parse(configText),r=JSON.parse(rowsText);edit(c,r);const ct=JSON.stringify(c),rt=JSON.stringify(r);return createCompanyBinding({configText:ct,rowsText:rt,expected:{companyKey:c.companyKey,configSha256:sha256(ct),sourceSha256:sha256(rt)}});}
test('reviewed mapping binds exact company, snapshot and aggregate routes',()=>{
 const b=make();assert.equal(b.identity.companyKey,'lantern-invented');assert.equal(b.identity.asOf,'2026-09-30');
 const r=b.read('/api/headcount',{datasetToken:b.token});assert.equal(r.status,200);assert.deepEqual(r.body,{headcount:9});assert.equal(r.headers['x-company-as-of'],b.identity.asOf);
 const trend=b.read('/api/headcount-trend',{datasetToken:b.token}).body;assert.deepEqual(trend.map(x=>[x.headcount,x.fte]),[[7,6],[9,7.75]]);
 assert.throws(()=>{b.identity.asOf='2030-01-01';});assert.throws(()=>{trend[0].headcount=999;});
});
test('trusted pins and expected company prevent substitutions before serving',()=>{
 for(const change of [{configText:configText+' '},{rowsText:rowsText+' '},{expected:{...expected,companyKey:'other'}},{expected:{...expected,sourceSha256:'0'.repeat(64)}},{expected:{...expected,extra:true}}])assert.throws(()=>createCompanyBinding({configText,rowsText,expected,...change}));
});
test('two companies and revised source cannot reuse a snapshot token',()=>{
 const a=make(),b=modified(c=>{c.companyKey='second-invented';}),revision=createCompanyBinding({configText,rowsText:rowsText+' ',expected:{...expected,sourceSha256:sha256(rowsText+' ')}});
 for(const other of [b,revision]){assert.notEqual(other.token,a.token);assert.equal(other.read('/api/headcount',{datasetToken:a.token}).status,409);assert.equal(a.read('/api/headcount',{datasetToken:other.token}).status,409);}
 assert.equal(a.read('/api/headcount').status,409);
});
test('zero remains known zero; invalid mapped data cannot create a binding',()=>{
 const z=modified((c,r)=>{c.controls.forEach(x=>{x.headcount=0;x.fte=0;});r.forEach(x=>{x.staffed_people=0;x.capacity_percent_total=0;});});
 assert.deepEqual(z.read('/api/headcount',{datasetToken:z.token}).body,{headcount:0});
 for(const edit of [(c,r)=>{r[0].staffed_people=null;},(c,r)=>{r[0].email='invented@example.invalid';},(c,r)=>{r.push(r[0]);},c=>{c.controls[0].headcount++;}])assert.throws(()=>modified(edit));
});
test('unsupported scope domains calculations and encoded targets fail closed',()=>{
 const b=make();for(const target of ['/api/headcount?org=OPS','/api/headcount?','/api/%68eadcount','/api/../api/headcount','/api/headcount#x'])assert.equal(b.read(target,{datasetToken:b.token}).status,400);
 for(const target of ['/api/finance','/api/attrition','/api/chat'])assert.equal(b.read(target,{datasetToken:b.token}).status,404);
 assert.equal(b.read('/api/headcount',{datasetToken:b.token,method:'POST'}).status,405);
});
const call=(port,target,headers={},method='GET')=>new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port,path:target,method,headers},res=>{let text='';res.on('data',x=>text+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(text)}));});req.on('error',reject);req.end();
});
test('real HTTP mapping-provider-response flow preserves identity and rejects stale clients',async()=>{
 const b=make(),server=createCompanyFixtureServer(b);server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;
 try{
  const headers={'x-workforce-dataset':b.token};
  const [head,trend]=await Promise.all([call(port,'/api/headcount',headers),call(port,'/api/headcount-trend',headers)]);
  assert.equal(head.status,200);assert.equal(head.body.headcount,9);assert.equal(trend.body.at(-1).fte,7.75);assert.equal(head.headers['x-workforce-dataset'],trend.headers['x-workforce-dataset']);assert.equal(head.headers['cache-control'],'no-store');
  assert.equal((await call(port,'/api/headcount')).status,409);assert.equal((await call(port,'/api/headcount',{'x-workforce-dataset':'old'})).status,409);
  assert.equal((await call(port,'/api/finance',headers)).status,404);assert.equal((await call(port,'/api/headcount?org=OPS',headers)).status,400);
  assert.equal((await call(port,'/api/%68eadcount',headers)).status,400);
  for(const bad of [{host:'external.invalid'}, {origin:'https://external.invalid'}, {'x-forwarded-host':'127.0.0.1'}, {forwarded:'host=external.invalid'}])assert.equal((await call(port,'/api/headcount',{...headers,...bad})).status,403);
  assert.equal((await call(port,'/api/headcount',headers,'POST')).status,405);
 }finally{await new Promise(r=>server.close(r));}
});
test('transport does not expose source error details or execute production fallback',async()=>{
 const server=createCompanyFixtureServer({read(){throw Error('invented private diagnostic');}});server.listen(0,'127.0.0.1');await once(server,'listening');
 try{assert.deepEqual((await call(server.address().port,'/api/headcount')).body,{error:'fixture_unavailable'});}finally{await new Promise(r=>server.close(r));}
});
test('checked-in launcher serves pinned fixture and rejects hosted or arbitrary-file modes',async()=>{
 const launcher=fileURLToPath(new URL('../tools/serve-company-fixture.mjs',import.meta.url));
 assert.notEqual(spawnSync(process.execPath,[launcher,'unapproved.json'],{encoding:'utf8'}).status,0);
 assert.notEqual(spawnSync(process.execPath,[launcher],{env:{...process.env,VERCEL:'1'},encoding:'utf8'}).status,0);
 const child=spawn(process.execPath,[launcher],{stdio:['ignore','pipe','pipe']});
 const lines=createInterface({input:child.stdout});
 try{
  const [line]=await once(lines,'line',{signal:AbortSignal.timeout(10000)});const ready=JSON.parse(line);
  const url=new URL(ready.url);assert.equal(url.hostname,'127.0.0.1');assert.equal(ready.identity.companyKey,'lantern-invented');
  const result=await call(Number(url.port),'/api/headcount',{'x-workforce-dataset':ready.datasetToken});assert.equal(result.status,200);assert.equal(result.body.headcount,9);
 }finally{lines.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
});
