export type WorkforceStock={snapshot_date:string;headcount:number;fte:number};
export type TrendGroup={code:string;label:string;asOf:string;headcount:number;fte:number;history?:WorkforceStock[]};
const index=(s:string)=>Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
export function groupWorkforceTrend(g:TrendGroup,lookback=3,months=3,edited?:{headcount:number;fte:number}){
 if(!Number.isInteger(lookback)||lookback<1||lookback>12||!Number.isInteger(months)||months<1||months>12)throw Error('Choose 1–12 months.');
 const end=index(g.asOf),history=(g.history??[]).filter(p=>index(p.snapshot_date)>=end-lookback&&index(p.snapshot_date)<=end).sort((a,b)=>a.snapshot_date.localeCompare(b.snapshot_date));
 if(history.length!==lookback+1||history.some((p,i)=>index(p.snapshot_date)!==end-lookback+i||!Number.isFinite(Date.parse(p.snapshot_date))||new Date(Date.parse(p.snapshot_date)+86400000).getUTCDate()!==1||![p.headcount,p.fte].every(n=>Number.isFinite(n)&&n>=0)||p.fte>p.headcount)||history.at(-1)!.headcount!==g.headcount||history.at(-1)!.fte!==g.fte)throw Error('A complete consecutive group history is unavailable for this window.');
 const observed={headcount:(g.headcount-history[0].headcount)/lookback,fte:(g.fte-history[0].fte)/lookback};const change=edited??observed;
 if(!Object.values(change).every(Number.isFinite))throw Error('Enter valid monthly net changes.');
 const points=Array.from({length:months+1},(_,i)=>({month:new Date(Date.UTC(Math.floor((end+i)/12),(end+i)%12+1,0)).toISOString().slice(0,10),headcount:g.headcount+i*change.headcount,fte:g.fte+i*change.fte}));
 if(points.some(p=>p.headcount<0||p.fte<0||p.fte>p.headcount))throw Error('These changes imply invalid workforce stocks; revise the assumptions.');
 return {history,observed,change,points,lookback,months,from:history[0].snapshot_date,to:g.asOf,deltaHeadcount:points.at(-1)!.headcount-g.headcount,deltaFte:points.at(-1)!.fte-g.fte};
}
