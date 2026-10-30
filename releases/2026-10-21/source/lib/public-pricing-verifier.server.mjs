import {createHash} from 'node:crypto';

// Public documents only. No provider endpoint, credentials, ledger port or caller URLs.
export const PUBLIC_PRICING_SOURCES = Object.freeze([
 Object.freeze({id:'pricing',url:'https://developers.openai.com/api/docs/pricing.md',sha256:'93d302a9b7a384877533bc3ab5bb48eebf4b56bd6add0f194095054b2a13f952'}),
 Object.freeze({id:'sol',url:'https://developers.openai.com/api/docs/models/gpt-6.1-sol.md',sha256:'ebcc1b0ae6c729a64411dacf303c0ae8b91b11a9be176dc8997b2652bec4b9b0'}),
 Object.freeze({id:'luna',url:'https://developers.openai.com/api/docs/models/gpt-5.6-luna.md',sha256:'bf9fdb1c3b6466c37fb856e5f8e5973ff088164b6c7792d3fb15e0d9927bd781'}),
 Object.freeze({id:'cache',url:'https://developers.openai.com/api/docs/guides/prompt-caching.md',sha256:'2da1ea8a2404b306773bee6aa1027ca36c9d0bc2f8a4ea3df83166d3da9d7e6c'}),
]);
export const PUBLIC_PRICING_MAX_BYTES=262144;
export const PUBLIC_PRICING_TIMEOUT_MS=15000;
export class PublicPricingVerificationError extends Error {
 constructor(code){super(code);this.name='PublicPricingVerificationError';this.code=code;}
}
const must=(ok,code='pricing_terms_unverified')=>{if(!ok)throw new PublicPricingVerificationError(code);};
const sha=text=>createHash('sha256').update(text).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const canonical=text=>text.replace(/\r\n/g,'\n');
function once(text,literal){must(text.split(literal).length===2);}
function row(text,key){
 const rows=text.split('\n').filter(line=>line.startsWith(`| ${key} |`));
 must(rows.length===1);
 return rows[0].split('|').slice(1,-1).map(cell=>cell.trim());
}
function money(value){
 must(/^\$\d+(?:\.\d{1,6})?$/.test(value));
 const [whole,fraction='']=value.slice(1).split('.');
 const n=Number(whole)*1000000+Number(fraction.padEnd(6,'0'));
 must(Number.isSafeInteger(n));return n;
}
function equal(a,b){must(JSON.stringify(a)===JSON.stringify(b));}
function model(text,id,input,output,cached){
 once(text,`Model ID: \`${id}\``);
 once(text,'- 1,050,000 context window');
 once(text,'- Maximum input tokens: 922,000');
 once(text,'- 128,000 max output tokens');
 for(const [key,value] of [['Input',input],['Output',output],['Cached input',cached]]){
  const cells=row(text,key);must(cells.length===3&&cells[2]==='1M tokens');equal(money(cells[1]),value);
 }
 once(text,'- Cache writes are billed at 1.25x the uncached input token rate.');
 once(text,id==='gpt-6.1-sol'
  ? '- API prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.'
  : '- Prompts with >272K input tokens are priced at 2x input and 1.5x output for the full request.');
 equal(row(text,'Responses'),['Responses','`v1/responses`','Supported']);
}

/** Fail closed on missing/ambiguous terms OR any unreviewed document change.
 * Pins supplement semantic extraction, covering new qualifying prose that a
 * selective parser could miss. Cosmetic changes therefore also require review.
 * Fixtures are captured public documents, never read by the runtime verifier. */
