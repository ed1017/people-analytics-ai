/** Real GET routes, dataset binding and grounding source; synthetic query transport. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
export async function offlineFreshSkillRoutes(client){
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'fresh-skill-routes-'));
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('tests/fixtures/fresh-skill-routes.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},externals:{'next/server':'commonjs '+createRequire(import.meta.url).resolve('next/server')},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},plugins:[new webpackPackage.webpack.NormalModuleReplacementPlugin(/(?:^|\/)supabase-server(?:\.ts)?$/,path.resolve('tests/fixtures/fresh-skill-client-isolation.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 const sandbox={exports:{},require:createRequire(path.join(out,'route.cjs')),Response,Request,URL,URLSearchParams,Headers,TextEncoder,TextDecoder,AbortController,AbortSignal,setTimeout,clearTimeout,console,Intl,crypto:globalThis.crypto,process:{env:{}},__client:client,fetch:()=>{throw Error('Network forbidden');}};
 sandbox.module={exports:sandbox.exports};
 vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
 return {...sandbox.module.exports,dispose:()=>fs.rm(out,{recursive:true,force:true})};
}
