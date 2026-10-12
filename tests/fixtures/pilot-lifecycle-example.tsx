import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HomeDemoPlans} from '../../components/home-demo-plans';
import {AttachedActionPlansBrief} from '../../components/attached-action-plans-brief';
import {decisionStore,useDecisionStorage,switchDecisionDataset} from '../../components/decision-store';
import {createHomeDemoGoals} from '../../lib/home-demo-goals';
import {bundleWorkspaceField,readBundleWorkspace,attachBundlePatch} from '../../lib/home-bundle-records';
import {reviseBundleDraft,bundleInputKey} from '../../lib/home-bundle-reconciliation';
import {actionBindingKey} from '../../lib/home-action-drafts';
const id='demo-reduce-turnover';
function Harness(){
 const s=useDecisionStorage(),[brief,setBrief]=useState(false),[,refreshBoundary]=useState(0),goal=s.data.goals.goals.find(g=>g.id===s.data.goals.activeId),raw=goal&&s.data.workspaces[goal.id]?.fields[bundleWorkspaceField];
 function replace(){const w=readBundleWorkspace(raw,id)!,a=w.attachments.at(-1)!,inputs=structuredClone(a.draft.inputs);inputs.scope.population.value='Another fictional cohort';const draft=reviseBundleDraft(a.draft,inputs);decisionStore.setField(id,bundleWorkspaceField,attachBundlePatch(w,draft,{confirmed:true,bindingKey:actionBindingKey(draft.binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true},'new-example','2026-10-13T12:00:00Z',a.id).value);}
 return <main className="mx-auto max-w-4xl space-y-3 p-3"><h1>Offline fictional lifecycle acceptance</h1><nav className="flex flex-wrap gap-2"><button onClick={()=>setBrief(!brief)}>Toggle Brief</button><button onClick={replace}>Replace plan</button><button onClick={()=>decisionStore.saveGoals({...s.data.goals,goals:s.data.goals.goals.map(g=>g.id===id?{...g,statement:'Changed goal'}:g)})}>Change goal</button><button onClick={()=>decisionStore.saveGoals({...s.data.goals,activeId:s.data.goals.activeId===id?'demo-close-skill-gaps':id})}>Switch goal</button><button onClick={()=>{switchDecisionDataset(decisionStore.getDatasetToken()==='legacy-v1:0'?'fixture-other:1':'legacy-v1:0');refreshBoundary(n=>n+1);}}>Switch dataset</button></nav>{goal&&(brief?<AttachedActionPlansBrief raw={raw} goalId={goal.id} goal={goal.statement} onReview={()=>setBrief(false)}/>:<HomeDemoPlans goalId={goal.id} goal={goal.statement} active busy={false} onDiscuss={()=>{}}/>)}<output hidden data-testid="saved">{JSON.stringify(s.data)}</output></main>;
}
decisionStore.initialize(localStorage);
if(!localStorage.getItem('pilot-fixture-seeded')){const seed=createHomeDemoGoals('2026-10-12T12:00:00Z');decisionStore.saveGoals({...seed.goals,activeId:id});for(const [goalId,workspace] of Object.entries(seed.workspaces))for(const [field,value] of Object.entries(workspace.fields))decisionStore.setField(goalId,field,value);localStorage.setItem('pilot-fixture-seeded','true');}
createRoot(document.getElementById('root')!).render(<Harness/>);
