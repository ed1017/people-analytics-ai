// @ts-expect-error Native tests share the versioned TypeScript generator.
import {generateCompanyPositionInventoryV2} from './company-position-model-v2.ts';
import marginals from './data/company-position-marginals-v2.json' with {type:'json'};

/** New generated cross-sections. Existing rating/survey releases are never rewritten. */
export const HISTORY_VERSION='synthetic-workforce-history-v1';
export const HISTORY_SEED='ed-workforce-history-2026-10-30-v1';
export const HISTORY_DATASET_TOKEN='workforce-demo-9037-public-aggregates-v4:5';
export const HISTORY_BUNDLE_DIGEST='2ffb177d4343276608d06ae320b8c0c5891ebd39f64c3b4a59e14b0eb416f94b';
export const HISTORY_PERIODS=Object.freeze([
 Object.freeze({id:'2024',label:'2024 Annual',snapshotDate:'2024-12-31',surveyDate:'2024-12-31',population:8636,respondents:6687}),
 Object.freeze({id:'2025',label:'2025 Annual',snapshotDate:'2025-12-31',surveyDate:'2025-12-31',population:8831,respondents:6987}),
 Object.freeze({id:'2026',label:'2026 YTD',snapshotDate:'2026-09-30',surveyDate:'2026-09-30',population:9037,respondents:7028}),
]);
export const HISTORY_ITEMS=Object.freeze([
 Object.freeze({id:'clarity',label:'I understand what is expected in my role.',reverse:false}),
 Object.freeze({id:'resources',label:'I have the resources needed to do my work.',reverse:false}),
 Object.freeze({id:'pressure',label:'I feel overwhelmed by my workload.',reverse:true}),
 Object.freeze({id:'support',label:'I receive useful support from my manager.',reverse:false}),
 Object.freeze({id:'growth',label:'I have opportunities to develop my skills.',reverse:false}),
]);
export const HISTORY_METHOD=Object.freeze({
 version:HISTORY_VERSION,seed:HISTORY_SEED,
 population:'Period-specific synthetic cross-sections use filled modeled inventory slots only as dimensional templates. Historical cohorts are deterministic subsets; IDs are newly generated, not employee or position identifiers. Historical dimension distributions are modeled, not observed employment histories.',
 anchors:'Company population and valid-respondent totals match the released December 2024, December 2025 and September 2026 survey waves. Current dimensional totals match the modeled 9,037-person workforce.',
 ratings:'Generated ordinal ratings 1–5, with independently generated not-rated status. These do not replace the existing published rating counts.',
 survey:'Five generated 1–5 items; workload pressure is reverse-coded as 6 minus the raw score. A valid respondent has at least two answered items. Unfavorable means respondent mean ≤2; favorable means mean ≥4; neutral lies between. Remaining generated people have no answers; invalid respondents are not generated. This nonresponse allocation is modeled, not a recovered source classification. These are respondent classes, not the existing answer-share favorability.',
 protection:'Minimum-10 display policy for reproducible fictional data, not anonymization or a complete protection against overlapping-query inference. Small selected/complement cohorts and linked summary differences are withheld; small chart cells receive complementary suppression. No real employee records are used.',
});
export type HistorySentiment='all'|'unfavorable'|'neutral'|'favorable';
export type HistoryFilters={period:string;orgs:string[];countries:string[];levels:string[];sentiment:HistorySentiment};
export type HistoryPerson=Readonly<{id:string;org:string;country:string;level:string;rating:number|null;answers:readonly (number|null)[];sentiment:Exclude<HistorySentiment,'all'>|null}>;
export type HistoryCell=Readonly<{id:string;label:string;count:number|null;percent:number|null;status:'available'|'suppressed'}>;
export type HistoryTotals=Readonly<{people:number|null;rated:number|null;notRated:number|null;respondents:number|null;nonrespondents:number|null}>;
export type HistoryResult=Readonly<{status:'available'|'empty'|'suppressed'|'invalid'|'unavailable';reason:string|null;version:string;period:typeof HISTORY_PERIODS[number]|null;filters:HistoryFilters|null;totals:HistoryTotals;ratings:readonly HistoryCell[];sentiments:readonly HistoryCell[];businessUnits:readonly HistoryCell[];countries:readonly HistoryCell[];levels:readonly HistoryCell[]}>;
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const hash=(value:string)=>{let n=2166136261;for(let i=0;i<value.length;i++){n^=value.charCodeAt(i);n=Math.imul(n,16777619);}return n>>>0;};
type HistoryTemplate=Readonly<{id:string;orgCode:string;countryCode:string;level:string;team:string;location:string}>;
let templates:readonly HistoryTemplate[]|undefined;
const getTemplates=():readonly HistoryTemplate[]=>{
 if(templates)return templates;
 if(marginals.metadata.datasetToken!==HISTORY_DATASET_TOKEN||marginals.metadata.bundleDigest!==HISTORY_BUNDLE_DIGEST||marginals.summary.headcount!==9037)throw Error('History source version does not match its approved anchors.');
 const rows=generateCompanyPositionInventoryV2().positions.filter(row=>row.status==='filled');
 if(rows.length!==9037)throw Error('History template population does not match its approved anchor.');
 templates=Object.freeze(rows.map(row=>{
  if(!('orgCode' in row)||typeof row.orgCode!=='string'||!('countryCode' in row)||typeof row.countryCode!=='string'||typeof row.level!=='string')throw Error('History dimensional template is incomplete.');
  return Object.freeze({id:row.id,orgCode:row.orgCode,countryCode:row.countryCode,level:row.level,team:row.team,location:row.location});
 }));return templates;
};
const options=(pairs:readonly {value:string;label:string}[])=>Object.freeze([...new Map(pairs.map(p=>[p.value,Object.freeze(p)])).values()].sort((a,b)=>compare(a.value,b.value)));
export const HISTORY_OPTIONS=Object.freeze({
 orgs:options(getTemplates().map(row=>({value:row.orgCode,label:row.team}))),
 countries:options(getTemplates().map(row=>({value:row.countryCode,label:row.location}))),
 levels:Object.freeze([...options(getTemplates().map(row=>({value:row.level!,label:row.level!})))].sort((a,b)=>Number(a.value.slice(1))-Number(b.value.slice(1)))),
});
export function defaultHistoryFilters():HistoryFilters{return {period:'2026',sentiment:'all',orgs:HISTORY_OPTIONS.orgs.map(x=>x.value),countries:HISTORY_OPTIONS.countries.map(x=>x.value),levels:HISTORY_OPTIONS.levels.map(x=>x.value)};}
export function classifyHistoryAnswers(answers:readonly (number|null)[]):Exclude<HistorySentiment,'all'>|null {
 if(answers.length!==HISTORY_ITEMS.length||answers.some(v=>v!==null&&(!Number.isInteger(v)||v<1||v>5)))return null;
 const scored=answers.flatMap((v,i)=>v===null?[]:[HISTORY_ITEMS[i].reverse?6-v:v]);
 if(scored.length<2)return null;
 const mean=scored.reduce((a,b)=>a+b,0)/scored.length;
 return mean<=2?'unfavorable':mean>=4?'favorable':'neutral';
}
const cache=new Map<string,readonly HistoryPerson[]>();
/** Pure, reproducible synthetic records for invariants and local aggregation only. */
export function generateSyntheticHistory(periodId:string):readonly HistoryPerson[] {
 const period=HISTORY_PERIODS.find(p=>p.id===periodId);if(!period)throw Error('Unsupported history period.');
 const existing=cache.get(periodId);if(existing)return existing;
 const ranked=getTemplates().map(t=>({t,rank:hash(`${HISTORY_SEED}|cohort|${periodId}|${t.id}`)})).sort((a,b)=>a.rank-b.rank||compare(a.t.id,b.t.id)).slice(0,period.population);
 const responseRanks=ranked.map((_,i)=>({i,rank:hash(`${HISTORY_SEED}|respondent|${periodId}|${i}`)})).sort((a,b)=>a.rank-b.rank||a.i-b.i);
 const respondents=new Set(responseRanks.slice(0,period.respondents).map(r=>r.i));
 const result=Object.freeze(ranked.map(({t},i)=>{
  const id=`HIST-${periodId}-${String(i+1).padStart(5,'0')}`,key=`${HISTORY_SEED}|${id}`;
  const ratingCode=hash(key+'|rating')%100,notRated=hash(key+'|not-rated')%100<7;
  const rating=notRated?null:ratingCode<4?1:ratingCode<17?2:ratingCode<68?3:ratingCode<94?4:5;
  const anchor=1+hash(key+'|anchor')%5,answered=2+hash(key+'|answered')%4;
  const itemOrder=HISTORY_ITEMS.map((_,j)=>({j,rank:hash(key+'|item-order|'+j)})).sort((a,b)=>a.rank-b.rank||a.j-b.j).slice(0,answered).map(x=>x.j);
  const answers=Object.freeze(HISTORY_ITEMS.map((item,j)=>{if(!respondents.has(i)||!itemOrder.includes(j))return null;const score=Math.max(1,Math.min(5,anchor+(hash(key+'|item|'+j)%3)-1));return item.reverse?6-score:score;}));
  return Object.freeze({id,org:t.orgCode,country:t.countryCode,level:t.level!,rating,answers,sentiment:classifyHistoryAnswers(answers)});
 }));
 if(result.length!==period.population||result.filter(p=>p.sentiment!==null).length!==period.respondents)throw Error('Synthetic history anchor mismatch.');
 cache.set(periodId,result);return result;
}
function normalizeFilters(value:unknown):HistoryFilters|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>,keys=['period','orgs','countries','levels','sentiment'];
 if(Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k))||!HISTORY_PERIODS.some(p=>p.id===v.period)||typeof v.sentiment!=='string'||!['all','unfavorable','neutral','favorable'].includes(v.sentiment))return null;
 const result={period:v.period,sentiment:v.sentiment} as HistoryFilters;
 for(const key of ['orgs','countries','levels'] as const){const a=v[key];if(!Array.isArray(a)||a.length>100||a.some(x=>typeof x!=='string'||!HISTORY_OPTIONS[key].some(o=>o.value===x)))return null;result[key]=[...new Set(a)].sort(compare);}
 for(const key of ['orgs','countries','levels'] as const)Object.freeze(result[key]);
 return Object.freeze(result);
}
const small=(n:number)=>n>0&&n<10;
/** The returned arrays never contain a hidden count/percentage alongside a suppression flag. */
function cells(counts:readonly {id:string;label:string;count:number}[],denominator:number):readonly HistoryCell[] {
 const hidden=new Set(counts.filter(c=>small(c.count)).map(c=>c.id));
 if(hidden.size){const secondary=counts.filter(c=>!hidden.has(c.id)&&c.count>0).sort((a,b)=>a.count-b.count||compare(a.id,b.id))[0];if(secondary)hidden.add(secondary.id);}
 return Object.freeze(counts.map(c=>Object.freeze({id:c.id,label:c.label,count:hidden.has(c.id)?null:c.count,percent:hidden.has(c.id)||denominator===0?null:100*c.count/denominator,status:hidden.has(c.id)?'suppressed' as const:'available' as const})));
}
const emptyTotals=():HistoryTotals=>Object.freeze({people:null,rated:null,notRated:null,respondents:null,nonrespondents:null});
export function queryWorkforceHistory(value:unknown,context:{datasetToken:unknown;bundleDigest:unknown}|null|undefined):HistoryResult {
 const filters=normalizeFilters(value),period=HISTORY_PERIODS.find(p=>p.id===filters?.period)??null;
 const base={version:HISTORY_VERSION,period,filters,totals:emptyTotals(),ratings:[],sentiments:[],businessUnits:[],countries:[],levels:[]} as const;
 if(!context||context.datasetToken!==HISTORY_DATASET_TOKEN||context.bundleDigest!==HISTORY_BUNDLE_DIGEST)return Object.freeze({...base,status:'unavailable',reason:'History is unavailable for this dataset.'});
 if(!filters||!period)return Object.freeze({...base,status:'invalid',reason:'Choose a supported period and filter selection.'});
 const all=generateSyntheticHistory(period.id),matchesClass=(p:HistoryPerson)=>filters.sentiment==='all'||p.sentiment===filters.sentiment;
 const universe=all.filter(matchesClass),selected=universe.filter(p=>filters.orgs.includes(p.org)&&filters.countries.includes(p.country)&&filters.levels.includes(p.level));
 const people=selected.length,rated=selected.filter(p=>p.rating!==null).length,respondents=selected.filter(p=>p.sentiment!==null).length;
 if(!people)return Object.freeze({...base,status:'empty',reason:'No people match this selection.',totals:Object.freeze({people:0,rated:0,notRated:0,respondents:0,nonrespondents:0})});
 const universeRated=universe.filter(p=>p.rating!==null).length,universeRespondents=universe.filter(p=>p.sentiment!==null).length;
 if([people,universe.length-people,rated,universeRated-rated,respondents,universeRespondents-respondents,people-rated,people-respondents].some(small))return Object.freeze({...base,status:'suppressed',reason:'Results are withheld for groups or complements smaller than 10. Broaden or reset the selection.'});
 const totals=Object.freeze({people,rated,notRated:people-rated,respondents,nonrespondents:people-respondents});
 const dimensions=(key:'org'|'country'|'level',opts:typeof HISTORY_OPTIONS.orgs)=>opts.map(o=>({id:o.value,label:o.label,count:selected.filter(p=>p[key]===o.value).length}));
 const ratingCounts=[1,2,3,4,5].map(n=>({id:String(n),label:`Rating ${n}`,count:selected.filter(p=>p.rating===n).length}));
 const sentimentCounts=(['unfavorable','neutral','favorable'] as const).map(id=>({id,label:id[0].toUpperCase()+id.slice(1),count:selected.filter(p=>p.sentiment===id).length}));
 const orgCounts=dimensions('org',HISTORY_OPTIONS.orgs),countryCounts=dimensions('country',HISTORY_OPTIONS.countries),levelCounts=dimensions('level',HISTORY_OPTIONS.levels);
 if([ratingCounts,sentimentCounts,orgCounts,countryCounts,levelCounts].some(partition=>partition.some(c=>small(c.count))&&!partition.some(c=>c.count>=10)))return Object.freeze({...base,status:'suppressed',reason:'Results are withheld because every populated chart group is smaller than 10. Broaden or reset the selection.'});
 return Object.freeze({...base,status:'available',reason:null,totals,
  ratings:cells(ratingCounts,rated),sentiments:cells(sentimentCounts,respondents),
  businessUnits:cells(orgCounts,people),countries:cells(countryCounts,people),levels:cells(levelCounts,people),
 });
}
