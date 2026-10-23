/** Shared calculated tradeoffs. A budget does not specify cheapest versus earliest coverage. */
type Choice={mix:{build:number;move:number;buy:number};cash:number|null;shortfallHours:number|null;status:string};
const number=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2});
const key=(c:Choice)=>`${c.mix.build}/${c.mix.move}/${c.mix.buy}`;
const describe=(c:Choice)=>`develop ${c.mix.build}, move ${c.mix.move}, hire ${c.mix.buy}: $${number(c.cash!)} USD, ${number(c.shortfallHours!)} uncovered hours`;
export function staffingChoiceLeaders<T extends Choice>(options:T[]){
 const eligible=options.filter(c=>c.status==='met'&&c.cash!==null&&Number.isFinite(c.cash)&&c.cash>=0&&c.shortfallHours!==null&&Number.isFinite(c.shortfallHours)&&c.shortfallHours>=0);
 if(!eligible.length)return null;
 const cash=[...eligible].sort((a,b)=>a.cash!-b.cash!||a.shortfallHours!-b.shortfallHours!||key(a).localeCompare(key(b)))[0];
 const coverage=[...eligible].sort((a,b)=>a.shortfallHours!-b.shortfallHours!||a.cash!-b.cash!||key(a).localeCompare(key(b)))[0];
 return {cash,coverage,same:key(cash)===key(coverage)};
}
export function staffingChoiceSummary(options:Choice[]){
 const leaders=staffingChoiceLeaders(options);
 if(!leaders)return 'No displayed option has verified calculations meeting the entered limits with known cash and workload shortfall. Review missing inputs or constraints before recommending a mix.';
 const {cash,coverage}=leaders;
 const tradeoff=key(cash)===key(coverage)?`The same displayed option minimizes entered cash and uncovered work: ${describe(cash)}.`:`If minimizing incremental cash is the priority, ${describe(cash)}. If minimizing uncovered work within the entered limits is the priority, ${describe(coverage)}. Choose the priority before treating either as the recommendation.`;
 return tradeoff+' This is not a claim of lowest delivery risk. Availability, release and readiness remain assumptions; end-date coverage does not erase earlier unmet work.';
}

/** An adjusted mix is a conditional scenario, not a newly optimized recommendation. */
export function adjustedStaffingSummary(option: Choice | undefined) {
 if (!option) return 'No calculated adjusted mix is available.';
 const action = `Develop ${option.mix.build}, redeploy ${option.mix.move}, and hire ${option.mix.buy}`;
 if (option.status === 'invalid') return `${action} is not a valid calculated option; review its inputs.`;
 if (option.shortfallHours === null) return `${action}, conditionally; workload coverage remains unknown.`;
 return `${action}, conditionally. ${option.shortfallHours > 0 ? `${number(option.shortfallHours)} workload hours remain uncovered.` : 'No workload shortfall is calculated under the entered assumptions.'}${option.status !== 'met' ? ' Some entered limits are unmet or unverified.' : ''}`;
}
