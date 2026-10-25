/** Display only; saved values and calculations retain their original precision. */
export function plannerCash(value:number|null|undefined){return value==null||!Number.isFinite(value)?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);}
export function plannerDate(value:string|null|undefined){
 if(!value||!/^\d{4}-\d{2}(-\d{2})?$/.test(value))return 'Unknown';
 const date=new Date(value.length===7?value+'-01T00:00:00Z':value+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,value.length)!==value)return 'Unknown';
 return new Intl.DateTimeFormat('en-US',{month:'short',...(value.length===10?{day:'numeric' as const}:{}),year:'numeric',timeZone:'UTC'}).format(date);
}
export function staffingActionHeadline(option:{status:string;mix:{build:number;move:number;buy:number}}){
 if(option.status==='invalid')return 'Review this staffing allocation.';
 return ([['Develop',option.mix.build],['Redeploy',option.mix.move],['Hire',option.mix.buy]] as const).filter(([,count])=>count>0).map(([label,count])=>`${label} ${count}.`).join(' ')||'No additional roles selected.';
}
