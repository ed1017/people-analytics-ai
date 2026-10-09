import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {hash,limits,model,apiBase} from './run.mjs';
export const baseSource='02ddda844bcd4470a9dac9c015ed56b519ae6d68';
export const branch='codex/swp-plan-b-two-turn-20261009';
export const projectId='prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF';
export const expectedConfig={
  $schema:'https://openapi.vercel.sh/vercel.json',
  git:{deploymentEnabled:{'codex/swp-fluid-package-integration-20261009':false,[branch]:false}},
  framework:null,installCommand:'npm ci --ignore-scripts --no-audit --no-fund',
  buildCommand:'node .plan-b-two-turn/build.mjs',outputDirectory:'.plan-b-two-turn-output',
};
const manifestPin='c4b66bf45f682c6e5fdddc621950d79b88f4756dbd5fc028e1fb49cc77c0e45f';
const runtimePin='9afb384afb65f6bbdce4e36af3648842d33335bd4a5caeef13c7533c8aa737b3';
export function canonical(value) {
  return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
    ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
}
function fail(code) {throw Error(code);}
export function verifySource(root) {
  const read=path=>{if(path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..')||!lstatSync(join(root,path)).isFile())fail('source_entry_changed');return readFileSync(join(root,path));};
  const files=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{
    const path=dir+'/'+entry.name;
    if(entry.isDirectory())return files(path);
    if(!entry.isFile())fail('source_entry_changed');return [path];
  });
  const bytes=read('tests/fixtures/swp-fluid-source-manifest.json'),manifest=JSON.parse(bytes);
  if(hash(bytes)!==manifestPin||manifest.runtimeSha256!==runtimePin||manifest.paidExecutionAuthorized!==false||manifest.providerExecutionEntryPoint!==null)fail('base_manifest_changed');
  for(const [path,digest] of Object.entries({...manifest.runtimeFiles,...manifest.supportFiles}))
    if(path!=='vercel.json'&&hash(read(path))!==digest)fail('base_file_changed');
  const found=[...Object.keys(manifest.runtimeFiles).filter(path=>!path.includes('/')),...['app','components','lib','public'].flatMap(files)].sort();
  if(canonical(found)!==canonical(Object.keys(manifest.runtimeFiles).sort())||
    canonical(files('tests').filter(path=>path!=='tests/fixtures/swp-fluid-source-manifest.json').sort())!==canonical(Object.keys(manifest.supportFiles).filter(path=>path.startsWith('tests/')).sort()))fail('base_membership_changed');
  const config=JSON.parse(read('vercel.json'));
  if(canonical(config)!==canonical(expectedConfig)||existsSync(join(root,'api'))||existsSync(join(root,'.vercel/output'))||existsSync(join(root,'.plan-b-two-turn-output')))fail('build_config_or_output_changed');
  const harnessFiles=Object.fromEntries(files('.plan-b-two-turn').sort().map(path=>[path,hash(read(path))]));
  return {baseSource,baseManifestSha256:manifestPin,baseRuntimeSha256:runtimePin,
    runtimeFileCount:manifest.runtimeFileCount,supportFileCount:manifest.supportFileCount,
    harnessFiles,harnessSha256:hash({...harnessFiles,'vercel.json.semantic':hash(canonical(config))}),
    configRawSha256:hash(read('vercel.json')),configSemanticSha256:hash(canonical(config)),
    frozenReferencePreserved:true};
}
export function authorizationTemplate(source) {
  return {kind:'swp-plan-b-two-turn-reservation-v1',executionAuthorized:false,budgetReviewApproved:false,
    singleDeploymentOnly:true,runId:null,reservationId:null,approvalReference:null,sourceCommit:null,
    harnessSha256:source.harnessSha256,createdAt:null,expiresAt:null,model,apiBase,limits};
}
export function validateAuthorization(auth,env,source,now=Date.now()) {
  const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
  if(auth?.kind!=='swp-plan-b-two-turn-reservation-v1'||
     Object.keys(auth).sort().join(',')!=='apiBase,approvalReference,budgetReviewApproved,createdAt,executionAuthorized,expiresAt,harnessSha256,kind,limits,model,reservationId,runId,singleDeploymentOnly,sourceCommit'||
     auth.executionAuthorized!==true||auth.budgetReviewApproved!==true||auth.singleDeploymentOnly!==true||
     !uuid(auth.runId)||!uuid(auth.reservationId)||!/^parent-[A-Za-z0-9_-]{1,100}$/.test(auth.approvalReference??'')||
     !/^[a-f0-9]{40}$/.test(auth.sourceCommit??'')||auth.sourceCommit===baseSource||auth.harnessSha256!==source.harnessSha256||
     canonical(auth.model)!==canonical(model)||auth.apiBase!==apiBase||canonical(auth.limits)!==canonical(limits))fail('unarmed_or_unbound_authorization');
  const start=Date.parse(auth.createdAt),expiry=Date.parse(auth.expiresAt);
  if(!Number.isFinite(start)||!Number.isFinite(expiry)||start>now||expiry<=now||expiry-start>3600000)fail('reservation_expired');
  if(env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV&&env.VERCEL_TARGET_ENV!=='preview'||
     env.VERCEL_PROJECT_ID!==projectId||!/^dpl_[A-Za-z0-9_-]{1,100}$/.test(env.VERCEL_DEPLOYMENT_ID??'')||
     env.VERCEL_GIT_REPO_OWNER!=='ed1017'||env.VERCEL_GIT_REPO_SLUG!=='people-analytics-ai'||
     env.VERCEL_GIT_COMMIT_REF!==branch||env.VERCEL_GIT_COMMIT_SHA!==auth.sourceCommit)fail('preview_identity_mismatch');
  if(['OPENAI_BASE_URL','OPENAI_ORG_ID','OPENAI_PROJECT_ID','OPENAI_LOG','OPENAI_CUSTOM_HEADERS','OPENAI_ADMIN_KEY'].some(key=>env[key]))fail('provider_override');
  if(limits.reservationMicrousd>limits.remainingMicrousd||limits.priorRetainedMicrousd+limits.reservationMicrousd>limits.totalCapMicrousd||
     Math.ceil(4*(1050000*5+5000*15)*11/10)!==limits.reservationMicrousd)fail('reservation_formula_changed');
  return true;
}
