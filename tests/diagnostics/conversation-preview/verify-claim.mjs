/** Explicit LOCAL provider-free verification. No Vercel build, paid manifest or OpenAI bundle. */
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {compileVerification} from './verification-bundle.mjs';
import {verifyLocalTarget} from './verification-claim.mjs';
import {stage} from './verification-diagnostics.mjs';
const stages=[];
const report=code=>stages.push(code);
const root=fileURLToPath(new URL('../../../',import.meta.url));
try{
 stage(report,'CONFIG');
 const preflight=process.argv[2]==='--preflight-local-no-inserts';
 if(process.argv.length!==3||(!preflight&&process.argv[2]!=='--verify-local-provider-free'))throw Error('Explicit local mode required');
 verifyLocalTarget(process.env);
 const fetch=globalThis.fetch;
 globalThis.fetch=async(...args)=>{
  stage(report,'DISPATCH');
  if(preflight)throw Error('Network disabled for preflight');
  return fetch(...args);
 };
 stage(report,'COMPILE');
 const output=mkdtempSync(join(tmpdir(),'conversation-claim-verification-'));
 const file=await compileVerification(root,output);
 stage(report,'IMPORT');
 const entry=createRequire(import.meta.url)(file);
 const receipt=await (preflight?entry.preflightLocalClaim:entry.verifyLocalClaim)(process.env,report);
 console.log(JSON.stringify({receipt,stages}));
}catch{console.error(JSON.stringify({code:'CLAIM_VERIFICATION_STOP',stages}));process.exitCode=1;}
