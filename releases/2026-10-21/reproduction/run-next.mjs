import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function commandArgs(mode,extra=[],env={}){
 if(!['build','dev','start'].includes(mode))throw Error('Unsupported command');
 if(Object.keys(env).some(k=>k.startsWith('VERCEL')))throw Error('Local reproduction cannot run on Vercel');
 if(extra.length&&(mode==='build'||extra.length!==2||!['--port','-p'].includes(extra[0])||!/^\d{1,5}$/.test(extra[1])||Number(extra[1])<1||Number(extra[1])>65535))throw Error('Only an explicit local port from 1 to 65535 is supported');
 return [mode,...(mode==='build'||mode==='dev'?['--webpack']:[]),...(mode!=='build'?['--hostname','127.0.0.1']:[]),...extra];
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=commandArgs(process.argv[2],process.argv.slice(3),process.env);
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',NEXT_TELEMETRY_DISABLED:'1'}});
 child.on('error',()=>{process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
}
