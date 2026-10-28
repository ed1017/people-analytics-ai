import type {ProjectionInputs} from './home-solution-projection';
// @ts-expect-error Native tests share TypeScript source.
import {calculateHeadcountProjection} from './home-solution-projection.ts';
export type ProjectionEntryValues={months:string;hires:string;exits:string;transfersIn:string;transfersOut:string};
/** Extract only explicit monthly-flow quantities. Unrecognized or conflicting values stay blank. */
export function projectionEntryValues(question:string):ProjectionEntryValues{
 const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
 const q=question.toLowerCase().replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,w=>String(words.indexOf(w)));
 const unique=(re:RegExp)=>{const found=[...q.matchAll(re)].map(m=>m[1]);return new Set(found).size===1?found[0]:'';};
 const rate=(noun:string)=>{if(/\b(?:not|instead|rather|or|point|minus|negative)\b|\d\s*\/\s*\d/.test(q))return '';const re=new RegExp('(?<![\\w.+-])(\\d+(?:\\.\\d+)?)\\s+(?:external\\s+)?'+noun+'\\b(?=([^.;!?]*))','g');const found=[...q.matchAll(re)].filter(m=>/^\s+(?:(?:per|each|a) month\b|monthly\b|and\s+\d+(?:\.\d+)?\s+(?:hires?|exits?|departures?|separations?)\s+(?:per|each|a) month\b)/.test(m[2])).map(m=>m[1]);return new Set(found).size===1?found[0]:'';};
 return {months:unique(/(?<![\w.+-])(\d+)\s+months?\b/g),hires:rate('hires?'),exits:rate('(?:exits?|departures?|separations?)'),transfersIn:'',transfersOut:''};
}
export function isHeadcountEntry(q:string){return /\b(?:project|projection|simulate|model)\b/i.test(q)&&/\bheadcount\b/i.test(q);}
/** Open controls for an actual planning request, never turn a historical question into a forecast. */
export function overviewProjectionQuestion(draft:string,lastQuestion:string):string|null{
 const eligible=(q:string)=>isHeadcountEntry(q)||(/\b(?:close|fill|address|solve|plan|manage)\b/i.test(q)&&/\b(?:staffing|capacity|headcount)\s+gap\b/i.test(q));
 if(eligible(draft))return draft;
 return eligible(lastQuestion)?lastQuestion:null;
}
export async function calculateProjectionEntry(inputs:ProjectionInputs,values:ProjectionEntryValues,id:string,turnId:string){
 const scoped=Object.values(inputs.filters).some(v=>v!=='all');
 const fields=[['monthly_hires',values.hires],['monthly_exits',values.exits],...(scoped?[['monthly_transfers_in',values.transfersIn],['monthly_transfers_out',values.transfersOut]]:[])];
 if(values.months.trim()===''||fields.some(([,v])=>v.trim()===''))throw Error('Enter the missing monthly flows and horizon; blank values are not zero.');
 const months=Number(values.months);if(!Number.isInteger(months)||months<1||months>24)throw Error('Choose 1–24 whole months.');
 return calculateHeadcountProjection({id,base:null,method:'monthly_flow',months,changes:fields.map(([field,value])=>({field:field as 'monthly_hires',kind:'literal',value:Number(value),basis:'user',turnId,interpretation:'Explicit editable monthly-flow assumption; not observed future hiring.'}))},inputs,[],[turnId]);
}
