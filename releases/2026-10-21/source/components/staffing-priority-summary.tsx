import {staffingChoiceLeaders} from '@/lib/staffing-choice-summary';
import {guidedOptionEffort,swpTradeoffOptions,type compareSwpDemo} from '@/lib/swp-demo';

type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
const number=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:2});
const date=(value:string|null)=>value&&Number.isFinite(Date.parse(value))?new Date(value+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'Unknown';
const action=(mix:{build:number;move:number;buy:number})=>[
 mix.build?`Develop ${mix.build}`:'',mix.move?`Redeploy ${mix.move}`:'',mix.buy?`Hire ${mix.buy}`:''
].filter(Boolean).join(' · ')||'Keep the current staffing mix';
/** Heading-safe presentation of the same eligible options displayed in the table. */
export function StaffingPrioritySummary({comparison}:{comparison:Comparison}){
 const choices=swpTradeoffOptions(comparison.evaluation).map(option=>({id:option.id,mix:option.candidate.mix,cash:option.candidate.cash.complete,status:option.candidate.status,shortfallHours:guidedOptionEffort(option)?.shortfallHours??null,ready:option.candidate.metrics?.fullCoverageDate??null}));
 const leaders=staffingChoiceLeaders(choices);
 if(!leaders)return <span>No eligible option. Review inputs and limits.</span>;
 const priorities=leaders.same?[{label:'Lowest cash and least uncovered work',option:leaders.cash}]:[{label:'Least uncovered work',option:leaders.coverage},{label:'Lowest incremental cash',option:leaders.cash}];
 return <span aria-label="Calculated staffing priorities" className={'grid gap-3 '+(priorities.length>1?'sm:grid-cols-2':'')}>
  {priorities.map(({label,option})=><span key={option.id} className="block space-y-1">
   <span className="block text-xs font-semibold uppercase tracking-wide">{label}</span>
   <strong className="block text-lg leading-snug">{action(option.mix)}</strong>
   <span className="block text-sm font-normal">${number(option.cash!)} USD · {number(option.shortfallHours!)} uncovered hours</span>
   <span className="block text-sm font-normal">Readiness: {date(option.ready)}</span>
  </span>)}
 </span>;
}
