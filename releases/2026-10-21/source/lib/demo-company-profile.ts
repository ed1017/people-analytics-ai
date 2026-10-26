/** Static company profile reconciled to the released v4:5 aggregate catalogue.
 * A future dataset must supply its own profile; dashboard filters never redefine it.
 * Ed Inc. is the explicitly fictional presentation name approved for this demo.
 */
const profile = Object.freeze({
  name: 'Ed Inc.',
  datasetToken: 'workforce-demo-9037-public-aggregates-v4:5',
  asOf: '2026-09-30',
  historyStart: '2024-01-31',
  refreshPolicy: 'published-version' as const,
  people: 9037,
  countries: Object.freeze(['AU', 'BR', 'CA', 'DE', 'FR', 'GB', 'IN', 'JP', 'SG', 'US']),
  businessUnits: Object.freeze(['BU-CLIENTOPS', 'BU-CONS', 'BU-CORP', 'BU-DATAAI', 'BU-DIGITAL', 'BU-MGSVC', 'BU-SALES', 'BU-TECH']),
});
export function demoCompanyProfile(datasetToken: unknown, asOf: unknown) {
  return datasetToken === profile.datasetToken && asOf === profile.asOf ? profile : null;
}
