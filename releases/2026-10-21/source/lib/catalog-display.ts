/** Presentation only. Never use the formatted label as a record or filter identity. */
export function catalogDisplayLabel(label: string): string {
  return label.replace(/^Demo\s+(?=\S)/i, '');
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
