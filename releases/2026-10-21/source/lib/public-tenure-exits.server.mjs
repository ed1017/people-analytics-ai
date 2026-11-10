import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {calculateTenureExits,TENURE_DIGEST} from './home-tenure-exits.mjs';
export async function readPublicTenureExits({binding,hostname,identity,filters,selection,signal}){
 const must=v=>{if(!v)throw Error('Company tenure evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&identity.digest===TENURE_DIGEST&&await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 must(filters&&same(Object.keys(filters).sort(),['country','level','org'])&&Object.values(filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100));
 must(selection&&['total','voluntary'].includes(selection.metric)&&typeof selection.cost==='boolean'&&typeof selection.rate==='boolean'&&!selection.answer);
 if(Object.values(filters).some(v=>v!=='all'))return {answer:'Tenure exit composition unavailable. Tenure exit composition is verified only for All company. Your country, business-unit and level filters are kept. Switch all three filters to All to ask for the company composition; no scoped tenure breakdown or rate has been substituted.',charts:[]};
 const response=await binding.handle(new Request('https://'+hostname+'/api/attrition',{headers:{'x-workforce-dataset':P.token},signal}));current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
 const data=await boundedJson(response.body,8*1024*1024,signal);current();must(data?.data_meta?.bundleDigest===TENURE_DIGEST&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
 must(same(Object.keys(data).sort(),['as_of','business_units','data_meta','levels','reasons','summary','tenure','trend']));
 const result=calculateTenureExits(data,selection.metric),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
 const answer=[`Current-YTD ${selection.metric} exits by tenure: All company.`,`Scope: All countries; all business units; all levels. January-October 2026, as of ${P.cutoff}. Synthetic workforce data.`,`Company total: ${fmt(result.total)} ${selection.metric} exits.`,result.rows.map(r=>`- Source band “${r.label}”: ${fmt(r.count)} ${selection.metric} exits; ${r.share===null?'share unavailable (no company exits)':fmt(r.share)+`% of company ${selection.metric} exits`}.`).join('\n'),'Bands and their order are source-reported. Exact band-generation thresholds are not verified for this capture. These are exit composition shares, not turnover rates, tenure-age estimates or causal explanations. Share denominator = company exits of the same kind in the same period. Current workforce stocks are not YTD denominators. Percentages are rounded to one decimal.',selection.rate?'Tenure turnover rates are unavailable: verified tenure-specific YTD headcount denominators are missing.':null,selection.cost?'Turnover cost is unavailable from these records. No salary multiplier, downtime assumption or cost estimate has been applied.':null].filter(Boolean).join('\n\n');
 current();return {answer,charts:[]};
}
