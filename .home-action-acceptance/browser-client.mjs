/** Compile the actual Home client for an offline browser; no hosted app or provider. */
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
export async function compileClient(root,output){
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.join(root,'tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'client.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':root}},plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':'"true"','process.env.NEXT_PUBLIC_GOAL_PROGRESS':'"false"','process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':'"false"'})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'self\'; img-src data:"></head><body><div id="root"></div><script>'+String(await fs.readFile(path.join(output,'client.js'))).replaceAll('</script','<\\/script')+'</script></body></html>';
}
export const aggregateFixture={overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]};
