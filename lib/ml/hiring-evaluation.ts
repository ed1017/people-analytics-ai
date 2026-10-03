/** Offline synthetic evaluation only. No service, model fitting, or planner integration. */
import {createHash} from "node:crypto";

const DAY = 86_400_000;
const METHOD = "hiring-time-evaluation-v1";
export type HiringManifest = {
  source: string;
  sourceDefinitionVersion: string;
  provenance: "synthetic";
  purpose: "method-validation-only";
  jobProfileCode: string;
  asOf: string;
  openingCoverageStart: string;
  cohortCoverage: "all-openings" | "completed-fills-only";
  openingScopeVerified: boolean;
  statusHistoryVerified: boolean;
};
export type HiringObservation = {
  requisitionId: string | null;
  jobProfileCode: string;
  externalInternal: "external" | "internal";
  status: "filled" | "open" | "cancelled";
  openedDate: string | null;
  closedDate: string | null;
  startDate: string | null;
  timeToFillDays: number | null;
  labelFirstObservedAt: string | null;
};
export type AlignedValue = {id: string; days: number};
export type RegressionMetrics = {
  count: number;
  maeDays: number;
  medianAbsoluteErrorDays: number;
  p90AbsoluteErrorDays: number;
  meanSignedErrorDays: number;
};
const manifestKeys = ["source", "sourceDefinitionVersion", "provenance", "purpose", "jobProfileCode", "asOf", "openingCoverageStart", "cohortCoverage", "openingScopeVerified", "statusHistoryVerified"];
const rowKeys = ["requisitionId", "jobProfileCode", "externalInternal", "status", "openedDate", "closedDate", "startDate", "timeToFillDays", "labelFirstObservedAt"];
function objectWithKeys(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid evaluation input shape.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) {
    throw Error("Unexpected or missing evaluation fields; post-opening predictors and employee fields are not accepted.");
  }
  return record;
}
function day(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}
function instant(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : null;
}
function iso(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }
function monthStart(ms: number, offset = 0): number {
  const date = new Date(ms);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.getTime();
}
function completeMonths(start: number, end: number): number {
  const first = new Date(start), last = new Date(end);
  return Math.max(0, (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() - (first.getUTCDate() === 1 ? 0 : 1));
}
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function readManifest(input: unknown): HiringManifest {
  const raw = objectWithKeys(input, manifestKeys);
  for (const key of ["source", "sourceDefinitionVersion", "jobProfileCode"]) {
    if (typeof raw[key] !== "string" || !raw[key].trim() || raw[key].length > 200) throw Error("Invalid evaluation provenance or scope.");
  }
  if (raw.provenance !== "synthetic" || raw.purpose !== "method-validation-only") throw Error("Only explicitly synthetic method validation is supported.");
  if (typeof raw.cohortCoverage !== "string" || !["all-openings", "completed-fills-only"].includes(raw.cohortCoverage) || typeof raw.openingScopeVerified !== "boolean" || typeof raw.statusHistoryVerified !== "boolean") throw Error("Invalid cohort provenance declarations.");
  const asOf = day(raw.asOf), start = day(raw.openingCoverageStart);
  if (asOf === null || start === null || start > asOf || new Date(start).getUTCDate() !== 1) throw Error("Invalid extraction date or complete-month coverage start.");
  return Object.fromEntries(manifestKeys.map(key => [key, raw[key]])) as HiringManifest;
}

/** Calendar windows depend only on the manifest, never on labels or their distribution. */
export function freezeHiringProtocol(input: unknown) {
  const manifest = readManifest(input), asOf = day(manifest.asOf)!;
  if (new Date(monthStart(asOf, -15)).getUTCFullYear() < 0) throw Error("Extraction date cannot support the frozen calendar windows.");
  const cutoff = monthStart(asOf, -6);
  const development = [-9, -6, -3].map((offset, index) => {
    const start = monthStart(cutoff, offset);
    return {name: `development-${index + 1}`, trainBefore: iso(start), scoreFrom: iso(start), scoreBefore: iso(monthStart(start, 3)), observeThrough: iso(monthStart(start, 6)), observationBoundary: "midnight-UTC-inclusive" as const};
  });
  return freeze({methodVersion: METHOD, manifest, target: "opening-to-actual-start days conditional on a completed external fill" as const,
    development, holdout: {name: "holdout", trainBefore: iso(cutoff), scoreFrom: iso(cutoff), scoreBefore: iso(monthStart(cutoff, 3)), observeThrough: manifest.asOf, observationBoundary: "end-of-day-UTC-inclusive" as const},
    thresholds: {coverageMonths: 24, trainingLabels: 60, developmentLabels: 20, holdoutLabels: 30, observedFraction: 0.9},
    rollingClosureMonths: 12, quantileMethod: "linear interpolation at (n-1)*p; no rounding" as const});
}

function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  const lower = Math.floor(index), fraction = index - lower;
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * fraction;
}
/** Identical ID sets are required. IDs are local alignment keys and are never returned. */
export function scoreAlignedPredictions(actual: AlignedValue[], predicted: AlignedValue[]): RegressionMetrics {
  if (!actual.length || actual.length !== predicted.length) throw Error("Metrics require nonempty, identical scored cohorts.");
  const values = new Map<string, number>();
  for (const row of predicted) {
    if (typeof row.id !== "string" || !row.id.trim() || values.has(row.id) || !Number.isFinite(row.days) || row.days < 0 || row.days > Number.MAX_SAFE_INTEGER) throw Error("Invalid or duplicate prediction.");
    values.set(row.id, row.days);
  }
  const seen = new Set<string>(), errors: number[] = [];
  // Canonical ID order also fixes floating-point accumulation order.
  for (const row of [...actual].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (typeof row.id !== "string" || !row.id.trim() || seen.has(row.id) || !Number.isSafeInteger(row.days) || row.days < 0 || !values.has(row.id)) throw Error("Invalid labels or mismatched scored IDs.");
    seen.add(row.id); errors.push(values.get(row.id)! - row.days);
  }
  const absolute = errors.map(Math.abs), mean = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length;
  return {count: errors.length, maeDays: mean(absolute), medianAbsoluteErrorDays: quantile(absolute, 0.5), p90AbsoluteErrorDays: quantile(absolute, 0.9), meanSignedErrorDays: mean(errors)};
}

