/** Build only: inspect the resulting HTML through an authorized browser. No server or browser is started. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'progress-target-card-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/progress-target-card.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const file=path.join(output,'fixture.html');
const block="window.fetch=()=>{throw Error('Offline fixture: network forbidden')};window.XMLHttpRequest=window.WebSocket=window.EventSource=class{constructor(){throw Error('Offline fixture: network forbidden')}};";
await fs.writeFile(file,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; font-src data:"><title>Offline progress-card fixture</title><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><script>${block}${js.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log(JSON.stringify({file,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browserRun:false,fullApplicationTest:false,productionProgressEnabled:false,cardMountedDirectly:true}));