export function parsePublicPlannerPricing(documents){
 must(documents&&typeof documents==='object'&&Object.keys(documents).length===4);
 const docs={};
 for(const source of PUBLIC_PRICING_SOURCES){
  must(Object.hasOwn(documents,source.id)&&typeof documents[source.id]==='string');
  must(Buffer.byteLength(documents[source.id],'utf8')<=PUBLIC_PRICING_MAX_BYTES,'pricing_source_too_large');
  docs[source.id]=canonical(documents[source.id]);
 }
 const start=docs.pricing.indexOf('### Standard pricing data\n');
 must(start>=0);const end=docs.pricing.indexOf('### Batch pricing data\n',start);
 must(end>start);const standard=docs.pricing.slice(start,end);
 once(standard,'| Model | Short context input | Short context output | Short context cached input | Short context 30m write | Short context 12h write | Long context input | Long context output | Long context cached input | Long context 30m write | Long context 12h write |');
 once(docs.pricing,'Short context: ≤272K input tokens. Long context: >272K input tokens.');
 must(docs.pricing.slice(0,start).includes('Prices per 1M tokens.'));
 const sol=row(standard,'gpt-6.1-sol').slice(1).map(money);
 const luna=row(standard,'gpt-5.6-luna').slice(1).map(money);
 equal(sol,[2000000,10000000,100000,2500000,5000000,4000000,15000000,200000,5000000,10000000]);
 equal(luna,[200000,1200000,20000,250000,500000,400000,1800000,40000,500000,1000000]);
 model(docs.sol,'gpt-6.1-sol',sol[0],sol[1],sol[2]);
 model(docs.luna,'gpt-5.6-luna',luna[0],luna[1],luna[2]);
 equal(money(row(docs.sol,'Cache writes')[1]),sol[3]);
 once(docs.cache,'**Explicit mode:** You choose where to place cache breakpoints based on your context management.');
 once(docs.cache,'- Set `prompt_cache_options.mode` to `explicit` to use only developer-selected breakpoints and mark each desired breakpoint by adding `prompt_cache_breakpoint: { "mode": "explicit" }` to a supported content block inside an input message.');
 once(docs.cache,'- When no explicit breakpoints are placed, the request does not use prompt caching or create cache writes.');
 const sources=PUBLIC_PRICING_SOURCES.map(source=>{
  const digest=sha(docs[source.id]);must(digest===source.sha256,'pricing_document_changed');
  return {url:source.url,sha256:digest};
 });
 const terms={version:1,currency:'USD',unit:'microUSD per million tokens',serviceTier:'default',providerUrl:'https://api.openai.com/v1/responses',contextTokens:1050000,maximumInputTokens:922000,maximumOutputTokens:128000,longContextAboveInputTokens:272000,cacheMode:'explicit',cacheBreakpoints:0,cacheWriteCharge:false,models:{
  'gpt-6.1-sol':{inputMicroUsdPerMillion:sol[5],outputMicroUsdPerMillion:sol[6],standardPricing:sol},
  'gpt-5.6-luna':{inputMicroUsdPerMillion:luna[5],outputMicroUsdPerMillion:luna[6],standardPricing:luna},
 }};
 return freeze({terms,digest:sha(JSON.stringify(terms)),sources});
}

async function readSource(fetchImpl,source,signal){
 const response=await fetchImpl(source.url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal,headers:{Accept:'text/markdown, text/plain'}});
 must(response?.status===200&&!response.redirected&&response.url===source.url,'pricing_source_response');
 const contentType=response.headers.get('content-type')??'';
 must(/^(text\/markdown|text\/plain)(?:;|$)/i.test(contentType),'pricing_source_content_type');
 const length=response.headers.get('content-length');
 must(length===null||/^\d+$/.test(length)&&Number(length)<=PUBLIC_PRICING_MAX_BYTES,'pricing_source_too_large');
 must(response.body&&typeof response.body.getReader==='function','pricing_source_body');
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{
  while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;must(bytes<=PUBLIC_PRICING_MAX_BYTES,'pricing_source_too_large');chunks.push(value);}
  return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 }finally{void reader.cancel().catch(()=>{});}
}

/** Trusted server dependency injection for unpaid tests, never request-body args. */
export async function verifyPublicPlannerPricing({fetchImpl=globalThis.fetch,now=Date.now}={}){
 must(typeof fetchImpl==='function'&&typeof now==='function','pricing_verifier_configuration');
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new PublicPricingVerificationError('pricing_source_timeout'));},PUBLIC_PRICING_TIMEOUT_MS);});
 try{
  const work=(async()=>{
   const documents={};
   for(const source of PUBLIC_PRICING_SOURCES)documents[source.id]=await readSource(fetchImpl,source,controller.signal);
   const result=parsePublicPlannerPricing(documents),timestamp=now();
   must(Number.isSafeInteger(timestamp)&&timestamp>0,'pricing_verifier_clock');
   return freeze({verified:true,verifiedAt:new Date(timestamp).toISOString(),...result});
  })();
  return await Promise.race([work,deadline]);
 }catch(error){
  if(error instanceof PublicPricingVerificationError)throw error;
  throw new PublicPricingVerificationError('pricing_source_failed');
 }finally{clearTimeout(timer);controller.abort();}
}