type ParsedRow = {id: string; opened: number; closed: number | null; started: number | null; observed: number | null; status: HiringObservation["status"]; labelValid: boolean; days: number | null};
type Counts = Record<string, number>;
const count = (counts: Counts, reason: string) => { counts[reason] = (counts[reason] ?? 0) + 1; };
function readRow(input: unknown): HiringObservation {
  const raw = objectWithKeys(input, rowKeys);
  for (const key of ["requisitionId", "openedDate", "closedDate", "startDate", "labelFirstObservedAt"]) {
    if (raw[key] !== null && typeof raw[key] !== "string") throw Error("Dates and local IDs must be strings or null.");
  }
  if (typeof raw.jobProfileCode !== "string" || typeof raw.externalInternal !== "string" || !["external", "internal"].includes(raw.externalInternal) || typeof raw.status !== "string" || !["filled", "open", "cancelled"].includes(raw.status)) throw Error("Invalid observation population fields.");
  if (raw.timeToFillDays !== null && (typeof raw.timeToFillDays !== "number" || !Number.isFinite(raw.timeToFillDays))) throw Error("Acceptance duration must be numeric or null.");
  // Canonical field order makes the fingerprint insensitive to object property order.
  return Object.fromEntries(rowKeys.map(key => [key, raw[key]])) as HiringObservation;
}

