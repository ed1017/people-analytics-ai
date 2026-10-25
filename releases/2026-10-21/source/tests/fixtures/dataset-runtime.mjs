// Exercise the actual legacy request boundary with deployment selectors explicitly
// disabled in this isolated fixture. Public rollout guards have separate tests.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const file=new URL('../../lib/dataset-runtime.ts',import.meta.url),require=createRequire(file),exports={};
const selectors={
 './public-9037-options.mjs':{public9037Options:()=>null},
 './dataset-9037-preview-options.mjs':{preview9037Options:()=>null},
 './dataset-9037-development-options.mjs':{development9037Options:()=>null},
 './public-ai-runtime.server':{createPublicAiRuntime:()=>()=>{throw Error('No AI dispatch allowed in legacy fixture');}},
};
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports,Response,process:{env:{}},require:id=>selectors[id]??require(id)});
export const {withDatasetRequest}=exports;
