/** Uniform productive capacity on calendar days, including the readiness date. */
export function unavailableMonthFraction(date:string){
 const start=Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7))-1,1);
 const next=Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),1);
 const day=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==date)throw Error('Invalid readiness date.');
 return (day-start)/(next-start);
}
