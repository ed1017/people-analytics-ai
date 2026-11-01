import source from './data/japan-data-architect-skills-v7.json' with {type:'json'};
// @ts-expect-error Native tests share canonical source.
import {japanSkillReferences,resolveJapanSkillMean,type PositionOccupationalSkillLevelsFacts} from './position-japan-skills.ts';
import type {PositionMarketContextReference} from './position-market-context';
export function japanDataArchitectReferences():PositionMarketContextReference[]{
 if(source.profileId!=='523'||source.sourceSha256!=='0284e82309b70fa7f7597e849c175099ab9e1ef7717e8f81d547400ec34c4e23'||source.skills.length!==39)throw Error('Japan Data Architect source unavailable.');
 const base=japanSkillReferences()[0],original=base.facts as PositionOccupationalSkillLevelsFacts;
 const items=source.skills.map((x,i)=>{const label=original.items[i];if(x.id!==label.variableId||x.nameJa!==label.labelJa||x.column!==i+22)throw Error('Japan skill identity changed.');return {variableId:x.id,labelJa:x.nameJa,labelEn:label.labelEn,raw:x.raw,...resolveJapanSkillMean(x.raw),csvRecord:source.csvRecord,csvColumn:x.column};});
 return [{...base,id:'jobtag-skills:523:Data Architect',version:`jobtag-japan-data-architect-v7-v1:${source.sourceSha256}:conditional-duties-v1`,roles:['Data Architect'],occupationCode:'523',occupation:source.titleJa,mappingDuties:source.dutyConfirmation,mappingLimit:`${source.referenceScope} ${base.mappingLimit}`,attribution:base.attribution.replace('selecting three occupation profiles','selecting one additional Data Engineer occupation profile'),facts:{...original,profileId:'523',items}}];
}
