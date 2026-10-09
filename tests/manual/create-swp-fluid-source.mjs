/** Explicit local manifest generation only. No provider, credentials or network. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {fixture} from '../fixtures/swp-reference-continuation.mjs';
import {demandReferenceModelContract} from '../../lib/swp-demand-reference.ts';

if(process.argv.length!==3||process.argv[2]!=='--write')throw Error('Use --write to create this separate local source manifest.');
const root=fileURLToPath(new URL('../../',import.meta.url));
const manifestPath='tests/fixtures/swp-fluid-source-manifest.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
function files(dir){return readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{
 const path=dir+'/'+entry.name;
 if(entry.isDirectory())return files(path);
 if(!entry.isFile())throw Error('Unexpected source entry: '+path);
 return [path];
});}
const frozen=JSON.parse(readFileSync(join(root,'tests/fixtures/swp-reference-source-manifest.json')));
const runtimePaths=[...Object.keys(frozen.runtimeFiles).filter(path=>!path.includes('/')),'vercel.json',...['app','components','lib','public'].flatMap(files)].sort();
const supportPaths=[...new Set([...Object.keys(frozen.supportFiles),...files('tests').filter(path=>path!==manifestPath),'docs/swp-fluid-integration-checkpoint.md','docs/swp-conversation-recommendations.md','docs/standalone-assumption-editor.md'])].sort();
const digests=paths=>Object.fromEntries(paths.map(path=>[path,hash(readFileSync(join(root,path)))]));
const runtimeFiles=digests(runtimePaths),supportFiles=digests(supportPaths);
const manifest={
 kind:'swp-fluid-source-v1',paidExecutionAuthorized:false,providerExecutionEntryPoint:null,
 runtimeCommit:'fbe9695cff4344cf80f27f9d481095caab139d9a',
 inputs:{predecessorIntegration:'02ddda844bcd4470a9dac9c015ed56b519ae6d68',referenceBuild:'6adf0a9d2f84edb9c27357b5e25fcd3529f16df0',calculatorPR188:'8a81f8c810750a9394f69c6126117f457432d34c',continuityPR187:'1441dcaea8f1e33c08334a3e0168d2bde232f296'},
 runtimeFileCount:runtimePaths.length,runtimeSha256:hash(JSON.stringify(runtimeFiles)),
 supportFileCount:supportPaths.length,supportSha256:hash(JSON.stringify(supportFiles)),
 preservedReference:{fixture:{id:fixture.id,objectSha256:hash(JSON.stringify(fixture)),fileSha256:hash(readFileSync(join(root,'tests/fixtures/swp-reference-continuation.mjs')))},baseModelContractSha256:hash(JSON.stringify(demandReferenceModelContract)),frozenManifestFileSha256:hash(readFileSync(join(root,'tests/fixtures/swp-reference-source-manifest.json')))},
 instructionComposition:{route:'app/api/home-solution-conversation/route.ts',demandMode:'demandReferenceModelContract.instructions + solutionPlanningInstructions(parsed, demand)',otherMode:'Existing solution/progress instructions + solutionPlanningInstructions(parsed, null)',helper:'lib/home-solution-planning.ts',requestDependent:true,frozenReferenceAcceptanceCoversThisEnvelope:false},
 historyContracts:{ordinaryHome:{route:'/api/chat',recentTurns:8,scopedObjective:'One recognized user opener, at most 240 characters; in-memory interpretation only, never an extra model history turn.'},fullSolution:{route:'/api/home-solution-conversation',retainedTurns:32,scopedObjectiveField:false,note:'Existing checked solution state; the ordinary Home eight-turn objective contract does not apply to this route.'}},
 publication:{branch:'codex/swp-grounded-comparisons-20261009',automaticVercelDeployment:false,config:'vercel.json',productionMergeApproved:false},
 acceptance:{localSyntheticOnly:true,fullAcceptance:false,semanticReview:'required on this exact composed runtime',independentConflictReview:'pending coordinator review',realProviderCalls:0,paidBudgetApproved:false,deploymentApproved:false,featureFlagsChanged:false,excludedPRs:[186,189],note:'This source pin authorizes no execution. Separately approve exact route, feature flags, transport, complete context budget, turn/tool limits and semantic criteria before any paid acceptance run.'},
 runtimeFiles,supportFiles,
};
const bytes=JSON.stringify(manifest,null,2)+'\n';
writeFileSync(join(root,manifestPath),bytes,{flag:'w'});
console.log(JSON.stringify({manifestPath,manifestFileSha256:hash(bytes),runtimeFileCount:runtimePaths.length,runtimeSha256:manifest.runtimeSha256,supportFileCount:supportPaths.length,providerCalls:0},null,2));
