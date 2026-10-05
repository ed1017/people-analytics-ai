/** Explicit offline projections. These types carry no source qualification or adoption authority. */
export type PlanAnalysisContext = {
  inputKey: string;
  evidenceIdentity: string;
  status: 'conditional-reference-only' | 'unavailable';
  source: {
    status: 'unqualified';
    contractStatus: 'passed' | 'blocked';
    reasonCodes: string[];
    missingInputs: string[];
  };
  reasonCodes: string[];
};

export type TurnoverMethod = 'recent-mean-3' | 'seasonal-naive-12' | 'simple-exponential-smoothing';
export type TurnoverErrorMetrics = {count: number; mae: number; rmse: number; bias: number};
export type TurnoverEvaluationMetrics = {
  origins: number;
  distinctTargetMonths: number;
  overall: TurnoverErrorMetrics;
  byHorizon: (TurnoverErrorMetrics & {horizon: number})[];
  threeMonthTotal: TurnoverErrorMetrics;
};
export type TurnoverReference = {
  status: 'conditional-retrospective-synthetic-demo';
  metric: 'voluntary-exit-count';
  provenance: {
    sources: string[];
    sourceDefinitionVersion: string;
    extractedOn: string;
    population: 'all-recorded-voluntary-separations';
    dataClass: 'user-declared-synthetic';
    completeness: 'unverified';
    temporalAvailability: 'retrospective-final-data';
    generatorVersion: null;
    datasetFingerprint: string;
    exposureDefinition: null;
  };
  method: TurnoverMethod;
  methodVersion: 'aggregate-exit-demo-v1';
  identities: {
    fixtureSha256: string;
    evaluatorSha256: string;
    datasetFingerprint: string;
    protocolFingerprint: string;
  };
  evaluation: {
    developmentOrigins: string[];
    distinctDevelopmentMonths: number;
    assessmentOrigin: string;
    assessmentCustody: 'not-untouched';
  };
  baselineComparisons: {
    id: TurnoverMethod;
    kind: 'baseline' | 'fitted-statistical-model';
    development: TurnoverEvaluationMetrics;
    assessment: TurnoverEvaluationMetrics;
  }[];
  assumptions: string[];
  points: {month: string; horizon: number; expectedExits: number}[];
  total: number;
  uncertainty: {status: 'unavailable'; interval: null; reason: string};
  operationallyQualified: false;
};

export type SatisfactionSensitivityView = {
  nonrespondentMeanRange: [number, number];
  constantNonrespondentMeans: number[];
  populationInterpretation: 'repeated-cross-section-not-matched';
};
export type SatisfactionWaveView = {
  waveId: string;
  revision: number;
  effectiveAt: string;
  scorePct: number;
  respondents: number;
  eligible: number;
  participationPct: number;
  nonrespondents: number;
  respondentContributionPct: number;
  nonresponseBounds: {
    kind: 'assumption-dependent-identification-bounds';
    lowerPct: number;
    upperPct: number;
  };
  fixedMeanScenarios: {nonrespondentMean: number; eligibleMeanPct: number}[];
};
export type SatisfactionChangeView = {
  from: string;
  to: string;
  fromDate: string;
  toDate: string;
  elapsedDays: number;
  respondentScoreChangePp: number;
  responseRateChangePp: number;
  respondentCountChange: number;
  eligibleCountChange: number;
  respondentContributionChangePp: number;
  decomposition: {
    method: 'symmetric-product-identity';
    scoreTermPp: number;
    responseRateTermPp: number;
    reconciledChangePp: number;
    interpretation: string;
  };
  nonresponseChangeBounds: {
    kind: 'assumption-dependent-identification-bounds';
    lowerPp: number;
    upperPp: number;
  };
  fixedMeanScenarios: {
    nonrespondentMean: number;
    eligibleMeanChangePp: number;
    scoreTermPp: number;
    responseRateTermPp: number;
  }[];
};
/** Available constructed arithmetic only; unavailable cases carry no numerical analysis. */
export type SatisfactionAnalysisView = {
  schemaVersion: 1;
  methodVersion: 'satisfaction-wave-change-v1';
  domain: 'satisfaction';
  status: 'descriptive-observed-wave-change';
  evidenceKind: 'synthetic-mechanics-only';
  sourceTruthVerified: false;
  operationallyQualified: false;
  forecast: null;
  causalEffect: null;
  confidenceInterval: null;
  withinPersonChange: null;
  compositionEffect: null;
  assumptions: SatisfactionSensitivityView;
  waves: SatisfactionWaveView[];
  changes: SatisfactionChangeView[];
  reasonCodes: string[];
  limitations: string[];
};
export type SatisfactionUnavailableView = {status: 'unavailable'; reasonCodes: string[]};
export type SatisfactionPayload = {
  methodVersion: 'satisfaction-wave-change-v1';
  analysis: SatisfactionAnalysisView;
  restrictedAssumptionAnalysis: SatisfactionAnalysisView;
  blockedExamples: {
    incompatibleInstrument: SatisfactionUnavailableView;
    suppressedWave: SatisfactionUnavailableView;
  };
  baselineComparison: {status: 'not-applicable'; reason: string};
};
