export type StaffingChoice={id:string;mix:{build:number;move:number;buy:number};cash:number|null;shortfallHours:number|null;addedEmployees:number;status:string};
/** One bounded presentation for ordinary and guided planning. Identity is the mix, not entry point. */
export function selectStaffingOptions<T extends StaffingChoice>(options:T[]):T[]{
 const reference=options.find(o=>o.mix.build===0&&o.mix.move===0);
 const rank=(a:T,b:T)=>(a.shortfallHours??Infinity)-(b.shortfallHours??Infinity)||(a.cash??Infinity)-(b.cash??Infinity)||a.addedEmployees-b.addedEmployees||a.id.localeCompare(b.id);
 const lowest=options.filter(o=>o.status==='met'&&o.cash!==null).sort((a,b)=>a.cash!-b.cash!||rank(a,b))[0];
 const retained=[...(reference?[reference]:[]),...(lowest&&lowest!==reference?[lowest]:[])];
 return [...retained,...[...options].sort(rank).filter(o=>!retained.includes(o))].slice(0,6);
}
