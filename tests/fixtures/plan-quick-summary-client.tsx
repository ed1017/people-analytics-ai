import {createRoot} from 'react-dom/client';
import {ActionPlanQuickSummary} from '../../components/action-plan-quick-summary';
import type {BundleDraft,BundleResult} from '../../lib/home-bundle-reconciliation';
const cases=(window as unknown as {summaryCases:{name:string;draft:BundleDraft;result:BundleResult|null}[]}).summaryCases;
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-5 p-3">{cases.map(item=><article key={item.name} aria-label={item.name} className="space-y-3 rounded border p-3"><h2 className="text-xl font-semibold">Action Plan · {item.name}</h2><ActionPlanQuickSummary draft={item.draft} result={item.result}/><p>Goal: Review training and hiring.</p><p>Success measure: Check completion against the agreed target.</p><button className="min-h-11 rounded border p-2">Pin Action Plan</button></article>)}</main>);
