'use client';
import {useEffect,useRef,useSyncExternalStore,type ReactNode} from 'react';
import {APP_PAGE_CHANGE_EVENT,subscribeToAppPage} from '@/lib/app-page-url';
import {SwpHeadcountComparison} from '@/components/swp-headcount-comparison';
import type {SwpHistory} from '@/lib/swp-history-qualification';
import development from '@/experiments/swp-headcount/development-history.json';
import holdout from '@/experiments/swp-headcount/holdout.json';

const history = {...development,points:[...development.points,...holdout.points]} as SwpHistory;
const snapshot = () => {const params=new URLSearchParams(window.location.search);return params.get('page')==='scenario-modeling'&&params.get('demo')==='headcount';};
const serverSnapshot = () => false;
function navigate(open:boolean) {
  const url=new URL(window.location.href);
  url.searchParams.set('page','scenario-modeling');
  if(open)url.searchParams.set('demo','headcount');else url.searchParams.delete('demo');
  window.history.pushState(window.history.state,'',url.pathname+url.search+url.hash);
  window.dispatchEvent(new Event(APP_PAGE_CHANGE_EVENT));
}

/** Keep both the Home workspace and existing planning panels mounted on demo round trips. */
export function HeadcountDemoWorkspace({children}:{children:ReactNode}) {
  const open=useSyncExternalStore(subscribeToAppPage,snapshot,serverSnapshot);
  const launcher=useRef<HTMLButtonElement>(null),back=useRef<HTMLButtonElement>(null),previous=useRef(false);
  useEffect(()=>{if(open)back.current?.focus();else if(previous.current)launcher.current?.focus();previous.current=open;},[open]);
  return <>
    <div hidden={open} className="space-y-6">
      {children}
      <div className="rounded-lg border p-4">
        <button ref={launcher} type="button" onClick={()=>navigate(true)} className="inline-flex min-h-11 items-center font-semibold underline">Compare headcount — synthetic demo baseline</button>
        <p className="text-sm text-muted-foreground">Company-wide headcount only. Conditional retrospective evaluation; not validated for operational planning.</p>
      </div>
    </div>
    {open&&<section aria-label="Synthetic headcount demo" className="rounded-lg bg-white p-4 text-slate-900">
      <button ref={back} type="button" onClick={()=>navigate(false)} className="mb-3 inline-flex min-h-11 items-center underline">Back to Scenario Modeling</button>
      <p className="mb-3 text-sm">This company-wide synthetic demo does not use your workspace filters. Your filters and unsaved planning draft remain in the workspace.</p>
      <SwpHeadcountComparison history={history}/>
    </section>}
  </>;
}
