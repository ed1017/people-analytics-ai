import {normalizeHomePack} from './home-pack.mjs';
import type {ActionBinding} from './home-action-drafts';

// These rows are labelled categorical observations, not a time series or an ordered selection.
// Chronological W1/R1/S1, scenario P1, selected quotes I3 and Development options D1 retain order. I2 already has a fixed normalized series order.
const unorderedRows=new Set(['W2','A1','S2','T1','T2','T3','T4']);
const object=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const canonical=(value:unknown):string=>JSON.stringify(value,(_,item)=>object(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');

/** Fingerprint projection only. The actual model packet and displayed evidence retain their order. */
export function canonicalHomeEvidence(packet:unknown){
 const normalized=normalizeHomePack(packet);
 return {...normalized,sources:normalized.sources.map((source:{id:string;facts:Record<string,unknown>|null})=>{
  if(!unorderedRows.has(source.id)||!Array.isArray(source.facts?.rows))return source;
  return {...source,facts:{...source.facts,rows:[...source.facts.rows].sort((a,b)=>{const left=canonical(a),right=canonical(b);return left<right?-1:left>right?1:0;})}};
 })};
}
export type EvidenceFingerprint={version:1;mode:'canonical'|'ordered';ordered:string;canonical:string;availability:string};
export async function evidenceFingerprint(packet:unknown,mode:EvidenceFingerprint['mode']):Promise<EvidenceFingerprint>{
 const normalized=normalizeHomePack(packet);
 const [ordered,semantic,availability]=await Promise.all([digest(normalized),digest(canonicalHomeEvidence(normalized)),digest(normalized.sources.map((source:{id:string;status:string})=>({id:source.id,status:source.status})))]);
 return {version:1,mode,ordered,canonical:semantic,availability};
}
export function readEvidenceFingerprint(raw:unknown,binding?:ActionBinding):EvidenceFingerprint|null{
 const value=object(raw);
 if(!value||Object.keys(value).sort().join()!=='availability,canonical,mode,ordered,version'||value.version!==1||!['canonical','ordered'].includes(String(value.mode))||!['ordered','canonical','availability'].every(key=>typeof value[key]==='string'&&/^[a-f0-9]{64}$/.test(value[key] as string)))return null;
 const result=value as unknown as EvidenceFingerprint;
 return binding&&binding.evidenceDigest!==result[result.mode]?null:result;
}
export function preparationEvidenceMode(raw:unknown):EvidenceFingerprint['mode']{
 const value=object(raw);return raw==null?'canonical':readEvidenceFingerprint(value?.evidenceFingerprint)?.mode??'ordered';
}
export type PlanContextDiagnostic={goal:'changed'|'unchanged';evidence:'changed'|'unchanged';planning:'changed'|'unchanged';detail:'unchanged'|'availability_changed'|'detail_order_only'|'content_changed'|'baseline_unavailable';reviewedTransition:boolean};
/** Fixed classifications only: no field values, source payloads, goal text or hashes are displayed. */
export function planContextDiagnostic(original:ActionBinding,current:ActionBinding,saved:unknown,now:EvidenceFingerprint,reviewedTransition=false):PlanContextDiagnostic{
 const previous=readEvidenceFingerprint(saved,original),changed=original.evidenceDigest!==current.evidenceDigest;
 const detail=!previous?'baseline_unavailable':previous.availability!==now.availability?'availability_changed':previous.canonical===now.canonical&&previous.ordered!==now.ordered?'detail_order_only':previous.canonical!==now.canonical?'content_changed':'unchanged';
 return {goal:original.goalId!==current.goalId||original.goal!==current.goal?'changed':'unchanged',evidence:changed?'changed':'unchanged',planning:original.planningDigest!==current.planningDigest?'changed':'unchanged',detail,reviewedTransition};
}
export function planContextDiagnosticText(value:PlanContextDiagnostic){
 const details={unchanged:'Source comparison unchanged.',availability_changed:'Source availability changed.',detail_order_only:'Only unordered detail-row order changed.',content_changed:'Source content, scope, dates, selection or meaningful order changed.',baseline_unavailable:'Detailed source comparison unavailable for this older preparation.'};
 return `Goal: ${value.goal}. Evidence: ${value.evidence}. Planning: ${value.planning}. ${details[value.detail]}${value.reviewedTransition?' The difference is covered by a reviewed local attachment transition.':''}`;
}
