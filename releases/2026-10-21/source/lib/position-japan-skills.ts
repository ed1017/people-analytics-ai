import source from './data/japan-occupational-skills-v7.json' with {type:'json'};
import type {PositionMarketContextReference} from './position-market-context';
export type PositionOccupationalSkillLevelsFacts={kind:'occupational-skill-levels';profileId:string;releaseDate:string;internalUpdateDate:string;observationDate:null;sampleSize:null;standardError:null;confidenceInterval:null;sourceRange:{min:number;max:number};publicAnchorRange:{min:number;max:number};ratingGuideUrl:string;translationNote:string;items:{variableId:string;labelJa:string;labelEn:string;raw:string;mean:number|null;status:'available'|'zero-uninterpreted'|'unavailable';csvRecord:number;csvColumn:number}[]};
export const JAPAN_SKILL_MAPPINGS=Object.freeze([
 {role:'AI Engineer',profileId:'325',duties:'Confirm machine-learning model and data design, training and evaluation duties; exclude generic AI product use.'},
 {role:'Machine Learning Engineer',profileId:'325',duties:'Confirm machine-learning model and data design, training and evaluation duties; exclude generic AI product use.'},
 {role:'Cloud Engineer',profileId:'318',duties:'Confirm infrastructure requirements, design and construction including cloud infrastructure; exclude unrelated application work or a title-only match.'},
 {role:'Backend Software Engineer',profileId:'314',duties:'Confirm web-service requirements, database/API/internal-processing design and testing; this broader web-service profile is not a backend-only population.'}
]);
export function resolveJapanSkillMean(raw:string):{mean:number|null;status:'available'|'zero-uninterpreted'|'unavailable'}{
 if(!/^\d+(?:\.\d+)?$/.test(raw))return {mean:null,status:'unavailable'};
 const n=Number(raw);if(!Number.isFinite(n)||n<0||n>7)return {mean:null,status:'unavailable'};
 return n===0?{mean:null,status:'zero-uninterpreted'}:{mean:n,status:'available'};
}
export function japanSkillReferences():PositionMarketContextReference[]{
 if(source.source.sha256!=='0284e82309b70fa7f7597e849c175099ab9e1ef7717e8f81d547400ec34c4e23')throw Error('Japan skill source identity changed.');
 return JAPAN_SKILL_MAPPINGS.map(mapping=>{
  const row=source.records.find(r=>r.profileId===mapping.profileId);if(!row||row.skills.length!==39)throw Error('Japan skill source unavailable.');
  const items=row.skills.map(r=>({...r,...resolveJapanSkillMean(r.raw)}));
  if(new Set(items.map(r=>r.variableId)).size!==39||items.some((r,i)=>r.variableId!==`IPD_04_03_01_${String(i+1).padStart(3,'0')}`))throw Error('Japan skill variable identity changed.');
  return {id:`jobtag-skills:${mapping.profileId}:${mapping.role}`,version:`${source.id}:${source.source.sha256}:conditional-duties-v1`,kind:'occupational-skill-levels',countryCode:'JP',roles:[mapping.role],occupationCode:mapping.profileId,occupation:row.titleJa,title:'Occupational skill levels',period:'Database 7.00',geography:'Japan occupational survey reference; no city or regional breakdown',population:'Surveyed occupation profile, not the selected vacancy or employee population',unit:'occupation skill-level means; source range 0-7',sourceUrl:source.source.url,sourceSha256:source.source.sha256,attribution:source.source.attribution,licence:source.source.licence,licenceUrl:source.source.licenceUrl,mappingDuties:mapping.duties,mappingLimit:'Conditional broader jobtag occupation profile; matching duties require explicit confirmation. Occupation means are not employee proficiency, candidate supply, hiring demand or training duration. Release and internal-update dates are not survey observation dates; per-item sample sizes, standard errors and confidence intervals are unavailable in this simplified source. The workbook documents 0-7 while the public guide explains levels 1-7; a future zero is retained without interpreting or plotting it. Shared profiles must not be added across roles. No pay, cost, timing or readiness change follows attachment.',facts:{kind:'occupational-skill-levels',profileId:mapping.profileId,releaseDate:source.source.releaseDate,internalUpdateDate:source.source.internalUpdateDate,observationDate:null,sampleSize:null,standardError:null,confidenceInterval:null,sourceRange:source.source.sourceRange,publicAnchorRange:source.source.publicAnchorRange,ratingGuideUrl:source.source.ratingGuideUrl,translationNote:source.source.translationNote,items}};
 });
}
