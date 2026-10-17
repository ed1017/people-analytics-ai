import {createSwpDemo} from '../../lib/swp-demo.ts';
import {createPlanAlternatives,packPlanAlternatives,planAlternativesField} from '../../lib/home-plan-alternatives.ts';
import {reviseBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../../lib/local-decisions.ts';
import {appendGoalProgressEvent,emptyGoalProgress,goalProgressField,HEADCOUNT_DEFINITION} from '../../lib/goal-progress.ts';
import {readManualResults,manualPlanResultsField} from '../../lib/manual-plan-results.ts';

const initial='2026-10-17T12:00:00.000Z';
export async function manualResultFixture({headcount=false,metric='headcount',value=120,targetDate='2026-12-31',datasetToken='legacy-v1:0'}={}){
 const goalId='guided-result-test';let draft=await createSwpDemo(goalId,initial);
 if(headcount){const inputs=structuredClone(draft.inputs);delete inputs.guidedWorkload;draft=reviseBundleDraft(draft,inputs);}
 const goal=draft.binding.goal,catalog=createPlanAlternatives({goalId,goal},[{id:'plan-one',draft},{id:'plan-two',draft}]);
 catalog.attachments=catalog.plans.map((p,i)=>({id:'attached-'+i,planId:p.id,attachedAt:initial,purpose:'proposal-selection'}));
 const values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},store=new DecisionStore(datasetToken);store.initialize(port);
 let ledger=emptyGoalProgress(goalId,'demo');
 if(headcount){
  ledger=appendGoalProgressEvent(ledger,{id:'measurement-one',at:initial,supersedes:null,kind:'measurement',data:{metric,definition:metric==='headcount'?HEADCOUNT_DEFINITION:'turnover-rate-v1',unit:metric==='headcount'?'people':'percent',direction:'increase',scope:{country:'UK',org:'Service Operations',level:'all'},lineageId:'manual-result-test',baselineId:null,target:{value,date:targetDate},maxAgeDays:90,provenance:'Fictional target for testing.'}});
  for(const plan of catalog.plans)ledger=appendGoalProgressEvent(ledger,{id:'link-'+plan.id,at:initial,supersedes:null,kind:'plan-linked',data:{planId:plan.id,revision:plan.draft.revision,inputKey:plan.result.inputKey,evidenceDigest:plan.draft.binding.evidenceDigest,datasetToken:store.getDatasetToken()}});
 }
 store.commitGoalSelection(goalId,goal,store.getSnapshot().data.revision,initial,()=>({[planAlternativesField]:packPlanAlternatives(catalog),[goalProgressField]:ledger}),true);
 return {store,port,values,catalog,goalId,goal,fields:()=>store.getSnapshot().data.workspaces[goalId].fields,read:()=>readManualResults(store.getField(goalId,manualPlanResultsField,null),goalId)};
}
