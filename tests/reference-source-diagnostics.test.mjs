import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceReadDiagnostic} from '../lib/reference-source-diagnostics.mjs';

const classify=input=>referenceReadDiagnostic({table:'job_profiles',...input});
test('sanitized diagnostics distinguish access denial, schema mismatch, timeout and connection failure',()=>{
 assert.equal(classify({status:403,error:{message:'PRIVATE details'}}).category,'access_denied');
 assert.equal(classify({status:400,error:{code:'42501'}}).category,'access_denied');
 assert.equal(classify({status:400,error:{code:'42703'}}).category,'schema_mismatch');
 assert.equal(classify({status:404,error:{code:'PGRST205'}}).category,'schema_mismatch');
 assert.equal(classify({status:504}).category,'timeout');
 assert.equal(classify({signal:{aborted:true,reason:{name:'TimeoutError'}}}).category,'timeout');
 assert.equal(classify({signal:{aborted:true,reason:{name:'AbortError'}}}).category,'cancelled');
 assert.equal(classify({error:{code:'57014'}}).category,'cancelled');
 assert.equal(classify({error:{code:'57014',message:'canceling statement due to statement timeout'}}).category,'timeout');
 assert.equal(classify({status:0,error:{message:'TypeError: fetch failed'}}).category,'connection_failure');
 assert.equal(classify({status:503,error:{}}).category,'upstream_error');
 assert.equal(classify({error:{}}).category,'unexpected_error');
});
test('diagnostics cannot emit row content, provider messages, credentials, URLs or arbitrary codes',()=>{
 const output=referenceReadDiagnostic({table:'PRIVATE_TABLE',status:0,error:{code:'PRIVATE_CREDENTIAL',message:'TypeError: fetch failed https://private.test',details:'PRIVATE_ROW_CONTENT',hint:'PRIVATE_HINT'}});
 assert.deepEqual(output,{operation:'reference_select',source:'reference_client',category:'connection_failure',httpStatus:null,code:null});
 assert.ok(!JSON.stringify(output).includes('PRIVATE'));
});
test('denial remains the diagnosed cause when the request is subsequently cancelled',()=>{
 assert.equal(classify({status:403,error:{code:'42501'},signal:{aborted:true,reason:{name:'AbortError'}}}).category,'access_denied');
});
