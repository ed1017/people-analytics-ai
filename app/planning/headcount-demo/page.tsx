import Link from 'next/link';
import {SwpHeadcountComparison} from '@/components/swp-headcount-comparison';
import type {SwpHistory} from '@/lib/swp-history-qualification';
import development from '@/experiments/swp-headcount/development-history.json';
import holdout from '@/experiments/swp-headcount/holdout.json';

export const metadata = {title:'Synthetic Headcount Demo | People Analytics'};

export default function HeadcountDemoPage() {
  const history = {...development,points:[...development.points,...holdout.points]} as SwpHistory;
  return <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-[760px]">
      <Link href="/?page=scenario-modeling" prefetch={false} className="mb-4 inline-flex min-h-11 items-center underline">Back to Scenario Modeling</Link>
      <SwpHeadcountComparison history={history}/>
    </div>
  </main>;
}
