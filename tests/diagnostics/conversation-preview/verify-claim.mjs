/** Explicit LOCAL provider-free verification. No Vercel build, paid manifest or OpenAI bundle. */
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {compileVerification} from './verification-bundle.mjs';
import {verifyLocalTarget} from './verification-claim.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
try{
 if(process.argv.length!==3||process.argv[2]!=='--verify-local-provider-free')throw Error('Explicit local mode required');
 verifyLocalTarget(process.env);
 const output=mkdtempSync(join(tmpdir(),'conversation-claim-verification-'));
 const entry=createRequire(import.meta.url)(await compileVerification(root,output));
 console.log(JSON.stringify(await entry.verifyLocalClaim(process.env)));
}catch{console.error('CLAIM_VERIFICATION_STOP: no paid dispatch; retain all records and investigate without reset.');process.exitCode=1;}
