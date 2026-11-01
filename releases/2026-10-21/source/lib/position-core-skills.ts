import source from './data/onet-core-skills-31-reviewed-us.json' with {type:'json'};
import type {PositionMarketContextReference} from './position-market-context';
export type SkillQuality={standardError:number|null;lowerCi:number|null;upperCi:number|null;domainSource:string|null};
export type PositionOccupationSkillsFacts={kind:'occupation-skills';sources:{name:string;url:string;sha256:string}[];items:{elementId:string;name:string;category:'essential'|'transferable';importance:number|null;importanceStatus:'available'|'suppressed'|'unavailable';level:number|null;levelStatus:'available'|'suppressed'|'not-relevant'|'unavailable';importanceDate:string|null;levelDate:string|null;analystSample:number|null;importanceQuality:SkillQuality;levelQuality:SkillQuality;anchors:{value:number;description:string}[]}[];occupationSkills:number;shownSkills:number;ordering:'importance descending, then element ID';databaseVersion:string;importanceScale:{min:1;max:5};levelScale:{min:0;max:7}};
const number=(s:string|undefined)=>s!==undefined&&s.trim()!==''&&Number.isFinite(Number(s))?Number(s):null;
/** Missing, suppressed and not-relevant ratings are never converted to zero. */
export function resolveSkillRating(raw:Record<string,string>|undefined,scale:'IM'|'LV'){
 const value=number(raw?.['Data Value']);
 const status:'available'|'suppressed'|'not-relevant'|'unavailable'=raw?.['Recommend Suppress']==='Y'?'suppressed':scale==='LV'&&raw?.['Not Relevant']==='Y'?'not-relevant':raw&&raw['Recommend Suppress']==='N'&&raw['Scale ID']===scale&&(scale==='IM'?raw['Not Relevant']==='':raw['Not Relevant']==='N')&&value!==null&&value>=(scale==='IM'?1:0)&&value<=(scale==='IM'?5:7)?'available':'unavailable';
 const quality:SkillQuality={standardError:status==='available'?number(raw?.['Standard Error']):null,lowerCi:status==='available'?number(raw?.['Lower CI Bound']):null,upperCi:status==='available'?number(raw?.['Upper CI Bound']):null,domainSource:raw?.['Domain Source']??null};
 return {value:status==='available'?value:null,status,quality};
}
export function coreSkillReferences(existing:PositionMarketContextReference[]):PositionMarketContextReference[]{
 const sources=source.sources.map(s=>s.sha256).join(':');
 return existing.filter(r=>r.kind==='in-demand-software'&&r.countryCode==='US').flatMap(ref=>{
  const rows=source.ratings.filter(r=>r.raw['O*NET-SOC Code']===ref.occupationCode);if(!rows.length)return [];
  const ids=[...new Set(rows.map(r=>r.raw['Element ID']))];
  const items=ids.map(elementId=>{
   const im=rows.find(r=>r.raw['Element ID']===elementId&&r.raw['Scale ID']==='IM'),lv=rows.find(r=>r.raw['Element ID']===elementId&&r.raw['Scale ID']==='LV');
   const importance=resolveSkillRating(im?.raw,'IM'),level=resolveSkillRating(lv?.raw,'LV');
   return {elementId,name:im?.raw['Element Name']??lv!.raw['Element Name'],category:(im??lv)!.category as 'essential'|'transferable',importance:importance.value,importanceStatus:importance.status as 'available'|'suppressed'|'unavailable',level:level.value,levelStatus:level.status,importanceDate:im?.raw.Date??null,levelDate:lv?.raw.Date??null,analystSample:im?.raw.N===lv?.raw.N?number(im?.raw.N):null,importanceQuality:importance.quality,levelQuality:level.quality,anchors:source.anchors.filter(a=>a.raw['Element ID']===elementId&&a.raw['Scale ID']==='LV').map(a=>({value:Number(a.raw['Anchor Value']),description:a.raw['Anchor Description']}))};
  }).sort((a,b)=>(b.importance??-1)-(a.importance??-1)||a.elementId.localeCompare(b.elementId));
  return [{...ref,id:`onet-core-skills:${ref.occupationCode}:${ref.roles[0]}`,version:`${source.id}:${sources}:${ref.version}`,kind:'occupation-skills' as const,title:'Occupational core skills',period:'O*NET 31.0',population:'Analyst ratings of skills for this US occupation',unit:'importance 1–5; level 0–7',sourceUrl:source.sources[0].url,sourceSha256:source.sources[0].sha256,attribution:source.attribution,licence:source.licence,licenceUrl:source.licenceUrl,mappingLimit:ref.mappingLimit+' Occupational skill ratings are not employee proficiency, candidate supply, training duration or job-posting demand. Rating dates vary by occupation; the analyst sample is not an employee sample.',facts:{kind:'occupation-skills' as const,sources:source.sources.map(({name,url,sha256})=>({name,url,sha256})),items,occupationSkills:ids.length,shownSkills:items.length,ordering:'importance descending, then element ID' as const,databaseVersion:source.databaseVersion,importanceScale:{min:1 as const,max:5 as const},levelScale:{min:0 as const,max:7 as const}}}];
 });
}
