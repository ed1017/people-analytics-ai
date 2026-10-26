import {demoCompanyProfile} from '@/lib/demo-company-profile';

export function HomeCompanyIntro({datasetToken,asOf}:{datasetToken?:string;asOf?:string}) {
  const profile=demoCompanyProfile(datasetToken,asOf);
  return <section aria-label="Company introduction" className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">
    <h2 className="font-semibold" style={{fontSize:18,lineHeight:1.3,margin:0,letterSpacing:"normal"}}>{profile ? `Meet ${profile.name}` : 'Explore the workforce'}</h2>
    <p className="mt-1 text-sm leading-relaxed">{profile ? `A fictional global business with ${profile.people.toLocaleString('en-US')} people in ${profile.countries.length} countries and ${profile.businessUnits.length} business units. Explore its workforce and test staffing choices.` : 'Explore workforce evidence and test staffing choices with adjustable scenarios.'}</p>
    {profile&&<p className="mt-2 text-xs text-muted-foreground">Company profile · Sep 30, 2026</p>}
  </section>;
}
