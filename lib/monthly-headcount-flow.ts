/** Shared stock/flow arithmetic. Callers own scope and input provenance. */
export function monthlyHeadcountFlow(input: {asOf:string; opening:number; months:number; hires:number; exits:number; transfersIn:number; transfersOut:number}) {
  const {asOf, months, hires, exits, transfersIn, transfersOut} = input;
  const date = new Date(asOf);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== asOf || !Number.isSafeInteger(months) || months < 1 || months > 60 || [input.opening, hires, exits, transfersIn, transfersOut].some(v => !Number.isFinite(v) || v < 0)) throw Error('Invalid monthly headcount inputs.');
  let opening = input.opening;
  return Array.from({length: months}, (_, index) => {
    const headcount = opening + hires - exits + transfersIn - transfersOut;
    if (headcount < 0 || headcount > 1e9) throw Error('The assumed flows produce an infeasible headcount. Reduce exits/outflows or revise the horizon; negative headcount is not clamped.');
    const point = {month:new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index + 1, 1)).toISOString().slice(0, 10), opening, hires, exits, transfersIn, transfersOut, headcount, reference:null};
    opening = headcount;
    return point;
  });
}
