import type {CandidatePack} from './home-candidate-options';
// Comparing a saved snapshot is meaningful only after the current load settles.
export function homeCandidateVerification(checking:boolean,stored:unknown,valid:boolean,goalId:string,goal:string,pack:CandidatePack):'empty'|'checking'|'current'|'unavailable'|'stale'{
 if(!stored)return 'empty';
 if(checking)return 'checking';
 if(valid)return 'current';
 if(typeof stored!=='object'||Array.isArray(stored))return 'stale';
 const record=stored as {version?:unknown;goalId?:unknown;goal?:unknown;sourceKey?:unknown};
 if(record.version!==2||record.goalId!==goalId||record.goal!==goal||typeof record.sourceKey!=='string')return 'stale';
 try{
  const previous=JSON.parse(record.sourceKey);
  if(Array.isArray(previous?.sources)&&previous.sources.some((source:{id?:unknown;status?:unknown})=>source?.status==='loaded'&&!pack.sources.some(current=>current.id===source.id&&current.status==='loaded')))return 'unavailable';
 }catch{/* Malformed saved records retain the existing stale fallback. */}
 return 'stale';
}
