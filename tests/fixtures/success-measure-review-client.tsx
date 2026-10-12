import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {HomeSuccessMeasureReview} from '../../components/home-success-measure-review';
import {successMeasureText} from '../../lib/home-success-measures';
import {createBundleDraft,reviseBundleDraft,type BundleDraft} from '../../lib/home-bundle-reconciliation';
import {actionBinding} from '../../lib/home-action-drafts';
import {bundleProposalFixture} from './home-bundles.mjs';
const pack={sources:[{id:'A1',status:'loaded',date:'2026-09-30',facts:{total_turnover_ytd_pct:9.1,voluntary_turnover_ytd_pct:6.2,annualized_voluntary_turnover_pct:8.3}}]};
declare global{interface Window{__measureDraft:BundleDraft}}
function Fixture({initial}:{initial:BundleDraft[]}){
 const [drafts,setDrafts]=useState(initial),[selected,setSelected]=useState(0),draft=drafts[selected];useEffect(()=>{window.__measureDraft=draft;},[draft]);
 return <main className="mx-auto max-w-2xl space-y-3 p-4"><button onClick={()=>setSelected(1-selected)}>Switch goal</button><p role="status">{successMeasureText(draft.inputs.successMeasure)}</p><HomeSuccessMeasureReview key={selected+':'+draft.revision} draft={draft} pack={pack} basis="illustrative" disabled={false} onAccept={inputs=>setDrafts(old=>old.map((row,index)=>index===selected?reviseBundleDraft(row,inputs):row))}/></main>;
}
void (async()=>{const drafts=await Promise.all(['Reduce turnover','Improve employee support'].map(async(goal,index)=>createBundleDraft(bundleProposalFixture(goal).bundles[0] as BundleDraft['bundle'],await actionBinding('goal-'+index,goal,pack,{}))));createRoot(document.getElementById('root')!).render(<Fixture initial={drafts}/>);})();
