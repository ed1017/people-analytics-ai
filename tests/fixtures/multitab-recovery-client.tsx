/** Offline-only two-tab driver. App, storage events, recovery UI and persistence are real. */
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import Page from '../../app/page';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {decisionStore} from '../../components/decision-store';
import {datasetDecisionKey} from '../../lib/local-decisions';
import {readBundleWorkspace,bundleWorkspaceField,attachBundlePatch} from '../../lib/home-bundle-records';
import {reviseBundleDraft,bundleInputKey} from '../../lib/home-bundle-reconciliation';
import {actionBindingKey} from '../../lib/home-action-drafts';
let quota=false;
const events:{key:string|null;newValue:string|null}[]=[];
window.addEventListener('storage',event=>events.push({key:event.key,newValue:event.newValue}));
const setItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(key:string,value:string){if(quota&&this===localStorage&&key===datasetDecisionKey(decisionStore.getDatasetToken()))throw Error('Fixture quota exhausted');return setItem.call(this,key,value);};
Object.assign(window,{multitab:{
 snapshot:()=>decisionStore.getSnapshot(),
 events:()=>events,
 quota:(value:boolean)=>{quota=value;},
 field:(id:string,field:string,value:unknown)=>decisionStore.setField(id,field,value),
 attach:(id:string)=>{const s=decisionStore.getSnapshot(),goal=s.data.goals.goals.find(g=>g.id===id)!;let built=false;try{decisionStore.commitGoalFields(id,goal.statement,s.data.revision,'2026-10-13T12:00:00Z',fields=>{built=true;const w=readBundleWorkspace(fields[bundleWorkspaceField],id)!,a=w.attachments.at(-1)!,inputs=structuredClone(a.draft.inputs);inputs.scope.population.value='Revised fictional cohort';const draft=reviseBundleDraft(a.draft,inputs);return {[bundleWorkspaceField]:attachBundlePatch(w,draft,{confirmed:true,bindingKey:actionBindingKey(draft.binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true},'attached-'+w.attachments.length,'2026-10-13T12:00:00Z',a.id).value};});return {built,error:null};}catch(e){return {built,error:(e as Error).message};}},
}});
function Fixture(){
 const [token,setToken]=useState(()=>sessionStorage.getItem('fixture-server-token')??'legacy-v1:0');
 return <><label>Fixture server bootstrap token<select aria-label="Fixture server bootstrap token" value={token} onChange={event=>{sessionStorage.setItem('fixture-server-token',event.target.value);setToken(event.target.value);}}><option value="legacy-v1:0">Legacy fixture</option><option value="fixture-next:1">Next fixture</option></select></label><DatasetBoundary initialToken={token}><Page/></DatasetBoundary></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
