import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {hash,limits,model,apiBase} from './run.mjs';
import {aggregateContract} from './aggregate.mjs';
import {validatePrivateReview,privateReviewTemplate} from './private-review.mjs';
export const baseSource='64b5124b329c26bf35cdf6eed2fb02b98d06bad1';
export const branch='codex/home-pilot-continuation-diagnostic-20261009';
export const projectId='prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF';
export const authorizationPath='.home-action-acceptance/run-authorization.json';
export const verificationPath='.home-action-acceptance/aggregate-verification-receipt.json';
export const retrievalPath='.home-action-acceptance/private-review-retrieval.json';
export const inventoryPath='.home-action-acceptance/source-inventory.json';
export const deploymentRuntime=Object.freeze({name:'node',version:'24.21.0'});
// Exact local validation runtime and exact observed Vercel canary runtime.
export const supportedNodeVersions=Object.freeze(['24.19.0','24.21.0']);
export function validateNodeRuntime(version) {
  if(!supportedNodeVersions.includes(version))throw Error('runtime_changed');
}
export const expectedConfig={
  $schema:'https://openapi.vercel.sh/vercel.json',
  git:{deploymentEnabled:{[branch]:false}},
  framework:null,installCommand:'npm ci --ignore-scripts --no-audit --no-fund',
  buildCommand:'node .home-action-acceptance/build.mjs',outputDirectory:'.home-action-acceptance-output',
};
const manifestPin='c4f7ce5c3a8d96b07a845c541e30630f08630a03bd141985ed39fbe24dd6b6a1';
export function canonical(value) {
  return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
    ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
}
function fail(code) {throw Error(code);}
const validPath=path=>typeof path==='string'&&!path.startsWith('/')&&!path.includes('\\')&&
  !path.split('/').some(part=>!part||part==='.'||part==='..');
