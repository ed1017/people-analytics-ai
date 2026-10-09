import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {PlanningAssumptionIllustration} from '@/components/planning-assumption-illustration';
import {PlanningCalculatorDialog} from '@/components/planning-calculator-dialog';
import {SWP_DEMAND_MODE,illustrativeServiceReview,type DemandContext} from '@/lib/swp-demand';
import {createDemandEditorDraft,reviewDemandEditor} from '@/lib/swp-demand-editor';
const context:DemandContext={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-offline-current-review',datasetToken:'synthetic:0',boundGoal:{id:'',statement:''},revision:1};
function Host(){
 const [review,setReview]=useState(()=>illustrativeServiceReview(context,'2026-10-08T00:00:00Z')),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[reviewed,setReviewed]=useState(0),[accepted,setAccepted]=useState(false),[saved,setSaved]=useState(false);
 Object.assign(window,{interruptCalculator:()=>setOpen(false),busyCalculator:()=>setBusy(true),staleCalculator:()=>{const draft=createDemandEditorDraft(review);draft.values.contracts='3';setReview(reviewDemandEditor(review,draft,context,'synthetic-later-review'));}});
 return <><main><PlanningAssumptionIllustration/></main><section aria-label="Overview launcher"><PlanningAssumptionIllustration launcherOnly/></section><section aria-label="Synthetic conversation host"><textarea aria-label="Current conversation" defaultValue="Keep this conversation and current review"/><button onClick={()=>setOpen(true)}>Open current review calculator</button><button onClick={()=>setAccepted(true)}>Fixture accept assumptions</button><button disabled={!accepted} onClick={()=>setSaved(true)}>Fixture save reviewed plan</button><output className="block break-all text-xs" data-testid="host-state">{JSON.stringify({review,reviewed,accepted,saved})}</output><PlanningCalculatorDialog open={open} review={review} disabled={busy} onCancel={()=>{setOpen(false);setBusy(false);}} onReview={draft=>{const next=reviewDemandEditor(review,draft,context,'explicit-fixture-review');setReview(next);setReviewed(reviewed+1);setAccepted(false);setOpen(false);}}/></section></>;
}
createRoot(document.getElementById('root')!).render(<Host/>);
