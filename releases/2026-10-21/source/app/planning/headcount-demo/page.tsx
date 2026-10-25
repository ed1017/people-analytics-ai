import {redirect} from 'next/navigation';
import {createSwpDemo} from '@/lib/swp-demo';
import {guidedBusinessPlanning} from '@/lib/guided-business-planning';
import {PlannerDesignPreview} from '@/components/planner-design-preview';

export const metadata = {title:'Synthetic Headcount Demo | People Analytics'};

export default async function HeadcountDemoPage({searchParams}:{searchParams:Promise<{design?:string}>}) {
  if((await searchParams).design==='preview'){
    const draft=await createSwpDemo('guided-design-preview','2026-10-25T03:00:00Z');
    return <PlannerDesignPreview baseline={guidedBusinessPlanning(draft,'illustration-only:0')}/>;
  }
  redirect('/?page=scenario-modeling&demo=headcount');
}
