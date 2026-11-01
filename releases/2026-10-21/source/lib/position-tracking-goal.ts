// @ts-expect-error Native tests share canonical TypeScript.
import {POSITION_MODELED_DUTIES_FIELD,readPositionModeledDutiesLedger} from './position-modeled-duties.ts';
// @ts-expect-error Native tests share canonical TypeScript.
import {POSITION_MARKET_CONTEXT_FIELD,readPositionMarketContextLedger} from './position-market-context.ts';
import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests use the canonical TypeScript module.
import {POSITION_ALLOCATION_LEDGER_FIELD,POSITION_ALLOCATION_DRAFT_FIELD,readPositionScenarioLedger} from './position-allocation-store.ts';
// @ts-expect-error Native tests use the canonical TypeScript module.
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger} from './position-finance-store.ts';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {POSITION_MARKET_FIELD,readPositionMarketLedger,positionMarketForCapture} from './position-market-assumptions.ts';
export type PositionTrackingTicket=Readonly<{goal:string;scenarioCount:number;revisionCount:number;financeRevisionCount:number;selectedScenarioId:string|null;selectedAllocationRevision:number|null}>;
type Binding={store:DecisionStore;datasetToken:string;revision:number;snapshot:string;fields:Record<string,Json>};
const tickets=new WeakMap<PositionTrackingTicket,Binding>();
function ready(store:DecisionStore,datasetToken:string){
 const s=store.getSnapshot();
 if(store.getDatasetToken()!==datasetToken)throw Error('The dataset changed. Review the saved position scenarios again.');
 if(!s.ready||!s.saved||s.recovery)throw Error('Resolve saved-work recovery before starting tracking.');
 if(s.data.goals.activeId)throw Error('A goal is already selected. Open its tracking workspace.');
 if(s.data.goals.goals.length>=20)throw Error('Your 20 saved goals are full. Existing work is retained.');
 return s;
}
/** Pure review step: only saved captures are eligible, never the editable draft or chat. */
export function preparePositionTrackingGoal({store,datasetToken,scenarioId,allocationRevision}:{store:DecisionStore;datasetToken:string;scenarioId?:string;allocationRevision?:number}):PositionTrackingTicket{
 const s=ready(store,datasetToken),fields=s.data.exploration?.fields??{};
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,'');
 if(!allocations||!allocations.records.length)throw Error('Save a valid position scenario before starting tracking.');
 const finance=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,'',fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!finance)throw Error('Saved funding comparisons cannot be verified. Existing work is retained.');
 const market=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,'',fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!market)throw Error('Saved market assumptions cannot be verified. Existing work is retained.');
 const marketContext=readPositionMarketContextLedger(fields[POSITION_MARKET_CONTEXT_FIELD],datasetToken,'',fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!marketContext)throw Error('Saved market context cannot be verified. Existing work is retained.');
 const modeledDuties=readPositionModeledDutiesLedger(fields[POSITION_MODELED_DUTIES_FIELD],datasetToken,'',fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!modeledDuties)throw Error('Saved modeled duties cannot be verified. Existing work is retained.');
 const selected=scenarioId!==undefined||allocationRevision!==undefined?allocations.records.find(r=>r.scenarioId===scenarioId&&r.revision===allocationRevision):null;
 if((scenarioId!==undefined||allocationRevision!==undefined)&&!selected)throw Error('Choose an existing saved scenario revision.');
 const names=new Set(s.data.goals.goals.map(g=>g.statement.toLocaleLowerCase()));let goal='Track position scenarios',n=2;
 while(names.has(goal.toLocaleLowerCase()))goal=`Track position scenarios (${n++})`;
 const patch:Record<string,Json>={[POSITION_ALLOCATION_LEDGER_FIELD]:allocations as unknown as Json};
 if(fields[POSITION_FINANCE_LEDGER_FIELD]!==undefined)patch[POSITION_FINANCE_LEDGER_FIELD]=finance as unknown as Json;
 if(selected)patch[POSITION_ALLOCATION_DRAFT_FIELD]=structuredClone(selected.draft) as unknown as Json;
 if(fields[POSITION_MARKET_FIELD]!==undefined)patch[POSITION_MARKET_FIELD]={...market,current:selected?positionMarketForCapture(market,selected):null} as unknown as Json;
 if(fields[POSITION_MARKET_CONTEXT_FIELD]!==undefined)patch[POSITION_MARKET_CONTEXT_FIELD]=marketContext as unknown as Json;
 if(fields[POSITION_MODELED_DUTIES_FIELD]!==undefined)patch[POSITION_MODELED_DUTIES_FIELD]=modeledDuties as unknown as Json;
 const ticket=Object.freeze({goal,scenarioCount:new Set(allocations.records.map(r=>r.scenarioId)).size,revisionCount:allocations.records.length,financeRevisionCount:finance.records.length,selectedScenarioId:selected?.scenarioId??null,selectedAllocationRevision:selected?.revision??null});
 tickets.set(ticket,{store,datasetToken,revision:s.data.revision,snapshot:JSON.stringify(s.data),fields:patch});return ticket;
}
/** Explicit confirmation copies ledgers unchanged except their outer goal binding. */
export function confirmPositionTrackingGoal({store,ticket,goalId,at}:{store:DecisionStore;ticket:PositionTrackingTicket;goalId:string;at:string}){
 const binding=tickets.get(ticket);if(!binding||binding.store!==store)throw Error('Review the saved position scenarios again.');
 const s=ready(store,binding.datasetToken);
 if(s.data.revision!==binding.revision||JSON.stringify(s.data)!==binding.snapshot)throw Error('Saved work changed. Review the position scenarios again.');
 if(typeof goalId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(goalId)||s.data.removedGoalIds?.includes(goalId)||s.data.goals.goals.some(g=>g.id===goalId)||Object.hasOwn(s.data.workspaces,goalId))throw Error('Choose a new tracking goal identity.');
 if(typeof at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)throw Error('Invalid tracking timestamp.');
 const fields=structuredClone(binding.fields);
 for(const key of [POSITION_ALLOCATION_LEDGER_FIELD,POSITION_FINANCE_LEDGER_FIELD,POSITION_MARKET_FIELD,POSITION_MARKET_CONTEXT_FIELD,POSITION_MODELED_DUTIES_FIELD])if(fields[key])fields[key]={...(fields[key] as Record<string,Json>),goalId};
 const revision=store.commitGoalSelection(goalId,ticket.goal,binding.revision,at,()=>fields,false,true);
 tickets.delete(ticket);return {goalId,goal:ticket.goal,revision};
}