/** No files or services are read. Audit IDs stay separate from the aggregate report. */
export function evaluateHiringBaselines(manifestInput: unknown, observations: unknown[]) {
  const protocol = freezeHiringProtocol(manifestInput); // Freeze before examining targets.
  if (!Array.isArray(observations)) throw Error("An observation array is required.");
  const rows = observations.map(readRow), manifest = protocol.manifest;
  const asOfDay = day(manifest.asOf)!, asOfEnd = asOfDay + DAY - 1, coverageStart = day(manifest.openingCoverageStart)!;
  const frequency = new Map<string, number>();
  for (const row of rows) if (row.requisitionId?.trim()) frequency.set(row.requisitionId, (frequency.get(row.requisitionId) ?? 0) + 1);
  const duplicates = new Set([...frequency].filter(([, n]) => n > 1).map(([id]) => id));
  const counts: Counts = {inputRows: rows.length, distinctIds: frequency.size, duplicateIdsExcluded: duplicates.size};
  const excluded: Array<{id: string | null; reasons: string[]}> = [], parsed: ParsedRow[] = [];
  let cohortIntegrity = duplicates.size === 0, labelHistoryVerified = true;
  for (const row of rows) {
    const reasons: string[] = [], id = row.requisitionId;
    if (!id?.trim()) { reasons.push("missingId"); cohortIntegrity = false; }
    if (id && duplicates.has(id)) reasons.push("duplicateId");
    if (row.jobProfileCode !== manifest.jobProfileCode || row.externalInternal !== "external") reasons.push("outsideScope");
    const opened = day(row.openedDate), closed = day(row.closedDate), started = day(row.startDate), observed = instant(row.labelFirstObservedAt);
    if (opened === null) { reasons.push(row.openedDate === null ? "missingOpening" : "invalidOpening"); cohortIntegrity = false; }
    else if (opened < coverageStart || opened > asOfDay) { reasons.push("outsideOpeningCoverage"); cohortIntegrity = false; }
    if (reasons.length) {
      reasons.forEach(reason => count(counts, reason)); excluded.push({id, reasons}); continue;
    }
    let labelValid = row.status === "filled";
    if (row.status !== "filled") count(counts, "unresolvedOrCancelled");
    if (started === null) { count(counts, row.startDate === null ? "missingStart" : "invalidStart"); labelValid = false; }
    else if (started > asOfDay) count(counts, "futureStart");
    if (closed !== null && closed > asOfDay) count(counts, "futureClosure");
    if (observed !== null && observed > asOfEnd) count(counts, "futureLabelObservationTime");
    if (closed === null) { count(counts, row.closedDate === null ? "missingClosure" : "invalidClosure"); labelValid = false; }
    if (observed === null) {
      count(counts, row.labelFirstObservedAt === null ? "missingLabelObservationTime" : "invalidLabelObservationTime");
      if (row.status === "filled" && started !== null && started <= asOfDay) labelHistoryVerified = false;
      labelValid = false;
    }
    const acceptance = row.timeToFillDays;
    const validAcceptance = acceptance !== null && Number.isSafeInteger(acceptance) && acceptance >= 0;
    if (!validAcceptance) { count(counts, "missingOrInvalidAcceptance"); labelValid = false; }
    if ((started !== null && started < opened!) || (closed !== null && closed < opened!) ||
        (validAcceptance && (started !== null && started < opened! + acceptance * DAY || closed !== null && closed < opened! + acceptance * DAY)) ||
        (observed !== null && started !== null && observed < started)) {
      count(counts, "invalidChronology"); labelValid = false;
    }
    parsed.push({id: id!, opened: opened!, closed, started, observed, status: row.status, labelValid, days: started === null ? null : (started - opened!) / DAY});
  }
  parsed.sort((a, b) => a.opened - b.opened || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  excluded.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  const coverageMonths = completeMonths(coverageStart, asOfDay);
  const commonGates = {
    completeOpeningCohort: manifest.cohortCoverage === "all-openings" && manifest.statusHistoryVerified,
    verifiedOpeningScope: manifest.openingScopeVerified,
    cohortIntegrity,
    timestampedLabelHistory: labelHistoryVerified,
    sufficientOpeningCoverage: coverageMonths >= protocol.thresholds.coverageMonths,
  };
  const auditFolds: Array<{name: string; trainIds: string[]; rollingTrainIds: string[]; scoreIds: string[]; unavailableTrainingIds: string[]; unscored: Array<{id: string; reason: string}>}> = [];
  const observable = (row: ParsedRow, boundary: number) => row.labelValid && row.started! <= boundary && row.closed! <= boundary && row.observed! <= boundary;
  const folds = [...protocol.development, protocol.holdout].map(window => {
    const cutoff = day(window.trainBefore)!, scoreEnd = day(window.scoreBefore)!;
    const observationEnd = window.name === "holdout" ? asOfEnd : Math.min(day(window.observeThrough)!, asOfEnd);
    const priorOpenings = parsed.filter(row => row.opened < cutoff);
    const train = priorOpenings.filter(row => observable(row, cutoff));
    const rolling = train.filter(row => row.closed! >= monthStart(cutoff, -12) && row.closed! < cutoff);
    const cohort = parsed.filter(row => row.opened >= cutoff && row.opened < scoreEnd);
    const score = cohort.filter(row => observable(row, observationEnd));
    const unscored = cohort.filter(row => !observable(row, observationEnd)).map(row => ({id: row.id, reason: row.status !== "filled" ? "unresolved-or-cancelled" : !row.labelValid ? "missing-or-invalid-label" : "not-observed-by-boundary"}));
    const fraction = commonGates.completeOpeningCohort && cohortIntegrity && cohort.length ? score.length / cohort.length : null;
    const baseline = (training: ParsedRow[]) => {
      const medianDays = training.length ? quantile(training.map(row => row.days!), 0.5) : null;
      const metrics = medianDays !== null && score.length ? scoreAlignedPredictions(score.map(row => ({id: row.id, days: row.days!})), score.map(row => ({id: row.id, days: medianDays}))) : null;
      return {trainingCount: training.length, medianDays, metrics};
    };
    const gates = {...commonGates, enoughTrainingLabels: train.length >= protocol.thresholds.trainingLabels,
      enoughScoredLabels: score.length >= (window.name === "holdout" ? protocol.thresholds.holdoutLabels : protocol.thresholds.developmentLabels),
      sufficientObservation: fraction !== null && fraction >= protocol.thresholds.observedFraction,
      rollingBaselineAvailable: rolling.length > 0};
    const dispositions: Counts = {};
    unscored.forEach(row => count(dispositions, row.reason));
    auditFolds.push({name: window.name, trainIds: train.map(row => row.id), rollingTrainIds: rolling.map(row => row.id), scoreIds: score.map(row => row.id), unavailableTrainingIds: priorOpenings.filter(row => !observable(row, cutoff)).map(row => row.id), unscored});
    return {...window, observationTimestamp: new Date(observationEnd).toISOString(), preCutoffOpeningCount: priorOpenings.length, unavailableTrainingCount: priorOpenings.length - train.length, cohortCount: cohort.length, scoredCount: score.length, unscoredCount: unscored.length, dispositions,
      observedFraction: fraction, trainingOpeningMonths: train.length ? completeMonths(train[0].opened, cutoff) : 0,
      distinctTrainingCalendarMonths: new Set(train.map(row => new Date(row.opened).getUTCMonth())).size,
      expanding: baseline(train), rolling: baseline(rolling), gates, failedGates: Object.entries(gates).filter(([, pass]) => !pass).map(([name]) => name)};
  });
  const datasetFingerprint = createHash("sha256").update(JSON.stringify(rows.map(row => JSON.stringify(row)).sort())).digest("hex");
  const baselineGatesPassed = folds.every(fold => fold.failedGates.length === 0);
  const calendarCoverageEligible = folds.every(fold => fold.trainingOpeningMonths >= 24 && fold.distinctTrainingCalendarMonths > 1);
  return freeze({
    report: {methodVersion: METHOD, protocol, datasetFingerprint, coverageMonths, auditCounts: counts, folds,
      baselineEvaluationGatesPassed: baselineGatesPassed,
      candidateReviewGatesPassed: baselineGatesPassed && calendarCoverageEligible,
      openingCalendarCoverageEligible: calendarCoverageEligible,
      modelTrained: false, deploymentValidated: false,
      limitations: ["Synthetic method validation only; metrics do not establish real hiring accuracy or staffing availability.", "Targets are conditional on completed external fills; open/cancelled cases remain unscored.", "No features, learned model, parameter tuning, confidence intervals, or planner predictions are produced.", "Provenance and cohort completeness declarations require independent verification; this module cannot establish source truth.", "Retain this report with the evaluator Git SHA. Raw IDs belong only in the separate local audit."]},
    localAudit: {excluded, folds: auditFolds},
  });
}
