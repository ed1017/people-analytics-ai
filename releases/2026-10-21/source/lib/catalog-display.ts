/** Fictional display names for this demo only; not inferred real-company meanings. */
export const demoBusinessUnitNames: Readonly<Record<string,string>> = Object.freeze({
  'BU-CLIENTOPS': 'Client Operations', 'BU-CONS': 'Consulting',
  'BU-CORP': 'Corporate Services', 'BU-DATAAI': 'Data & AI',
  'BU-DIGITAL': 'Digital Services', 'BU-MGSVC': 'Managed Services',
  'BU-SALES': 'Sales', 'BU-TECH': 'Technology',
});
/** Descriptive fictional titles for the demo's stable role identities.
 * Families and skill requirements constrain these labels; these are not recovered company titles.
 */
export const demoRoleNames: Readonly<Record<string,string>> = Object.freeze({
 'AI-ARCH':'AI Architect', 'AI-ENG':'AI Engineer',
 'BI-ANA':'Business Intelligence Analyst', 'BI-DEV':'Business Intelligence Developer',
 'CLOUD-ARCH':'Cloud Architect', 'CLOUD-ENG':'Cloud Engineer',
 'COMMS-GEN':'Communications Specialist', 'CONS-MGMT':'Management Consultant',
 'CONS-TECH':'Technology Consultant', 'CONS-TRANS':'Transformation Consultant',
 'CORPDEV-ANA':'Corporate Development Analyst', 'CSM-GEN':'Customer Success Specialist',
 'CYBER-ANA':'Cybersecurity Analyst', 'CYBER-ENG':'Cybersecurity Engineer',
 'DE-ARCH':'Data Architect', 'DE-ENG':'Data Engineer',
 'DS-APPLIED':'Applied Data Scientist', 'DS-SCI':'Data Scientist',
 'FIN-ACC':'Accountant', 'FIN-FPNA':'Financial Planning and Analysis Analyst',
 'FIN-TREAS':'Treasury Specialist', 'HR-HRBP':'HR Business Partner',
 'HR-HRIS':'HR Systems Specialist', 'HR-PA':'People Analytics Analyst',
 'HR-TA':'Talent Acquisition Specialist', 'HR-TM':'Talent Management Specialist',
 'HR-TR':'Total Rewards Specialist', 'INFOSEC-ANA':'Information Security Analyst',
 'INFRA-ENG':'Infrastructure Engineer', 'IT-ENG':'IT Engineer',
 'LEGAL-COUNSEL':'Legal Counsel', 'LEGAL-PRIV':'Privacy Counsel',
 'MKT-BRAND':'Brand Marketing Specialist', 'MKT-GROWTH':'Growth Marketing Specialist',
 'ML-ENG':'Machine Learning Engineer', 'OPS-BUS':'Business Operations Specialist',
 'OPS-CLIENT':'Client Operations Specialist', 'PMO-PGM':'Program Manager',
 'PMO-PM':'Project Manager', 'PROC-SOURCING':'Sourcing Specialist',
 'PROD-PM':'Product Manager', 'QA-ENG':'Quality Assurance Engineer',
 'SALES-AE':'Sales Account Executive', 'SALES-OPS':'Sales Operations Specialist',
 'STRAT-ANA':'Strategy Analyst', 'SWE-BACK':'Backend Software Engineer',
 'SWE-FRONT':'Frontend Software Engineer', 'SWE-FULL':'Full Stack Software Engineer',
 'SWE-GEN':'Software Engineer', 'UX-DES':'User Experience Designer',
});
/** Exact display round-trip only; narrative or contradictory titles are not aliases. */
export function catalogRoleCode(value:string):string|null {
 const clean=value.trim();
 if (/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(clean)) return clean;
 return Object.entries(demoRoleNames).find(([code,name])=>clean===name||clean===`${name} (${code})`||clean===`Demo ${code}`)?.[0]??null;
}
/** Presentation only. Never use the formatted label as a record or filter identity. */
export function catalogDisplayLabel(label: string): string {
  const clean=label.replace(/^Demo\s+(?=\S)/i, '');
  return Object.hasOwn(demoBusinessUnitNames,clean) ? demoBusinessUnitNames[clean] : Object.hasOwn(demoRoleNames,clean) ? demoRoleNames[clean] : clean;
}
/** Keep the established source/tool vocabulary independent of fictional display names. */
export function catalogSourceLabel(label:string):string {return label.replace(/^Demo\s+(?=\S)/i,'');}

// Exact public aggregate catalogue labels only. Unknown names and identifiers
// stay untouched; this formatter must never be applied to stored model context.
export function catalogProseDisplay(text: string): string {
  const labels={...demoBusinessUnitNames,...demoRoleNames};
  // Collapse only exact canonical label/code pairs, not arbitrary parenthetical prose.
  for(const [code,name] of Object.entries(labels)) {
    text=text.split(`${name} (${code})`).join(name);
    text=text.split(`${name} (Demo ${code})`).join(name);
  }
  return text.replace(/(?<![\w-])(?<!Demo )(?:Demo )?[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+(?![\w-])/g,
    label => {const code=label.replace(/^Demo /,'');return Object.hasOwn(labels,code)?labels[code]:label;});
}

// The same ISO country names used by Home country selection.
const countryNames: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', GB: 'United Kingdom',
  IN: 'India', DE: 'Germany', FR: 'France', AU: 'Australia',
  JP: 'Japan', CN: 'China', BR: 'Brazil', SG: 'Singapore',
};

export function countryDisplayLabel(label: string, code: string): string {
  const clean = catalogDisplayLabel(label);
  return clean.toUpperCase() === code.toUpperCase()
    ? countryNames[code.toUpperCase()] ?? clean
    : clean;
}
