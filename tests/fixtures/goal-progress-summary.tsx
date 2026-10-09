/** Synthetic offline host for real saved-summary and explicit progress review components. */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SelectedGoalProgress} from '../../components/goal-progress-summary';
import {SelectedProgressEntry} from '../../components/goal-progress-entry-review';
import {decisionStore,useDecisionStorage} from '../../components/decision-store';
import {goalProgressField,appendGoalProgressEvent,HEADCOUNT_DEFINITION} from '../../lib/goal-progress';
import {progressEntryContext,retainProgressEntryProposal} from '../../lib/goal-progress-entry-store';
import {createProgressEntryProposal} from '../../lib/goal-progress-entry';
import {actionBinding} from '../../lib/home-action-drafts';
import type {SolutionBundle} from '../../lib/home-solution-bundles';
import {createBundleDraft,bundleInputKey} from '../../lib/home-bundle-reconciliation';
import {createPlanAlternatives,planAlternativesField} from '../../lib/home-plan-alternatives';
import {progressFixture,scope,day} from './goal-progress-summary.mjs';
import {bundleProposalFixture} from './home-bundles.mjs';
const goals=[{id:'growth',statement:'Grow the synthetic workforce'},{id:'reduction',statement:'Reduce the synthetic workforce'},{id:'missing',statement:'Unmeasured synthetic goal'},{id:'stale',statement:'Stale synthetic goal'},{id:'unsupported',statement:'Unsupported metric goal'}];
function Harness(){
 const storage=useDecisionStorage(),[input,setInput]=useState(''),[notice,setNotice]=useState('');
 async function send(){
  // Predetermined synthetic interpretations replace the model only in this host.
  const record=({'We counted 114 people on October 1, 2026, across the complete saved population.':{value:114,date:'2026-10-01'},'We counted 116 people on October 7, 2026, across the complete saved population.':{value:116,date:'2026-10-07'}} as Record<string,{value:number;date:string}>)[input];
  if(!record){setNotice('Choose a documented synthetic statement.');return;}
  try{const turnId='fixture-'+crypto.randomUUID(),context=progressEntryContext(decisionStore,'fixture-'+crypto.randomUUID(),[{id:turnId,text:input}],true)!;
   const proposal=await createProgressEntryProposal({metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope,measurement:null,observation:{...record,complete:true,supersedes:null,useAsBaseline:false},basis:[{turnId,quote:input}]},context);
   await retainProgressEntryProposal(decisionStore,proposal,context,{enabled:true});setNotice('Synthetic interpretation ready for explicit review. No model was called.');
  }catch(e){setNotice((e as Error).message);}
 }
 return <main className="mx-auto max-w-4xl p-3"><h1>Synthetic saved goal progress acceptance</h1><p>No provider, database or production application.</p><nav aria-label="Synthetic goals" className="flex flex-wrap gap-2">{goals.map(goal=><button className="min-h-11 rounded border p-2" key={goal.id} onClick={()=>decisionStore.saveGoals({...storage.data.goals,activeId:goal.id})}>{goal.statement}</button>)}</nav><SelectedGoalProgress/><label className="block">Synthetic chat<input className="min-h-11 w-full rounded border p-2" value={input} onChange={e=>setInput(e.target.value)}/></label><button className="min-h-11 rounded border p-2" onClick={()=>void send()}>Prepare synthetic chat report</button><p role="status">{notice}</p><SelectedProgressEntry/><output className="hidden" data-testid="saved">{JSON.stringify(storage.data)}</output></main>;
}
async function seed(){
 decisionStore.initialize(localStorage);decisionStore.saveGoals({version:1,activeId:'growth',goals});
 for(const goal of goals)decisionStore.setField(goal.id,goalProgressField,progressFixture(goal.id,goal.id==='reduction'?'decrease':'increase',{missing:goal.id==='missing',stale:goal.id==='stale',unsupported:goal.id==='unsupported'}));
 const goal=goals[0],binding=await actionBinding(goal.id,goal.statement,{},{}),draft=createBundleDraft({...bundleProposalFixture(goal.statement).bundles[0],origin:'conversation-v1'} as SolutionBundle,binding),catalog=createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'original',draft}]);
 decisionStore.setField(goal.id,planAlternativesField,catalog);
 const ledger=appendGoalProgressEvent(progressFixture(goal.id),{id:'link',kind:'plan-linked',at:day+'T12:00:00Z',supersedes:null,data:{planId:'original',revision:draft.revision,inputKey:bundleInputKey(draft),evidenceDigest:binding.evidenceDigest,datasetToken:decisionStore.getDatasetToken()}});
 decisionStore.setField(goal.id,goalProgressField,ledger);createRoot(document.getElementById('root')!).render(<Harness/>);
}
void seed();
