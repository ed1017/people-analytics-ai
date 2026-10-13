import {redirect} from 'next/navigation';

export const metadata = {title:'Synthetic Headcount Demo | People Analytics'};

export default function HeadcountDemoPage() {
  redirect('/?page=scenario-modeling&demo=headcount');
}
