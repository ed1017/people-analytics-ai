// Qualitative proposals only. These records never enter model inputs or calculators.
export type HomeCandidate={title:string;outcome:string;why:string;source_ids:string[]};
export type HomeCandidateProposal={version:1;problem:string;options:HomeCandidate[];question:string|null};
export type HomeCandidateRecord={version:1;goalId:string;goal:string;selectionGoal:string;sourceKey:string;proposal:HomeCandidateProposal};
type Source={id:string;status:string;facts:unknown;[key:string]:unknown};
export type CandidatePack={version?:number;workforceScope?:string|null;sources:Source[]};
const obj=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const short=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=max?value.trim():null;
const known=(value:unknown):boolean=>typeof value==='number'?Number.isFinite(value):!!value&&typeof value==='object'&&Object.values(value).some(known);
export function candidateSourceKey(pack:CandidatePack){return JSON.stringify({version:pack.version,workforceScope:pack.workforceScope,sources:pack.sources})}
export function readHomeCandidateProposal(raw:unknown,pack:CandidatePack|null|undefined):HomeCandidateProposal|null{
 const value=obj(raw);if(!value||value.version!==1||!pack||!Array.isArray(pack.sources))return null;
 const problem=short(value.problem,240),question=value.question===null?null:short(value.question,200);
 if(!problem||value.question!==null&&!question||question&&(question.match(/\?/g)?.length??0)>1||!Array.isArray(value.options)||value.options.length>3)return null;
 const available=new Set(pack.sources.filter(source=>source.status==='loaded'&&known(source.facts)).map(source=>source.id));
 if(!available.size)return null;
 const options:HomeCandidate[]=[],titles=new Set<string>(),outcomes=new Set<string>();
 for(const rawOption of value.options){
  const option=obj(rawOption);if(!option||Object.keys(option).some(key=>!['title','outcome','why','source_ids'].includes(key)))return null;
  const title=short(option.title,80),outcome=short(option.outcome,180),why=short(option.why,240),ids=option.source_ids;
  if(!title||!outcome||!why||!Array.isArray(ids)||!ids.length||ids.length>3||ids.some(id=>typeof id!=='string'||!available.has(id)))return null;
  // Do not reinterpret a numerical/efficacy prediction as a qualitative option.
  if(!/^(Investigate|Test|Consider|Review|Assess|Explore)\b/i.test(title)||! /^(Investigate|Test|Consider|Review|Assess|Explore)\b/i.test(outcome)||/[\d$€£%]|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|percent|guarantee[ds]?|will|proven|caus(?:e[ds]?|al))\b/i.test(title+' '+outcome+' '+why))return null;
  const titleKey=title.toLocaleLowerCase().replace(/\W/g,''),outcomeKey=outcome.toLocaleLowerCase().replace(/\W/g,'');
  if(titles.has(titleKey)||outcomes.has(outcomeKey))continue;
  titles.add(titleKey);outcomes.add(outcomeKey);options.push({title,outcome,why,source_ids:[...new Set(ids as string[])]});
 }
 if(!options.length&&!question)return null;
 return {version:1,problem,options,question};
}
export function readHomeCandidateRecord(raw:unknown,goalId:string,goal:string,pack:CandidatePack):HomeCandidateRecord|null{
 const record=obj(raw);if(!record||record.version!==1||record.goalId!==goalId||record.goal!==goal||typeof record.selectionGoal!=='string'||record.selectionGoal.length>12000||record.sourceKey!==candidateSourceKey(pack))return null;
 const proposal=readHomeCandidateProposal(record.proposal,pack);return proposal?{version:1,goalId,goal,selectionGoal:record.selectionGoal,sourceKey:record.sourceKey as string,proposal}:null;
}
export function candidateSelectionGoal(raw:unknown){const value=obj(raw)?.selectionGoal;return typeof value==='string'&&value.length<=12000?value:null}
