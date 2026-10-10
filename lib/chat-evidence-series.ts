import {normalizeHomePack} from './home-pack.mjs';
export type ChatEvidenceSeries={version:1;requestId:string;datasetToken:string;packetSha256:string;kind:'recorded';synthetic:boolean;metric:'headcount'|'hires'|'monthly_turnover_pct'|'monthly_voluntary_turnover_pct';title:string;unit:'people'|'hires'|'%';sourceId:'W1'|'A1'|'R1';scope:string;asOf:string;limitation:string;sampled:true;omitted:number;points:{date:string;value:number}[]};
type Grounding={datasetToken:string;packetSha256:string;sources:{id:string;status:string;scope:string;asOf:string|null;basis:string}[]};
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const metrics={headcount:{source:'W1',title:'Headcount snapshots',unit:'people',date:'snapshot_date'},hires:{source:'R1',title:'Monthly hires',unit:'hires',date:'month'},monthly_turnover_pct:{source:'A1',title:'Monthly turnover',unit:'%',date:'month'},monthly_voluntary_turnover_pct:{source:'A1',title:'Monthly voluntary turnover',unit:'%',date:'month'}} as const;
const validValue=(value:unknown,rate:boolean):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&(rate?value<=100:Number.isSafeInteger(value));
/** Only already-grounded, cited packet rows. No new reads, model points, forecasts or YTD conversion. */
export function answerEvidenceSeries(evidence:unknown,grounding:Grounding|undefined,requestId:string,question:string,answer:string):ChatEvidenceSeries[]{
 if(!grounding||!/^[a-f0-9]{64}$/.test(grounding.packetSha256))return [];
 const metric=/\b(?:turnover|attrition|exits?)\b/i.test(question)?/\bvoluntary\b/i.test(question)?'monthly_voluntary_turnover_pct':'monthly_turnover_pct':/\b(?:hiring|hires|recruiting)\b/i.test(question)?'hires':/\b(?:headcount|workforce size|how many employees)\b/i.test(question)?'headcount':null;
 if(!metric)return [];
 const definition=metrics[metric];
 if(!new RegExp('\\['+definition.source+'(?::[^\\]\\n]+)?\\]').test(answer))return [];
 const source=normalizeHomePack(evidence).sources.find((source:{id:string})=>source.id===definition.source),receipt=grounding.sources.find(source=>source.id===definition.source);
 if(!source||source.status!=='loaded'||!date(source.date)||!receipt||receipt.status!=='loaded'||receipt.basis!=='database-backed-aggregate'||receipt.scope!==source.scope||receipt.asOf!==source.date)return [];
 const facts=source.facts as Record<string,unknown>,asOf=source.date!;
 const rows=(metric.startsWith('monthly_')?facts.monthly??[]:facts.rows??[]) as Record<string,unknown>[];
 const selected=rows.filter(row=>row.suppressed!==true&&date(row[definition.date])&&String(row[definition.date])<=asOf&&validValue(row[metric],definition.unit==='%'));
 const points=selected.map(row=>({date:String(row[definition.date]),value:Number(row[metric])})).sort((a,b)=>a.date.localeCompare(b.date));
 if(points.length<2||points.length>3||new Set(points.map(point=>point.date)).size!==points.length)return [];
 return [{version:1,requestId,datasetToken:grounding.datasetToken,packetSha256:grounding.packetSha256,kind:'recorded',synthetic:!!source.sourceContext||/synthetic|fictional|simulated|constructed/i.test(source.limitation),metric,title:definition.title,unit:definition.unit,sourceId:definition.source,scope:source.scope,asOf:source.date,limitation:source.limitation,sampled:true,omitted:rows.length-points.length,points}];
}
/** Reject malformed or stale supplemental data without losing a valid text answer. */
export function readChatEvidenceSeries(raw:unknown,requestId:string,datasetToken:string):ChatEvidenceSeries[]{
 if(!Array.isArray(raw)||raw.length!==1)return [];
 const item=raw[0] as ChatEvidenceSeries,definition=metrics[item?.metric];
 if(!definition||item.version!==1||item.kind!=='recorded'||typeof item.synthetic!=='boolean'||item.sampled!==true||item.requestId!==requestId||item.datasetToken!==datasetToken||!/^[a-f0-9]{64}$/.test(item.packetSha256)||item.sourceId!==definition.source||item.unit!==definition.unit||item.title!==definition.title||!date(item.asOf)||typeof item.scope!=='string'||item.scope.length>300||typeof item.limitation!=='string'||item.limitation.length>2000||!Number.isInteger(item.omitted)||item.omitted<0||!Array.isArray(item.points)||item.points.length<2||item.points.length>3)return [];
 if(item.points.some((point,index)=>!date(point.date)||point.date>item.asOf||!validValue(point.value,item.unit==='%')||index>0&&point.date<=item.points[index-1].date))return [];
 return structuredClone(raw);
}
