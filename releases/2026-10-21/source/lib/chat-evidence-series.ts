import {acceptsGroundedAggregate,isPublicHomeReceiptCandidate} from './public-home-receipt.mjs';
import {normalizeHomePack} from './home-pack.mjs';
// @ts-expect-error Native fixtures share source.
import {homeScopeCitations} from './home-answer-scope.ts';
// @ts-expect-error Native fixtures share source.
import {turnoverChartMonths} from './home-turnover-chat.ts';
export type ChatEvidenceSeries={version:1;requestId:string;datasetToken:string;packetSha256:string;kind:'recorded';synthetic:boolean;axis?:'business-unit'|'scalar';metric:'median_time_to_fill_days'|'bu_total_turnover_pct'|'bu_voluntary_turnover_pct'|'headcount'|'fte'|'hires'|'monthly_turnover_pct'|'monthly_voluntary_turnover_pct';title:string;unit:'people'|'FTE'|'hires'|'%'|'days';sourceId:'W1'|'A1'|'R1';scope:string;asOf:string;limitation:string;sampled:boolean;omitted:number;points:{date:string;value:number}[]};
type Grounding={datasetToken:string;packetSha256:string;sources:{id:string;status:string;scope:string;asOf:string|null;basis:string}[]};
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const metrics={fte:{source:'W1',title:'FTE snapshots',unit:'FTE',date:'snapshot_date'},headcount:{source:'W1',title:'Headcount snapshots',unit:'people',date:'snapshot_date'},hires:{source:'R1',title:'Monthly hires',unit:'hires',date:'month'},monthly_turnover_pct:{source:'A1',title:'Monthly turnover',unit:'%',date:'month'},monthly_voluntary_turnover_pct:{source:'A1',title:'Monthly voluntary turnover',unit:'%',date:'month'}} as const;
const validValue=(value:unknown,rate:boolean):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&(rate?value<=100:Number.isSafeInteger(value));
const boundedPoints=(points:{date:string}[],metric:string)=>points.length>=2&&(points.length<=3||metric.startsWith('monthly_')&&points.length===12&&points.every((p,i)=>p.date===`${points[0].date.slice(0,4)}-${String(i+1).padStart(2,'0')}-01`));
/** Only already-grounded, cited packet rows. No new reads, model points, forecasts or YTD conversion. */
export function answerEvidenceSeries(evidence:unknown,grounding:Grounding|undefined,requestId:string,question:string,answer:string):ChatEvidenceSeries[]{
 if(!grounding||!/^[a-f0-9]{64}$/.test(grounding.packetSha256))return [];
 if(/\btime[ -]to[ -]fill\b|\b(?:long|quickly|fast)\b.*\b(?:fill|hire)\b/i.test(question)&&/\bmedian\b/i.test(answer)&&homeScopeCitations(answer).includes('R1')){
  const source=normalizeHomePack(evidence).sources.find((s:{id:string})=>s.id==='R1');
  const value=(source?.facts as Record<string,unknown>|undefined)?.median_time_to_fill_days;
  if(source?.status==='loaded'&&date(source.date)&&acceptsGroundedAggregate(grounding,evidence,source)&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000){
   return [{version:1,requestId,datasetToken:grounding.datasetToken,packetSha256:grounding.packetSha256,kind:'recorded',synthetic:isPublicHomeReceiptCandidate(grounding)||!!source.sourceContext||/synthetic|fictional|simulated|constructed/i.test(source.limitation),axis:'scalar',metric:'median_time_to_fill_days',title:'Median time to fill',unit:'days',sourceId:'R1',scope:source.scope,asOf:source.date,limitation:source.limitation+' Recorded median; not a mean, future hiring promise or productive-readiness date. Exact observation window and included requisition count are unavailable.',sampled:false,omitted:0,points:[{date:source.date,value}]}];
  }
 }
 if(/\b(?:turnover|attrition|exits?)\b/i.test(question)&&/\b(?:involuntary|regrettable|non[\s\-‐‑–—]*voluntary)\b/i.test(question))return [];
 const metric=/\b(?:turnover|attrition|exits?)\b/i.test(question)?/\bvoluntary\b/i.test(question)?'monthly_voluntary_turnover_pct':'monthly_turnover_pct':/\b(?:hiring|hires|recruiting)\b/i.test(question)?'hires':/\b(?:headcount|workforce size|how many employees)\b/i.test(question)?'headcount':null;
 if(!metric)return [];
 const definition=metrics[metric];
 if(!homeScopeCitations(answer).includes(definition.source))return [];
 const source=normalizeHomePack(evidence).sources.find((source:{id:string})=>source.id===definition.source);
 if(!source||source.status!=='loaded'||!date(source.date)||!acceptsGroundedAggregate(grounding,evidence,source))return [];
 const facts=source.facts as Record<string,unknown>,asOf=source.date!;
 const rows=(metric.startsWith('monthly_')?facts.monthly??[]:facts.rows??[]) as Record<string,unknown>[];
 const requested=metric.startsWith('monthly_')?turnoverChartMonths(question,rows.filter(row=>date(row[definition.date])).map(row=>String(row[definition.date]))):undefined;
 if(requested===null)return [];
 const selected=rows.filter(row=>(!requested||requested.includes(String(row[definition.date])))&&row.suppressed!==true&&date(row[definition.date])&&String(row[definition.date])<=asOf&&validValue(row[metric],definition.unit==='%'));
 const points=selected.map(row=>({date:String(row[definition.date]),value:Number(row[metric])})).sort((a,b)=>a.date.localeCompare(b.date));
 if(!boundedPoints(points,metric)||new Set(points.map(point=>point.date)).size!==points.length)return [];
 const denominator=(source.coverage as {monthly?:{denominator?:unknown}}).monthly?.denominator;
 const limitation=[source.limitation,metric.startsWith('monthly_')&&typeof denominator==='string'?`Monthly-rate denominator: ${denominator}`:''].filter(Boolean).join(' ');
 return [{version:1,requestId,datasetToken:grounding.datasetToken,packetSha256:grounding.packetSha256,kind:'recorded',synthetic:isPublicHomeReceiptCandidate(grounding)||!!source.sourceContext||/synthetic|fictional|simulated|constructed/i.test(source.limitation),metric,title:definition.title,unit:definition.unit,sourceId:definition.source,scope:source.scope,asOf:source.date,limitation,sampled:true,omitted:rows.filter(row=>!requested||requested.includes(String(row[definition.date]))).length-points.length,points}];
}
/** Reject malformed or stale supplemental data without losing a valid text answer. */
export function readChatEvidenceSeries(raw:unknown,requestId:string,datasetToken:string):ChatEvidenceSeries[]{
 if(!Array.isArray(raw)||raw.length<1||raw.length>3)return [];
 const checked:ChatEvidenceSeries[]=[];for(const rawItem of raw){
 if(!rawItem||typeof rawItem!=='object'||Array.isArray(rawItem))return [];
 const item=rawItem as ChatEvidenceSeries;
 if(item.axis==='scalar'){
  if(item.metric!=='median_time_to_fill_days'||item.title!=='Median time to fill'||item.version!==1||item.kind!=='recorded'||typeof item.synthetic!=='boolean'||item.sampled!==false||item.omitted!==0||item.requestId!==requestId||item.datasetToken!==datasetToken||!/^[a-f0-9]{64}$/.test(item.packetSha256)||item.sourceId!=='R1'||item.unit!=='days'||!date(item.asOf)||typeof item.scope!=='string'||item.scope.length>300||typeof item.limitation!=='string'||item.limitation.length>2000||!Array.isArray(item.points)||item.points.length!==1||item.points[0]?.date!==item.asOf||typeof item.points[0]?.value!=='number'||!Number.isFinite(item.points[0].value)||item.points[0].value<0||item.points[0].value>100000)return [];
  checked.push(item);continue;
 }
 if(item?.axis==='business-unit'){
  const codes=['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'];
  const title=item.metric==='bu_total_turnover_pct'?'Business-unit total turnover':item.metric==='bu_voluntary_turnover_pct'?'Business-unit voluntary turnover':null;
  if(!title||item.title!==title||item.version!==1||item.kind!=='recorded'||item.synthetic!==true||item.sampled!==false||item.omitted!==0||item.requestId!==requestId||item.datasetToken!==datasetToken||!/^[a-f0-9]{64}$/.test(item.packetSha256)||item.sourceId!=='A1'||item.unit!=='%'||!date(item.asOf)||typeof item.scope!=='string'||item.scope.length>300||typeof item.limitation!=='string'||item.limitation.length>2000||!Array.isArray(item.points)||item.points.length!==8||new Set(item.points.map(p=>p?.date)).size!==8||item.points.some(p=>!p||!codes.includes(p.date)||typeof p.value!=='number'||!Number.isFinite(p.value)||p.value<0||p.value>10000))return [];
  checked.push(item);continue;
 }
 if(item.axis!==undefined||item.metric==='median_time_to_fill_days'||item.metric==='bu_total_turnover_pct'||item.metric==='bu_voluntary_turnover_pct')return [];
 const definition=metrics[item?.metric];
 if(!definition||item.version!==1||item.kind!=='recorded'||typeof item.synthetic!=='boolean'||typeof item.sampled!=='boolean'||item.requestId!==requestId||item.datasetToken!==datasetToken||!/^[a-f0-9]{64}$/.test(item.packetSha256)||item.sourceId!==definition.source||item.unit!==definition.unit||item.title!==definition.title||!date(item.asOf)||typeof item.scope!=='string'||item.scope.length>300||typeof item.limitation!=='string'||item.limitation.length>2000||!Number.isInteger(item.omitted)||item.omitted<0||!Array.isArray(item.points)||item.points.length<2||item.points.length>(item.sampled?12:33))return [];
 if(item.points.some((point,index)=>!point||typeof point!=='object'||Array.isArray(point)||!date(point.date)||point.date>item.asOf||!(item.metric==='fte'?typeof point.value==='number'&&Number.isFinite(point.value)&&point.value>=0:validValue(point.value,item.unit==='%'))||index>0&&point.date<=item.points[index-1].date)||!(item.sampled?boundedPoints(item.points,item.metric):['headcount','fte'].includes(item.metric)&&item.omitted===0&&item.points.every((p,i)=>p.date===new Date(Date.UTC(Number(item.points[0].date.slice(0,4)),Number(item.points[0].date.slice(5,7))+i,0)).toISOString().slice(0,10))))return [];
 checked.push(item);}
 return structuredClone(checked);
}
