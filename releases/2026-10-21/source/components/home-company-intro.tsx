import {demoCompanyProfile} from '@/lib/demo-company-profile';

export function HomeCompanyIntro({datasetToken,asOf}:{datasetToken?:string;asOf?:string}) {
  const profile=demoCompanyProfile(datasetToken,asOf);
  return <section aria-label="Company introduction" className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">
    <h2 className="font-semibold" style={{fontSize:18,lineHeight:1.3,margin:0,letterSpacing:"normal"}}>Company</h2>
    <p className="mt-2 text-sm leading-relaxed">{profile&&<strong className="font-semibold">Business profile. </strong>}{profile ? `${profile.name} is a fictional global business with ${profile.people.toLocaleString('en-US')} people in ${profile.countries.length} countries and ${profile.businessUnits.length} business units. Its teams span consulting, client operations, managed services, technology, digital services, data and AI, sales, and corporate services.` : 'Explore workforce evidence and test staffing choices with adjustable scenarios.'}</p>
    {profile&&<><p className="mt-3 text-sm leading-relaxed">The workforce snapshot is dated September 30, 2026, with monthly headcount history from January 2024. Explore its people and skills, compare staffing choices, and adjust scenario assumptions.</p><p className="mt-3 text-sm leading-relaxed"><strong className="font-semibold">Data and updates. </strong>The data is synthetically generated for this demonstration, checked for consistency, and published as a versioned dataset. Pages load that published dataset on demand. There is no automatic data-refresh schedule; new versions are published separately. Refreshing the page does not generate new records or advance the snapshot date.</p></>}
  </section>;
}
