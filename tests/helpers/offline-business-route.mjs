/** Actual POST module with provider and dataset transports replaced before bundling. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
export async function offlineBusinessRoute(){
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'natural-business-route-')),isolation=path.resolve('tests/fixtures/solution-planning-route-isolation.ts');
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('app/api/home-solution-conversation/route.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':isolation,'@/lib/openai-proxy-transport$':isolation,'@/lib/dataset-runtime$':isolation,'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 const sandbox={exports:{},require:createRequire(import.meta.url),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,console,Intl,crypto:globalThis.crypto,process:{env:{OPENAI_API_KEY:'synthetic-harness-only',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',NEXT_PUBLIC_GOAL_PROGRESS:'true'}},__requests:[],__replies:[],__requestOptions:[],fetch:()=>{throw Error('Network forbidden')}};
 sandbox.module={exports:sandbox.exports};
 vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
 return {sandbox,post:sandbox.module.exports.POST};
}
