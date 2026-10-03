// Builds one offline HTML file; no listener, API, browser or external service.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {selectionFixture} from '../fixtures/workforce-selection.mjs';
import {recordSolutionApproval,reviseWorkforceSolution,beginSolutionRun,completeSolutionRun} from '../../lib/workforce-solution.ts';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import {previewWorkforceAlternatives} from '../../lib/workforce-planning-agent.ts';
import {encodeDecisions} from '../../lib/local-decisions.ts';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'workforce-device-'));
const cssDirectory=path.resolve('.next/static/chunks');
const cssFiles=(await fs.readdir(cssDirectory)).filter(name=>name.endsWith('.css'));
if(!cssFiles.length)throw Error('Use the existing production build CSS; run npm run build once if none exists.');
const css=(await Promise.all(cssFiles.map(name=>fs.readFile(path.join(cssDirectory,name),'utf8')))).join('\n');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/workforce-device-acceptance.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const assets=(await fs.readdir(output)).filter(name=>name.endsWith('.js'));
const workers=Object.fromEntries(await Promise.all(assets.filter(name=>name!=='fixture.js').map(async name=>[name,await fs.readFile(path.join(output,name),'utf8')])));
if(Object.keys(workers).length!==1)throw Error('Review changed worker bundling before using this standalone fixture.');
let {solution,payload}=selectionFixture();const at='2026-10-03T01:00:00.000Z';
solution=recordSolutionApproval(solution,1,'keep-approval',['source-result'],'Synthetic prior approval',at);
const oldReview=previewWorkforceAlternatives(solution,'source-result',[{...payload.input,trainingCash:'1000'}],'keep-review',at);
let nextSolution=reviseWorkforceSolution(solution,1,{scope:{...solution.versions[0].inputs.scope,budget:'26000'}},'sidebar','Synthetic budget change',at);
const nextPayload=structuredClone(payload);nextPayload.input.budget='26000';
nextPayload.proposed=calculateWorkforceIncrement(nextPayload.input,nextPayload.timing);
nextPayload.hireOnly=calculateWorkforceIncrement({...nextPayload.input,build:'0',move:'0',buy:'3',backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},nextPayload.timing);
const run=beginSolutionRun(nextSolution,2,'next-run',['brief'],at);
nextSolution=completeSolutionRun(run.state,run.ticket,[{id:'next-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:nextPayload}],at);
const seed={version:1,revision:1,goals:{version:1,activeId:'goal-search',goals:[{id:'goal-search',statement:'Synthetic bounded workforce comparison'},{id:'goal-b',statement:'Other goal'}]},workspaces:{'goal-search':{savedAt:at,fields:{workforceSolution:solution,workforceAlternativeReviews:[oldReview],owner:'Synthetic owner'}}}};
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const serialized=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const bootstrap=`
window.deviceAcceptance=${serialized({encoded:encodeDecisions(seed),originalSolution:solution,nextSolution,source})};
const workerSources=${serialized(workers)};
const NativeWorker=window.Worker,pending=[];
window.acceptanceMode='normal';
window.releaseAcceptanceReplies=()=>{for(const reply of pending.splice(0))reply()};
window.Worker=class {
 constructor(url){
  if(window.acceptanceMode==='no-worker'||!NativeWorker)throw Error('Synthetic unavailable Worker');
  const name=String(url).split('/').at(-1),source=workerSources[name];
  if(!source)throw Error('Unknown fixture worker');
  const prefix=window.acceptanceMode==='no-crypto'?'Object.defineProperty(globalThis.crypto,"subtle",{value:undefined});\\n':'';
  const blob=URL.createObjectURL(new Blob([prefix,source],{type:'application/javascript'}));
  this.native=new NativeWorker(blob);URL.revokeObjectURL(blob);
  this.native.onmessage=event=>{const reply=()=>this.onmessage?.(event);if(window.acceptanceMode==='hold')pending.push(reply);else reply()};
  this.native.onerror=event=>this.onerror?.(event);
 }
 postMessage(value){this.native.postMessage(value)}
 terminate(){this.native.terminate()}
};
window.fetch=()=>Promise.reject(Error('Network disabled in offline acceptance fixture'));
window.XMLHttpRequest=window.WebSocket=window.EventSource=class {constructor(){throw Error('Network disabled in offline acceptance fixture')}};
`;
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html='<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; worker-src blob:; connect-src \'none\'; img-src data:; font-src data:"><title>Synthetic workforce device acceptance</title><style>'+css.replaceAll('</style','<\\/style')+'</style></head><body><div id="root"></div><script>'+bootstrap.replaceAll('</script','<\\/script')+'</script><script>'+bundle.replaceAll('</script','<\\/script')+'</script></body></html>';
const file=path.join(output,'workforce-device-acceptance.html');await fs.writeFile(file,html);
console.log(file);
