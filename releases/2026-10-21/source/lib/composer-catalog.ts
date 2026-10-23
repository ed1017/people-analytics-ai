import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {catalogDisplayLabel} from './catalog-display';
export type CatalogKind='role'|'level'|'business unit'|'department';
export type CatalogOption={code:string;label:string};
export type CatalogMatch={kind:CatalogKind;query:string;start:number;end:number};
export function composerCatalogMatch(value:string,caret:number):CatalogMatch|null{
 if(!Number.isInteger(caret)||caret<0||caret>value.length)return null;
 for(const hit of value.matchAll(/\[(role|level|business unit|department)(?::[ \t]*([^\]\n]*))?\]/gi)){
  const start=hit.index!,end=start+hit[0].length;
  if(caret>start&&caret<=end)return {kind:hit[1].toLowerCase() as CatalogKind,query:hit[2]??'',start,end};
 }
 const before=value.slice(0,caret),open=before.match(/\[(role|level|business unit|department)(?::[ \t]*([^\]\n]*))?$/i);
 if(open)return {kind:open[1].toLowerCase() as CatalogKind,query:open[2]??'',start:caret-open[0].length,end:caret};
 const typed=before.match(/\b(role|level|business unit|department)[ \t]*:[ \t]*([^\n;[\]]*)$/i);
 return typed?{kind:typed[1].toLowerCase() as CatalogKind,query:typed[2],start:caret-typed[2].length,end:caret}:null;
}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function composerCatalogOptions(kind:CatalogKind,workforce:unknown,roles:unknown,token:string):CatalogOption[]{
 if(token!==P.token||kind==='department')return [];
 const d=obj(kind==='role'?roles:workforce),meta=obj(d.data_meta);
 if(meta.datasetId!==P.datasetId||meta.dataClass!=='constructed-synthetic'||meta.datasetToken!==token||meta.contract!==P.contract||meta.cutoff!==P.cutoff||meta.publicationApproved!==true||kind!=='role'&&d.as_of!==P.cutoff||typeof meta.bundleDigest!=='string'||! /^[a-f0-9]{64}$/.test(meta.bundleDigest)||d.suppressed===true||meta.suppressed===true)return [];
 const rows=kind==='role'?d.jobs:kind==='level'?d.levels:d.business_units;
 if(!Array.isArray(rows)||rows.length>200)return [];
 const options:CatalogOption[]=[];
 for(const raw of rows){const r=obj(raw),code=r[kind==='role'?'job_profile_code':kind==='level'?'level_code':'org_code'],name=r[kind==='role'?'job_profile_name':kind==='level'?'level_name':'org_name'];
  if(r.suppressed===true||typeof code!=='string'||typeof name!=='string'||!code||!name||code.length>80||name.length>160)return [];
  options.push({code,label:catalogDisplayLabel(name)});
 }
 return new Set(options.map(o=>o.code)).size===options.length?options:[];
}
export function filterComposerOptions(options:CatalogOption[],query:string){const q=query.trim().toLowerCase();return options.filter(o=>o.label.toLowerCase().includes(q)||o.code.toLowerCase().includes(q));}
export function insertComposerOption(value:string,match:CatalogMatch,option:CatalogOption){const insertion=option.label===option.code?option.code:option.label+' ('+option.code+')';return {value:value.slice(0,match.start)+insertion+value.slice(match.end),caret:match.start+insertion.length};}

/** Toggle a verified role in the active field; retain unrecognized manually entered values. */
export function toggleComposerRole(value:string,match:CatalogMatch,option:CatalogOption,replaceSearch=false,catalogue:CatalogOption[]=[]){
 const end=value.indexOf('\n',match.end),fieldEnd=end<0?value.length:end;
 let parts=value.slice(match.start,fieldEnd).split(',').map(s=>s.trim()).filter(Boolean);
 const label=option.label===option.code?option.code:option.label+' ('+option.code+')';
 const same=(s:string)=>s===label||s===option.code;
 const selected=parts.some(same);
 const activeIndex=value.slice(match.start,match.end).split(',').length-1;
 const fragment=parts[activeIndex];
 const known=fragment&&catalogue.some(o=>fragment===o.code||fragment===o.label||fragment===(o.label===o.code?o.code:o.label+' ('+o.code+')'));
 if(!selected&&replaceSearch&&fragment&&!known&&(option.label.toLowerCase().includes(fragment.toLowerCase())||option.code.toLowerCase().includes(fragment.toLowerCase())))parts=parts.filter((_,i)=>i!==activeIndex);
 const next=selected?parts.filter(s=>!same(s)):[...parts,label];
 const insertion=[...new Set(next)].join(', ');
 return {value:value.slice(0,match.start)+insertion+value.slice(fieldEnd),caret:match.start+insertion.length};
}
