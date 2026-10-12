/** Compile only the local verification entry; reject any paid/application route dependency. */
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
export async function compileVerification(root,out){
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.join(root,'tests/diagnostics/conversation-preview/verification-entry.ts'),output:{path:out,filename:'verification.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.ts','.mjs','.js']},module:{rules:[{test:/\.ts$/,exclude:/node_modules/,use:path.join(root,'tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>{
  if(error||!stats||stats.hasErrors())return reject(Error('Verification compilation failed'));
  const modules=JSON.stringify(stats.toJson({all:false,modules:true,nestedModules:true}));
  if(/\/app\/|\/node_modules\/openai\/|conversation-preview\/(?:claim\.mjs|config\.mjs|guard\.mjs|run\.mjs|sdk\.mjs|entry\.ts|bundle\.mjs)/.test(modules))return reject(Error('Paid dependency in verification bundle'));
  resolve();
 })));
 return path.join(out,'verification.cjs');
}
