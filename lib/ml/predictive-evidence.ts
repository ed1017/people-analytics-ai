/**
 * Shared OUTPUT metadata for future domain-specific evaluators. These types do not
 * authorize data collection, relax an input contract, or certify source truth.
 * No service, generic feature bag, model router or cross-domain fit is introduced.
 */
export type PredictiveDomain = 'voluntary-exits' | 'hiring-duration' | 'headcount-capacity' | 'workforce-cost';
export type PredictionUnit = 'events' | 'calendar-days' | 'people' | 'fte' | 'USD';
export type PredictionMethodKind = 'baseline' | 'fitted-statistical-model' | 'deterministic-scenario';

export type NumericErrorSummary = {
  count: number;
  mae: number;
  rmse: number;
  /** Prediction minus actual, in the report's declared unit. */
  bias: number;
};

export type PredictionProvenance = {
  sources: readonly string[];
  sourceDefinitionVersion: string | null;
  extractedOn: string;
  population: string;
  dataClass: 'user-declared-synthetic' | 'constructed-fixture' | 'verified-history';
  completeness: 'unverified' | 'verified';
  temporalAvailability: 'retrospective-final-data' | 'as-known-vintages' | 'constructed-fixture';
  generatorVersion: string | null;
  datasetFingerprint: string;
  /** Each domain must define exposure explicitly; null does not permit a rate. */
  exposureDefinition: string | null;
};

export type PredictionUncertainty = {
  status: 'unavailable';
  interval: null;
  reason: string;
} | {
  status: 'estimated';
  interval: { lower: number; upper: number; nominalCoverage: number; unit: PredictionUnit };
  scope: 'single-target' | 'joint-horizon-total';
  method: string;
  assumptions: readonly string[];
  calibration: { status: 'not-validated'; reason: string } | {
    status: 'evaluated';
    independentWindows: number;
    observedCoverage: number;
    evaluationFingerprint: string;
  };
};

export type PredictiveEvaluationEvidence = {
  domain: PredictiveDomain;
  target: string;
  unit: PredictionUnit;
  provenance: PredictionProvenance;
  methods: readonly { id: string; kind: PredictionMethodKind; fitting: string }[];
  evaluation: {
    basis: 'retrospective-final-data' | 'point-in-time' | 'constructed-fixture' | 'scenario-arithmetic';
    protocolVersion: string;
    protocolFingerprint: string;
    selectionUsesAssessmentOutcomes: boolean;
    assessmentCustody: 'not-untouched' | 'independently-held' | 'not-applicable';
    realWorldPerformanceValidated: boolean;
    deploymentValidated: boolean;
  };
  uncertainty: PredictionUncertainty;
};
