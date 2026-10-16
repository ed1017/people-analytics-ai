/** Read-only synthetic card host. Does not enable any deployed feature or mount storage. */
import {createRoot} from 'react-dom/client';
import {GoalProgressSummary} from '../../components/goal-progress-summary';
import {readProgressSnapshot} from '../../lib/goal-progress-summary';
import {emptyGoalProgress} from '../../lib/goal-progress';
import {progressFixture,day} from './goal-progress-summary.mjs';

const cases=[
 {name:'Maintain target with a long pinned proposal',snapshot:readProgressSnapshot(progressFixture('maintain','maintain'),'maintain',day),pin:'Service desk coverage and manager coaching across the regional customer support teams'},
 {name:'Target without observations',snapshot:readProgressSnapshot(progressFixture('missing','increase',{missing:true}),'missing',day)},
 {name:'Stale dated observation',snapshot:readProgressSnapshot(progressFixture('stale','increase',{stale:true}),'stale',day)},
 {name:'No measurement definition',snapshot:readProgressSnapshot(emptyGoalProgress('empty'),'empty',day)},
 {name:'Unsupported metric',snapshot:readProgressSnapshot(progressFixture('unsupported','increase',{unsupported:true}),'unsupported',day)},
];
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-4xl space-y-4 p-4">
 <h1 className="text-xl font-semibold">Offline progress-card layout fixture</h1>
 <p>Synthetic records, fixed assessment date {day}. Real card and app styles; feature gate bypassed only by mounting the card directly. Production progress tracking remains disabled. No storage, model, database or network calls.</p>
 {cases.map(item=><GoalProgressSummary key={item.name} goal={item.name} context={item.snapshot.context} snapshot={item.snapshot} pinnedPlanName={item.pin}/>)}
</main>);
