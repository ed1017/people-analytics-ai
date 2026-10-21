import Link from 'next/link';
import {PlanningAssumptionIllustration} from '@/components/planning-assumption-illustration';

export const metadata={title:'Planning Calculator | People Analytics'};
export default function PlanningAssumptionsPage(){
 return <main className="mx-auto min-h-screen max-w-4xl space-y-5 p-4 sm:p-8">
  <Link href="/" className="inline-flex min-h-11 items-center underline">Back to People Analytics</Link>
  <PlanningAssumptionIllustration/>
 </main>;
}
