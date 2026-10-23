import {staffingChoiceLeaders} from '@/lib/staffing-choice-summary';
import {guidedOptionEffort} from '@/lib/swp-demo';
import type {compareSwpDemo} from '@/lib/swp-demo';
import {swpTradeoffOptions} from '@/lib/swp-demo';
type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
export function ScenarioDecisionSummary({comparison}:{comparison:Comparison}){
 const choices=swpTradeoffOptions(comparison.evaluation).map(option=>({id:option.id,mix:option.candidate.mix,cash:option.candidate.cash.complete,status:option.candidate.status,shortfallHours:guidedOptionEffort(option)?.shortfallHours??null,ready:option.candidate.metrics?.fullCoverageDate??null}));
 const leaders=staffingChoiceLeaders(choices);
 if(!leaders)return <section className="scenario-decision-summary" aria-label="Conditional staffing recommendation"><h3>No displayed option has verified calculations within the entered limits.</h3><p>Review missing inputs, costs, budget and timing below. No recommendation is selected.</p></section>;
 const options=leaders.same?[{label:'Lowest entered cash and uncovered work',option:leaders.cash}]:[{label:'Lower entered cash',option:leaders.cash},{label:'Less uncovered work',option:leaders.coverage}];
 return <section className="scenario-decision-summary" aria-label="Conditional staffing recommendation"><h3>{leaders.same?`Develop ${leaders.cash.mix.build}, move ${leaders.cash.mix.move}, hire ${leaders.cash.mix.buy}.`:'Choose lower cash or less uncovered work.'}</h3><p>{leaders.same?'This displayed mix meets the entered limits.':'These displayed options trade cost against uncovered work; choose your priority.'} Readiness and internal availability remain assumptions.</p><div className="scenario-decision-options">{options.map(({label,option})=><div key={option.id}><h4>{label}</h4><p>{option.mix.build} develop · {option.mix.move} move · {option.mix.buy} hire</p><dl><div><dt>Incremental cash</dt><dd>${number(option.cash)} USD</dd></div><div><dt>Conditional readiness</dt><dd>{option.ready??'Unknown'}</dd></div><div><dt>Uncovered work</dt><dd>{number(option.shortfallHours)} hours</dd></div></dl></div>)}</div></section>;
}
