/** Fictional display names for this demo only; not inferred real-company meanings. */
export const demoBusinessUnitNames: Readonly<Record<string,string>> = Object.freeze({
  'BU-CLIENTOPS': 'Client Operations', 'BU-CONS': 'Consulting',
  'BU-CORP': 'Corporate Services', 'BU-DATAAI': 'Data & AI',
  'BU-DIGITAL': 'Digital Services', 'BU-MGSVC': 'Managed Services',
  'BU-SALES': 'Sales', 'BU-TECH': 'Technology',
});
/** Presentation only. Never use the formatted label as a record or filter identity. */
export function catalogDisplayLabel(label: string): string {
  const clean=label.replace(/^Demo\s+(?=\S)/i, '');
  return Object.hasOwn(demoBusinessUnitNames,clean) ? demoBusinessUnitNames[clean] : clean;
}
/** Keep the established source/tool vocabulary independent of fictional display names. */
export function catalogSourceLabel(label:string):string {return label.replace(/^Demo\s+(?=\S)/i,'');}

// Exact public aggregate catalogue labels only. Unknown names and identifiers
// stay untouched; this formatter must never be applied to stored model context.
const publicBusinessUnitLabels = new Set([
  'Demo BU-CLIENTOPS', 'Demo BU-CONS', 'Demo BU-CORP', 'Demo BU-DATAAI',
  'Demo BU-DIGITAL', 'Demo BU-MGSVC', 'Demo BU-SALES', 'Demo BU-TECH',
]);
export function catalogProseDisplay(text: string): string {
  return text.replace(/(?<![\w-])(?<!Demo )(?:Demo )?BU-[A-Z0-9_-]+(?![\w-])/g,
    label => publicBusinessUnitLabels.has(label.startsWith('Demo ')?label:'Demo '+label) ? catalogDisplayLabel(label) : label);
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
