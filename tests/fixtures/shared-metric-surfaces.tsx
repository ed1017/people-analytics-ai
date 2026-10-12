import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {AttachedActionPlansBrief} from '../../components/attached-action-plans-brief';
import {HomeSuccessMeasureReview} from '../../components/home-success-measure-review';
import {readBundleWorkspace,attachBundlePatch} from '../../lib/home-bundle-records';
import {reviseBundleDraft,bundleInputKey,type BundleDraft} from '../../lib/home-bundle-reconciliation';
import {actionBindingKey} from '../../lib/home-action-drafts';
import {suggestSuccessMeasure,reviewSuccessMeasure} from '../../lib/home-success-measures';
import {createPlanAlternatives,attachPlanAlternative} from '../../lib/home-plan-alternatives';
import legacy from './pre-shared-metric-context.json';
const prepared=legacy.cases.map(c=>{
 const old=readBundleWorkspace(c.raw,c.raw.attachments[0].draft.binding.goalId)!;
 const draft=structuredClone(old.attachments[0].draft);delete draft.inputs.successMeasure;
 const pack={sources:[{id:c.id,status:'loaded',date:'2026-09-30',facts:{[c.field]:c.value}}]};
 const s=suggestSuccessMeasure(c.goal,pack,draft.binding.evidenceDigest),current=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'','','illustrative',s,false));
 const raw=attachBundlePatch(undefined,current,{confirmed:true,bindingKey:actionBindingKey(current.binding),inputKey:bundleInputKey(current),acknowledgeUnknowns:true},'current','2026-10-12T00:00:00Z').value;
 const context={goalId:current.binding.goalId,goal:c.goal};let catalog=createPlanAlternatives(context,[{id:'current',draft:current}]);catalog=attachPlanAlternative(catalog,context,'current',{inputKey:bundleInputKey(current),attachmentId:'numbered',at:'2026-10-12T00:00:00Z',acknowledgeUnknowns:true});
 return {...c,old,raw,catalog,current,pack};
});
declare global{interface Window{__surfaceFixtures:typeof prepared}}
window.__surfaceFixtures=prepared;
function Fixture(){
 const [selected,setSelected]=useState(0),[mode,setMode]=useState('attached'),[drafts,setDrafts]=useState<BundleDraft[]>(prepared.map(c=>c.current)),[fresh,setFresh]=useState(false);
 const c=prepared[selected],pack=fresh?{sources:[{...c.pack.sources[0],facts:{[c.field]:99}}]}:c.pack;
 return <main className="mx-auto max-w-3xl space-y-4 p-4"><label>Domain<select aria-label="Domain" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{prepared.map((c,i)=><option key={c.id} value={i}>{c.id}</option>)}</select></label><label>Snapshot format<select aria-label="Snapshot format" value={mode} onChange={e=>setMode(e.target.value)}><option value="attached">Attached snapshot</option><option value="numbered">Numbered snapshot</option><option value="legacy">Pre-change snapshot</option></select></label><button onClick={()=>setFresh(!fresh)}>Change current evidence</button><HomeSuccessMeasureReview key={selected+':'+drafts[selected].revision} draft={drafts[selected]} pack={pack} basis="illustrative" disabled={false} onAccept={inputs=>setDrafts(rows=>rows.map((d,i)=>i===selected?reviseBundleDraft(d,inputs):d))}/><AttachedActionPlansBrief raw={mode==='legacy'?c.old:mode==='attached'?c.raw:undefined} alternatives={mode==='numbered'?c.catalog:undefined} goalId={c.current.binding.goalId} goal={c.goal} onReview={()=>{}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
