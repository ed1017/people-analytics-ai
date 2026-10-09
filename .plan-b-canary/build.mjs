// Zero-provider manual Preview canary. Node built-ins only; no application imports.
import {readFileSync,readdirSync,lstatSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const base='02ddda844bcd4470a9dac9c015ed56b519ae6d68';
const branch='codex/swp-plan-b-zero-provider-canary-20261009';
const manifestPin='c4b66bf45f682c6e5fdddc621950d79b88f4756dbd5fc028e1fb49cc77c0e45f';
const runtimePin='9afb384afb65f6bbdce4e36af3648842d33335bd4a5caeef13c7533c8aa737b3';
const runId='plan-b-zero-provider-20261009-8b624d30';
const expectedConfig={
 $schema:'https://openapi.vercel.sh/vercel.json',
 git:{deploymentEnabled:{'codex/swp-fluid-package-integration-20261009':false,[branch]:false}},
 framework:null,
 installCommand:'node --version',
 buildCommand:'node .plan-b-canary/build.mjs',
 outputDirectory:'.plan-b-canary-output',
};
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error(code);};
function canonical(value){return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);}
function read(path){if(path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'))fail('INVALID_SOURCE_PATH');const full=join(root,path);if(!lstatSync(full).isFile())fail('INVALID_SOURCE_FILE');return readFileSync(full);}
function files(dir){return readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{const path=dir+'/'+entry.name;if(entry.isDirectory())return files(path);if(!entry.isFile())fail('UNEXPECTED_SOURCE_ENTRY');return [path];});}

try{
 if(process.argv.length!==2)fail('NO_RUN_OVERRIDES');
 if(process.env.VERCEL!=='1'||process.env.VERCEL_ENV!=='preview'||(process.env.VERCEL_TARGET_ENV&&process.env.VERCEL_TARGET_ENV!=='preview'))fail('PREVIEW_REQUIRED');
 if(process.env.VERCEL_GIT_REPO_OWNER!=='ed1017'||process.env.VERCEL_GIT_REPO_SLUG!=='people-analytics-ai'||process.env.VERCEL_GIT_COMMIT_REF!==branch)fail('SOURCE_IDENTITY_MISMATCH');
 const commit=process.env.VERCEL_GIT_COMMIT_SHA,project=process.env.VERCEL_PROJECT_ID,deployment=process.env.VERCEL_DEPLOYMENT_ID;
 if(!/^[a-f0-9]{40}$/.test(commit??'')||commit===base||!/^prj_[A-Za-z0-9_-]{1,100}$/.test(project??'')||!/^dpl_[A-Za-z0-9_-]{1,100}$/.test(deployment??''))fail('BUILD_IDENTITY_REQUIRED');
 const bytes=read('tests/fixtures/swp-fluid-source-manifest.json');
 if(hash(bytes)!==manifestPin)fail('BASE_MANIFEST_CHANGED');
 const manifest=JSON.parse(bytes);
 if(manifest.kind!=='swp-fluid-source-v1'||manifest.runtimeSha256!==runtimePin||manifest.paidExecutionAuthorized!==false||manifest.providerExecutionEntryPoint!==null)fail('BASE_SOURCE_PIN_CHANGED');
 for(const [path,digest] of Object.entries({...manifest.runtimeFiles,...manifest.supportFiles})){
  if(path==='vercel.json')continue;
  if(hash(read(path))!==digest)fail('BASE_FILE_CHANGED');
 }
 const discovered=[...Object.keys(manifest.runtimeFiles).filter(path=>!path.includes('/')),...['app','components','lib','public'].flatMap(files)].sort();
 if(canonical(discovered)!==canonical(Object.keys(manifest.runtimeFiles).sort()))fail('BASE_MEMBERSHIP_CHANGED');
 const configBytes=read('vercel.json');
 if(canonical(JSON.parse(configBytes))!==canonical(expectedConfig))fail('CANARY_CONFIG_CHANGED');
 if(existsSync(join(root,'api'))||existsSync(join(root,'.vercel/output')))fail('UNEXPECTED_RUNTIME_OUTPUT');
 const output=join(root,expectedConfig.outputDirectory);
 // Do not reuse or clean an existing output directory.
 mkdirSync(output,{mode:0o700});
 writeFileSync(join(output,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>\n',{flag:'wx',mode:0o600});
 if(readdirSync(output).join(',')!=='index.html')fail('UNEXPECTED_OUTPUT_FILE');
 console.log('PLAN_B_ZERO_PROVIDER_CANARY '+JSON.stringify({runId,sourceCommit:commit,baseSource:base,baseManifestSha256:manifestPin,baseRuntimeSha256:runtimePin,canaryScriptSha256:hash(read('.plan-b-canary/build.mjs')),configSha256:hash(configBytes),branch,environment:'preview',observedProjectId:project,deploymentId:deployment,output:'blank-static-only',providerImports:0,providerCalls:0,credentialReads:0,databaseCalls:0,modelAcceptance:false}));
}catch(error){
 const message=error instanceof Error?error.message:'';
 console.error('PLAN_B_CANARY_STOP '+(/^[A-Z_]{1,80}$/.test(message)?message:'LOCAL_VALIDATION_FAILED'));
 process.exitCode=1;
}
