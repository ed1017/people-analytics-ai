import type {CapacityDraft} from './swp-capacity-draft';
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {emptyCapacityDraft} from './swp-capacity-draft.ts';

export type DemandSkill={id:string;code:string;name:string};
export type DemandSkillCatalog={asOf:string;skills:DemandSkill[]};
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=max;
const fail=():never=>{throw Error('Skill references are unavailable. You can still enter a manual workload below.');};
/** Identity-only view of existing enterprise Skills lists. Counts are deliberately not capacity. */
export function readDemandSkills(raw:unknown):DemandSkillCatalog{
 const data=raw as Record<string,unknown>;
 if(!data||!text(data.as_of,10)||!/^\d{4}-\d{2}-\d{2}$/.test(data.as_of)||!Number.isFinite(Date.parse(data.as_of))||new Date(data.as_of).toISOString().slice(0,10)!==data.as_of)fail();
 const summary=data.summary as {current_workforce?:unknown}|undefined;
 if(typeof summary?.current_workforce!=='number'||!Number.isFinite(summary.current_workforce)||summary.current_workforce<=0)fail();
 const skills=new Map<string,DemandSkill>(),codes=new Map<string,string>();
 for(const key of ['largest_gaps','highest_demand','strongest_coverage']){
  const rows=data[key];if(!Array.isArray(rows)||rows.length>1000)fail();
  for(const row of rows as Record<string,unknown>[]){
   if(!row||!(text(row.skill_id,80)||typeof row.skill_id==='number'&&Number.isSafeInteger(row.skill_id)&&row.skill_id>=0)||!text(row.skill_code,80)||!text(row.skill_name,120))fail();
   const skill={id:String(row.skill_id),code:row.skill_code as string,name:row.skill_name as string};
   const previous=skills.get(skill.id);
   if(previous&&(previous.code!==skill.code||previous.name!==skill.name)||codes.has(skill.code)&&codes.get(skill.code)!==skill.id)fail();
   skills.set(skill.id,skill);codes.set(skill.code,skill.id);
  }
 }
 if(!skills.size)fail();
 return {asOf:data.as_of as string,skills:[...skills.values()].sort((a,b)=>a.name.localeCompare(b.name))};
}
/** Only the named reference is carried. No measured or inferred supply, demand, timing or productivity. */
export function skillClientDraft(catalog:DemandSkillCatalog,id:string):CapacityDraft{
 const skill=catalog.skills.find(row=>row.id===id);if(!skill)throw Error('Choose a skill from the current reference list.');
 return {...emptyCapacityDraft,costRate:'',scope:`${skill.name} [${skill.code}; reference ${catalog.asOf}] - clients`};
}
