// Local topic questions for explicit starter clicks; never invented answer findings.
// @ts-expect-error Native Node tests share TypeScript source.
import {actionEvidenceCatalog} from './home-action-proposal.ts';
import {normalizeHomePack} from './home-pack.mjs';
import type {HomeStarterGoal} from './home-starter-goals';

export type HomeStarterExploration={id:string;label:string;prompt:string;scope:string;sourceId:string;evidence:string[]};
const topics:Record<string,string>={
 T1:'What do recorded skill requirements and profile coverage show, and which gaps remain uncertain?',
 T2:'Which recorded gap skills have learning pathways, and what does catalogue coverage not establish?',
 A1:'What do recorded separation patterns show, and what remains unexplained?',
 S2:'What do supplied exit-survey summaries show, given their respondent coverage and non-causal limits?',
 S1:'What do aggregate employee survey responses show, and what are each survey’s coverage limits?',
 R1:'What does historical recruiting evidence show, without promising future starts?',
};
const goalSources:Record<string,string[]>={
 'Review workforce skill gaps':['T1','T2'],
 'Prioritize training investments':['T2','T1'],
 'Reduce turnover':['A1','S2'],
 'Improve employee satisfaction':['S1'],
 'Improve hiring':['R1'],
};

/** Existing supplied evidence only. Missing, denied, null and suppressed sources stay unavailable. */
export function homeStarterExploration(starter:HomeStarterGoal|undefined,pack:unknown):HomeStarterExploration[]{
 const sourceIds=starter?goalSources[starter.goal]??[]:[],normalized=normalizeHomePack(pack),catalog=actionEvidenceCatalog(normalized);
 return sourceIds.flatMap(sourceId=>{
  const source=normalized.sources.find(source=>source.id===sourceId);
  const evidence=catalog.filter(item=>item.sourceId===sourceId).slice(0,3).map(item=>item.id);
  return source?.status==='loaded'&&evidence.length?[{id:sourceId,label:source.label,prompt:topics[sourceId],scope:source.scope,sourceId,evidence}]:[];
 });
}

export function buildHomeStarterExplorationPrompt(item:HomeStarterExploration){
 return `Explore recorded ${item.label} evidence [${item.sourceId}].\nFollow-up question: ${item.prompt}\nSource scope: ${item.scope}. Use only the current supplied Home evidence. Preserve each source’s scope, population, sampled coverage and uncertainty; say when requested evidence is unavailable. Do not infer causes, individual risk, group rankings, intervention effects or approval, change saved assumptions, or calculate automatically.`;
}
