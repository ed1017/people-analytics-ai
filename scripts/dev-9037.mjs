/** Run the existing app on loopback only; config/artifact paths remain outside Git. */
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {development9037Options,load9037DevelopmentBinding} from '../lib/dataset-9037-development.server.mjs';
const [file,pin]=process.argv.slice(2);
if(process.argv.length!==4)throw Error('Usage: node scripts/dev-9037.mjs ABSOLUTE_PRIVATE_CONFIG SHA256');
if(process.env.VERCEL)throw Error('Local launcher cannot run in a hosted deployment');
for(const name of ['.env','.env.local','.env.development','.env.development.local'])if(fs.existsSync(name))throw Error('Use an isolated checkout without environment files');
const env={...process.env,NODE_ENV:'development',WORKFORCE_9037_LOCAL_CONFIG:file,WORKFORCE_9037_LOCAL_SHA256:pin,NEXT_TELEMETRY_DISABLED:'1'};
for(const name of Object.keys(env))if(/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|OPENAI_|ANTHROPIC_)/.test(name))delete env[name];
await load9037DevelopmentBinding(development9037Options(env));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','9037'],{stdio:'inherit',env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1;});
