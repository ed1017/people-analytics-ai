import OpenAI from 'openai';
import {openAIProxyTransport} from '../../lib/openai-proxy-transport.ts';
import {CHAT_MODEL} from '../../lib/chat-model.ts';
import {solutionModelContext} from '../../lib/home-solution-conversation-service.ts';
import {solutionConversationInstructions,solutionResponseFormat,solutionTools} from '../../lib/home-solution-conversation-schema.ts';
import {fictionalProvenance,fictionalScenarios,fictionalRequest,fictionalProjection} from '../fixtures/fictional-solution-evaluation.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const out=resolve(process.argv[2]??'');if(!process.argv[2])throw Error('A new private output directory is required.');mkdirSync(out,{mode:0o700});
const sha=value=>createHash('sha256').update(value).digest('hex');
const write=(name,value)=>{const text=JSON.stringify(value,null,2)+'\n';writeFileSync(join(out,name),text,{flag:'wx',mode:0o600});return sha(text);};
const request=await fictionalRequest(fictionalScenarios[0],0),input=[{role:'user',content:'CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n'+JSON.stringify(solutionModelContext(request))}];
const payload={model:CHAT_MODEL,instructions:solutionConversationInstructions,input,tools:solutionTools,text:{format:solutionResponseFormat},tool_choice:'auto',parallel_tool_calls:false};
const fixtureSource=readFileSync(new URL('../fixtures/fictional-solution-evaluation.mjs',import.meta.url),'utf8');
if(CHAT_MODEL!=='gpt-5.6-luna'||Object.values(fictionalProvenance).some(value=>value===true))throw Error('Unexpected model or non-fictional fixture provenance.');
if(/https?:\/\/|@[A-Za-z0-9.-]+\.|(?:ghp_|github_pat_|sk-proj-)/.test(JSON.stringify(request)))throw Error('Unexpected external reference or credential-like data in fictional request.');
const provenance={...fictionalProvenance,fixtureSourceSha256:sha(fixtureSource),scenarios:fictionalScenarios,projection:fictionalProjection(),requestSha256:write('count-request.json',payload),requestUtf8Bytes:Buffer.byteLength(JSON.stringify(payload)),applicationProtocol:'Normal application instructions and JSON tool/response schemas; no file attachments, environment values or account metadata included in model input.',review:'Fixture source consists only of newly authored fictional literals and pure local constructors. No real workforce loader, browser storage, user chat, connector, private file or email read.'};write('provenance.json',provenance);
const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
try{const result=await client.responses.inputTokens.count(payload,{maxRetries:0,timeout:30000});if(result.object!=='response.input_tokens'||!Number.isSafeInteger(result.input_tokens)||result.input_tokens<0||result.input_tokens>200000)throw Error('Exact input-token bound unavailable or above 200000.');write('count-result.json',result);console.log(JSON.stringify({status:'count-verified',inputTokens:result.input_tokens,provenanceSha256:sha(readFileSync(join(out,'provenance.json'))),generationCalls:0,directory:out}));}
catch(error){const safe={status:'blocked',httpStatus:typeof error.status==='number'?error.status:null,errorType:error.constructor?.name??'Error',generationCalls:0};write('failure.json',safe);console.log(JSON.stringify(safe));process.exitCode=1;}