export function verifySource(root) {
  const read=path=>{if(!validPath(path)||!lstatSync(join(root,path)).isFile())fail('source_entry_changed');return readFileSync(join(root,path));};
  const files=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{
    // Dependency installation and host/Git metadata are not repository source inputs.
    if(!dir&&['node_modules','.git','.vercel'].includes(entry.name))return [];
    const path=dir?dir+'/'+entry.name:entry.name;
    if(path===authorizationPath||path===verificationPath||path===retrievalPath)return [];
    if(entry.isDirectory())return files(path);
    if(!entry.isFile())fail('source_entry_changed');return [path];
  });
  // Paths only: the inventory contains no hashes and can list itself without recursion.
  const inventoryBytes=read(inventoryPath),inventory=JSON.parse(inventoryBytes);
  if(!Array.isArray(inventory)||!inventory.every(validPath)||
    inventory.includes(authorizationPath)||inventory.includes(verificationPath)||inventory.includes(retrievalPath)||!inventory.includes(inventoryPath)||
    inventory.some(path=>['node_modules','.git','.vercel'].includes(path.split('/')[0]))||
    canonical(inventory)!==canonical([...new Set(inventory)].sort())||
    inventoryBytes.toString('utf8')!==JSON.stringify(inventory,null,2)+'\n'||
    canonical(inventory)!==canonical(files('').sort()))fail('source_inventory_changed');
  const bytes=read('.home-action-acceptance/app-source-manifest.json'),manifest=JSON.parse(bytes);
  if(hash(bytes)!==manifestPin||manifest.appCommit!==baseSource||manifest.paidExecutionAuthorized!==false||manifest.providerExecutionEntryPoint!==null)fail('base_manifest_changed');
  for(const [path,digest] of Object.entries(manifest.files))if(hash(read(path))!==digest)fail('base_file_changed');
  const baseFiles=files('').filter(path=>!path.startsWith('.home-action-acceptance/')&&path!=='vercel.json').sort();
  if(canonical(baseFiles)!==canonical(Object.keys(manifest.files).sort()))fail('base_membership_changed');
  const config=JSON.parse(read('vercel.json'));
  if(canonical(config)!==canonical(expectedConfig)||existsSync(join(root,'api'))||existsSync(join(root,'.vercel/output'))||existsSync(join(root,'.home-action-acceptance-output')))fail('build_config_or_output_changed');
  const harnessFiles=Object.fromEntries(files('.home-action-acceptance').sort().map(path=>[path,hash(read(path))]));
  // Every listed input, including the inventory's own raw bytes, is hashed once.
  // vercel.json stays semantically bound because Vercel normalizes its serialization.
  const sourceFiles=Object.fromEntries(inventory.map(path=>[path,
    path==='vercel.json'?hash(canonical(config)):hash(read(path))]));
  return {baseSource,baseManifestSha256:manifestPin,baseFileCount:manifest.fileCount,
    sourceFileCount:inventory.length,inventorySha256:hash(inventoryBytes),
    sourceRootSha256:hash(canonical({version:1,files:sourceFiles})),
    harnessFiles,harnessSha256:hash({...harnessFiles,'vercel.json.semantic':hash(canonical(config))}),
    configRawSha256:hash(read('vercel.json')),configSemanticSha256:hash(canonical(config)),
    frozenReferencePreserved:true};
}
export function authorizationTemplate(source) {
  // Configuration only. Permission, reservation and final child SHA are pinned externally.
  return {kind:'home-pilot-continuation-run-v1',projectId,repository:'ed1017/people-analytics-ai',branch,
    runtime:deploymentRuntime,runId:null,reservationId:null,reviewedCodeCommit:null,
    sourceRootSha256:source.sourceRootSha256,inventorySha256:source.inventorySha256,
    createdAt:null,expiresAt:null,phase:'aggregate-verification',approvedAggregateSha256:null,aggregateVerificationReceiptSha256:null,
    budgetLedger:null,privateReview:privateReviewTemplate(),privateReviewRetrievalSha256:null,aggregateContract,model,apiBase,limits};
}
export function readAuthorization(root,env) {
  if(Object.hasOwn(env,'SWP_PLAN_B_AUTHORIZATION'))fail('legacy_arming_forbidden');
  const path=join(root,authorizationPath);
  if(!existsSync(path))fail('unarmed');
  if(!lstatSync(path).isFile()||lstatSync(path).size>20000)fail('authorization_file_invalid');
  const bytes=readFileSync(path),authorization=JSON.parse(bytes);
  if(bytes.toString('utf8')!==canonical(authorization)+'\n')fail('authorization_file_invalid');
  return {authorization,authorizationSha256:hash(bytes)};
}
export function validateAuthorization(auth,env,source,now=Date.now(),nodeVersion=process.versions.node) {
  validatePrivateReview(auth?.privateReview);
  const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
  if(auth?.kind!=='home-pilot-continuation-run-v1'||
     Object.keys(auth).sort().join(',')!==Object.keys(authorizationTemplate(source)).sort().join(',')||
     auth.projectId!==projectId||auth.repository!=='ed1017/people-analytics-ai'||auth.branch!==branch||
     canonical(auth.runtime)!==canonical(deploymentRuntime)||nodeVersion!==deploymentRuntime.version||
     !uuid(auth.runId)||!['aggregate-verification','model-assessment'].includes(auth.phase)||
     (auth.phase==='aggregate-verification'?(auth.reservationId!==null||auth.approvedAggregateSha256!==null||auth.aggregateVerificationReceiptSha256!==null||auth.privateReviewRetrievalSha256!==null):
       (!uuid(auth.reservationId)||auth.runId===auth.reservationId||! /^[a-f0-9]{64}$/.test(auth.approvedAggregateSha256??'')||! /^[a-f0-9]{64}$/.test(auth.aggregateVerificationReceiptSha256??'')||! /^[a-f0-9]{64}$/.test(auth.privateReviewRetrievalSha256??'')))||
     canonical(auth.aggregateContract)!==canonical(aggregateContract)||
     !/^[a-f0-9]{40}$/.test(auth.reviewedCodeCommit??'')||auth.reviewedCodeCommit===baseSource||
     auth.sourceRootSha256!==source.sourceRootSha256||auth.inventorySha256!==source.inventorySha256||
     canonical(auth.model)!==canonical(model)||auth.apiBase!==apiBase||canonical(auth.limits)!==canonical(limits))fail('unarmed_or_unbound_authorization');
  const utc=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&
    Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
  const start=Date.parse(auth.createdAt),expiry=Date.parse(auth.expiresAt);
  if(!utc(auth.createdAt)||!utc(auth.expiresAt)||!Number.isFinite(now)||start>now||expiry<=now||expiry-start>3600000)fail('reservation_expired');
  if(env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV&&env.VERCEL_TARGET_ENV!=='preview'||
     env.VERCEL_PROJECT_ID!==projectId||!/^dpl_[A-Za-z0-9_-]{1,100}$/.test(env.VERCEL_DEPLOYMENT_ID??'')||
     env.VERCEL_GIT_REPO_OWNER!=='ed1017'||env.VERCEL_GIT_REPO_SLUG!=='people-analytics-ai'||
     env.VERCEL_GIT_COMMIT_REF!==branch||!/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??'')||
     env.VERCEL_GIT_COMMIT_SHA===auth.reviewedCodeCommit)fail('preview_identity_mismatch');
  // The coordinator pins the exact child: authorization plus the fixed prior
  // verification receipt for model assessment; no other source changes.
  // This process checks source content/identity and records A; it cannot prove permission.
  if(Object.hasOwn(env,'SWP_PLAN_B_AUTHORIZATION'))fail('legacy_arming_forbidden');
  if(['OPENAI_BASE_URL','OPENAI_ORG_ID','OPENAI_PROJECT_ID','OPENAI_LOG','OPENAI_CUSTOM_HEADERS','OPENAI_ADMIN_KEY'].some(key=>env[key]))fail('provider_override');
  if(limits.turns!==1||limits.generationAttempts!==2||limits.countAttempts!==0||
     Math.ceil(2*(1050000*5+5000*15)*11/10)!==limits.reservationMicrousd)fail('reservation_formula_changed');
  if(auth.phase==='aggregate-verification'){
    if(auth.budgetLedger!==null)fail('unarmed_or_unbound_authorization');
  }else{
    const ledger=auth.budgetLedger;
    if(!ledger||Object.keys(ledger).sort().join(',')!=='asOf,priorExposureMicrousd,totalCapMicrousd'||
       !utc(ledger.asOf)||Date.parse(ledger.asOf)>now||now-Date.parse(ledger.asOf)>900000||
       !Number.isSafeInteger(ledger.priorExposureMicrousd)||ledger.priorExposureMicrousd<0||
       ledger.totalCapMicrousd!==limits.totalCapMicrousd||
       ledger.priorExposureMicrousd+limits.reservationMicrousd>limits.totalCapMicrousd)fail('reservation_formula_changed');
  }
  return true;
}
export function validateAggregateVerification(bytes,auth,source,now=Date.now()){
  if(auth.phase!=='model-assessment'||hash(bytes)!==auth.aggregateVerificationReceiptSha256)fail('aggregate_approval_required');
  const raw=JSON.parse(bytes),receipt=raw?.receipt;
  if(raw.sanitization?.redacted!==false||raw.sanitization?.truncated!==false||
    receipt?.stage!=='aggregate-verified'||receipt.phase!=='aggregate-verification'||receipt.sourceRootSha256!==source.sourceRootSha256||
    receipt.reviewedCodeCommit!==auth.reviewedCodeCommit||receipt.aggregateVerificationPassed!==true||
    receipt.generationAttempts!==0||receipt.wireAttempts!==0||receipt.aggregateReadAttempts!==2||
    receipt.aggregateSha256!==auth.approvedAggregateSha256||!Number.isFinite(Date.parse(receipt.verifiedAt))||
    Date.parse(receipt.verifiedAt)>now||now-Date.parse(receipt.verifiedAt)>3600000)fail('aggregate_approval_required');
  if(receipt.privateReview?.reviewId!==auth.privateReview?.reviewId||receipt.privateReview?.recipientKeySha256!==auth.privateReview?.recipientKeySha256||
    receipt.privateReview?.redacted!==false||! /^[a-f0-9]{64}$/.test(receipt.privateReview?.completionSha256??'')||! /^[a-f0-9]{64}$/.test(receipt.privateCanaryNonceSha256??''))fail('private_review_retrieval_required');
  return true;
}
export function validatePrivateRetrieval(bytes,auth,receipt){
  let value;try{value=JSON.parse(bytes);}catch{fail('private_review_retrieval_required');}
  if(hash(bytes)!==auth.privateReviewRetrievalSha256||value?.version!==1||value.reviewId!==auth.privateReview.reviewId||
   value.recipientKeySha256!==auth.privateReview.recipientKeySha256||value.aggregateVerificationReceiptSha256!==auth.aggregateVerificationReceiptSha256||
   value.completionSha256!==receipt.privateReview.completionSha256||! /^[a-f0-9]{64}$/.test(value.canaryNonce??'')||
   hash(value.canaryNonce)!==receipt.privateCanaryNonceSha256||value.reviewerDelivery!=='private-task-messages')fail('private_review_retrieval_required');
  return true;
}
export function readAggregateVerification(root,auth,source,now=Date.now()){
  const path=join(root,verificationPath);
  if(auth.phase==='aggregate-verification'){if(existsSync(path)||existsSync(join(root,retrievalPath)))fail('aggregate_approval_required');return;}
  if(!existsSync(path)||!lstatSync(path).isFile()||lstatSync(path).size>20000)fail('aggregate_approval_required');
  validateAggregateVerification(readFileSync(path),auth,source,now);
  const retrieval=join(root,retrievalPath);
  if(!existsSync(retrieval)||!lstatSync(retrieval).isFile()||lstatSync(retrieval).size>20000)fail('private_review_retrieval_required');
  validatePrivateRetrieval(readFileSync(retrieval),auth,JSON.parse(readFileSync(path)).receipt);
}
