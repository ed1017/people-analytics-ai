/** Position design only: proposed positions are not employee moves, hires or exits. */
export type PositionRecord = {
  id: string;
  role: string | null;
  level: string | null;
  businessUnit: string | null;
  location: string | null;
  fte: number | null;
  /** Annual total cost of this position, not cost per FTE or incremental cash. */
  annualCostUsd: number | null;
  occupancy: 'occupied' | 'vacant' | 'unknown';
};
export type PositionBaseline = {
  version: string;
  asOf: string;
  scope: string;
  source: 'recorded-positions' | 'user-entered';
  positions: PositionRecord[];
};
export type PositionPatch = Partial<Omit<PositionRecord, 'id'>>;
export type PositionChange =
  | {kind: 'add'; position: PositionRecord}
  | {kind: 'change'; id: string; patch: PositionPatch}
  | {kind: 'move'; id: string; businessUnit: string | null; location: string | null}
  | {kind: 'remove'; id: string};
export type PositionScenario = {
  schemaVersion: 1;
  id: string;
  revision: number;
  baseline: PositionBaseline;
  changes: PositionChange[];
};
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nullableText = (value: unknown) => value === null || text(value);
const quantity = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
const clone = <T>(value: T): T => structuredClone(value);
const fields = ['role', 'level', 'businessUnit', 'location', 'fte', 'annualCostUsd', 'occupancy'];
function checkPosition(position: PositionRecord) {
  if (!position || !text(position.id) || !['role', 'level', 'businessUnit', 'location'].every(key => nullableText(position[key as keyof PositionRecord])) || !quantity(position.fte) || !quantity(position.annualCostUsd) || !['occupied', 'vacant', 'unknown'].includes(position.occupancy)) throw new Error('Position has invalid or missing fields. Use null for unknown FTE or cost.');
}
function checkBaseline(baseline: PositionBaseline) {
  if (!baseline || !text(baseline.version) || !text(baseline.scope) || !/^\d{4}-\d{2}-\d{2}$/.test(baseline.asOf) || !Number.isFinite(Date.parse(baseline.asOf)) || new Date(baseline.asOf).toISOString().slice(0,10) !== baseline.asOf || !['recorded-positions', 'user-entered'].includes(baseline.source) || !Array.isArray(baseline.positions)) throw new Error('A versioned, dated position baseline is required.');
  const ids = new Set<string>();
  for (const position of baseline.positions) {
    checkPosition(position);
    if (ids.has(position.id)) throw new Error('Duplicate baseline position ID.');
    ids.add(position.id);
  }
}
/** Replay a complete proposed revision; never changes the baseline or caller data. */
export function proposedPositions(baseline: PositionBaseline, changes: PositionChange[]): PositionRecord[] {
  checkBaseline(baseline);
  if (!Array.isArray(changes)) throw new Error('Position changes must be a list.');
  const positions = new Map(baseline.positions.map(position => [position.id, clone(position)]));
  const usedIds = new Set(positions.keys());
  for (const change of changes) {
    if (!change || !['add', 'change', 'move', 'remove'].includes(change.kind)) throw new Error('Unsupported position change.');
    if (change.kind === 'add') {
      checkPosition(change.position);
      if (usedIds.has(change.position.id)) throw new Error('A new position needs a new ID.');
      positions.set(change.position.id, clone(change.position));
      usedIds.add(change.position.id);
      continue;
    }
    const current = positions.get(change.id);
    if (!current) throw new Error('The position to change is not in the current proposal.');
    if (change.kind === 'remove') { positions.delete(change.id); continue; }
    const patch = change.kind === 'move' ? {businessUnit: change.businessUnit, location: change.location} : change.patch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some(key => !fields.includes(key))) throw new Error('Invalid position fields. Position IDs cannot change.');
    const updated = {...current, ...clone(patch)};
    checkPosition(updated);
    positions.set(current.id, updated);
  }
  return [...positions.values()];
}
export function createPositionScenario(id: string, baseline: PositionBaseline): PositionScenario {
  if (!text(id)) throw new Error('A scenario ID is required.');
  checkBaseline(baseline);
  return {schemaVersion: 1, id, revision: 1, baseline: clone(baseline), changes: []};
}
/** Changes are the complete next proposal, not an append that could apply an action twice. */
export function revisePositionScenario(scenario: PositionScenario, changes: PositionChange[]): PositionScenario {
  validatePositionScenario(scenario);
  if (scenario.revision >= Number.MAX_SAFE_INTEGER - 1) throw new Error('Position scenario revision limit reached.');
  proposedPositions(scenario.baseline, changes);
  return {...clone(scenario), revision: scenario.revision + 1, changes: clone(changes)};
}
/** Validate an existing save-envelope payload without reinterpreting its original dataset basis. */
export function validatePositionScenario(scenario: PositionScenario): void {
  if (!scenario || scenario.schemaVersion !== 1 || !text(scenario.id) || !Number.isSafeInteger(scenario.revision) || scenario.revision < 1 || scenario.revision === Number.MAX_SAFE_INTEGER) throw new Error('Unsupported position scenario version or revision.');
  proposedPositions(scenario.baseline, scenario.changes);
}
function totals(positions: PositionRecord[]) {
  const total = (key: 'fte' | 'annualCostUsd') => {
    if (positions.some(position => position[key] === null)) return null;
    const sum = positions.reduce((value, position) => value + position[key]!, 0);
    if (!Number.isFinite(sum)) throw new Error('Position totals exceed the supported numeric range.');
    return sum;
  };
  return {positions: positions.length, positionFte: total('fte'), annualPositionCostUsd: total('annualCostUsd'), occupiedPositions: positions.filter(position => position.occupancy === 'occupied').length, vacantPositions: positions.filter(position => position.occupancy === 'vacant').length, unknownOccupancyPositions: positions.filter(position => position.occupancy === 'unknown').length};
}
export function calculatePositionScenario(scenario: PositionScenario) {
  validatePositionScenario(scenario);
  const proposed = proposedPositions(scenario.baseline, scenario.changes);
  const currentTotals = totals(scenario.baseline.positions), proposedTotals = totals(proposed);
  const delta = (before: number | null, after: number | null) => before === null || after === null ? null : after - before;
  return {
    current: clone(scenario.baseline.positions), proposed, currentTotals, proposedTotals,
    netPositions: proposedTotals.positions - currentTotals.positions,
    netPositionFte: delta(currentTotals.positionFte, proposedTotals.positionFte),
    annualPositionCostDeltaUsd: delta(currentTotals.annualPositionCostUsd, proposedTotals.annualPositionCostUsd),
    employeeHeadcountChange: null,
  };
}
