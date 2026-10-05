/** Parse only explicit user percentage assumptions; never infer a baseline from a source or model reply. */
export type TurnoverRates={baseline:number|null;target:number|null;period:'annualized'|'ytd'|null;conflict:boolean};
const number='[+-]?\\d+(?:\\.\\d+)?';
const rate=(value:string)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=0&&parsed<=100?parsed:null};
export function explicitTurnoverRates(statement:string):TurnoverRates{
 statement=statement.replace(/\((annualized|annualised|YTD)\)/gi,'$1').replace(/\b(annualized|annualised|YTD):/gi,'$1 ');
 const baselines:number[]=[],targets:number[]=[];let invalid=false;
 const add=(values:number[],raw:string)=>{const value=rate(raw);if(value===null)invalid=true;else values.push(value)};
 // Both units are explicit. Arrow/from-to notation assigns baseline then target, not a percentage-point effect.
 for(const match of statement.matchAll(new RegExp(`(?<![\\d.])(${number})\\s*%\\s*(?:→|->|to)\\s*(${number})\\s*%`,'gi'))){add(baselines,match[1]);add(targets,match[2]);}
 const targetClause=(index:number)=>/\btarget\b/i.test(statement.slice(0,index).split(/[;.!?\n]/).at(-1)??'');
 const terms='(?:(?:annualized|annualised|annual|voluntary|employee|regrettable|turnover|rate|current)\\s+)*';
 for(const match of statement.matchAll(new RegExp(`\\bbaseline\\s*${terms}(?:is\\s+|of\\s+|at\\s+)?[:=]?\\s*\\(?(${number})\\s*%`,'gi')))add(baselines,match[1]);
 for(const match of statement.matchAll(new RegExp(`(?<![\\d.])(${number})\\s*%\\s+${terms}baseline\\b`,'gi')))add(baselines,match[1]);
 for(const match of statement.matchAll(new RegExp(`\\bannual(?:ized|ised)\\s+(${number})\\s*%`,'gi')))if(!targetClause(match.index))add(baselines,match[1]);
 for(const match of statement.matchAll(new RegExp(`\\b(?:YTD|year.to.date)\\s+(${number})\\s*%`,'gi')))if(!targetClause(match.index))add(baselines,match[1]);
 for(const match of statement.matchAll(new RegExp(`\\btarget\\s*${terms}(?:is\\s+|of\\s+|at\\s+)?[:=]?\\s*\\(?(${number})\\s*%(?!\\s*(?:relative|reduction|decrease|lower|→|->|to\\b))`,'gi')))add(targets,match[1]);
 for(const match of statement.matchAll(new RegExp(`(?<![\\d.])(${number})\\s*%\\s+${terms}target\\b`,'gi')))add(targets,match[1]);
 const distinct=(values:number[])=>[...new Set(values)],conflict=invalid||distinct(baselines).length>1||distinct(targets).length>1;
 const period=baselines.length?(/\b(?:YTD|year.to.date)\b/i.test(statement)?'ytd':/\bannual(?:ized|ised)\b/i.test(statement)?'annualized':null):null;
 return {baseline:conflict?null:baselines.at(-1)??null,target:conflict?null:targets.at(-1)??null,period,conflict};
}
