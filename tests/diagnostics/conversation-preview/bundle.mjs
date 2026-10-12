/** Local compilation only; source byte manifest is checked separately before execution. */
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
export async function compileRoute(root,out,{offline=false}={}){
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.join(root,'tests/diagnostics/conversation-preview/entry.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':path.join(root,'tests/diagnostics/conversation-preview/sdk.mjs'),...(offline?{'@/lib/openai-proxy-transport$':path.join(root,'tests/fixtures/home-route-isolation.ts'),'@/lib/home-solution-grounding-source$':path.join(root,'tests/fixtures/solution-planning-route-isolation.ts')}:{}),'@':root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 return path.join(out,'route.cjs');
}
