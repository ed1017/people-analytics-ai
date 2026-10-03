// Invented calendar records for checking evaluation mechanics, never accuracy evidence.
export const syntheticHiringManifest = {
  source: 'hand-authored-calendar-fixture',
  sourceDefinitionVersion: 'fixture-v1',
  provenance: 'synthetic',
  purpose: 'method-validation-only',
  jobProfileCode: 'SYNTHETIC_ROLE',
  asOf: '2026-10-03',
  openingCoverageStart: '2022-01-01',
  cohortCoverage: 'all-openings',
  openingScopeVerified: true,
  statusHistoryVerified: true,
};
const date = ms => new Date(ms).toISOString().slice(0, 10);
export function syntheticHiringRow(overrides = {}) {
  return {requisitionId: 'synthetic-single', jobProfileCode: 'SYNTHETIC_ROLE', externalInternal: 'external', status: 'filled',
    openedDate: '2025-06-01', closedDate: '2025-06-10', startDate: '2025-06-20', timeToFillDays: 5,
    labelFirstObservedAt: '2025-06-21T00:00:00.000Z', ...overrides};
}
export function syntheticHiringHistory() {
  const rows = [];
  for (let month = 0; month < 57; month++) {
    for (let index = 0; index < 12; index++) {
      const opened = Date.UTC(2022, month, index + 1), elapsed = 20 + Math.floor(month / 12) * 5 + index % 3;
      rows.push(syntheticHiringRow({requisitionId: `synthetic-${month}-${index}`, openedDate: date(opened),
        closedDate: date(opened + 10 * 86400000), startDate: date(opened + elapsed * 86400000),
        labelFirstObservedAt: new Date(opened + (elapsed + 2) * 86400000).toISOString()}));
    }
  }
  return rows;
}
