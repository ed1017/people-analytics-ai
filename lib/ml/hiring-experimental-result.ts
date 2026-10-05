/** Offline benchmark context; neither branch permits an operational baseline. */
type MetricSummary={cohorts:number;openings:number;brier:number;logLoss:number;weightedMaePercentagePoints:number;biasPercentagePoints:number};
type ExperimentalCase={
 id:string;scenario:string;seed:number;status:'benchmarked';evaluationStatus:'retrospective-constructed-test-comparison';
 model:{identity:string;version:string;selectedMethod:string;selectionReason:string};
 dates:{origin:string;trainingStart:string;trainingEnd:string;testMonths:string[];scoredThrough:string};
 sample:{trainingCohorts:number;trainingOpenings:number;testCohorts:number;testOpenings:number};
 validation:{origin:string;scoreThrough:string;logisticImproves:boolean;metrics:Record<string,MetricSummary>}[];
 baselineComparison:{recent:MetricSummary;logistic:MetricSummary;selected:MetricSummary;selectedMinusRecentBrier:number;selectedMinusLogisticBrier:number};
 predictions:{month:string;fraction:number}[];interval:null;
};
type ExperimentalBenchmark={
 protocolVersion:string;generatorVersion:string;population:string;metric:'actual-start-within-90-days-fraction';
 scopeRelationship:'separate-fixture-not-plan-population';planBaselineEligible:false;
 cases:ExperimentalCase[];abstentions:{id:string;status:'abstained';reason:string;predictions:null;interval:null}[];
 supportLimits:{minimumCohorts:number;minimumCohortOpenings:number;minimumTrainingStarts:number;minimumTrainingNonStarts:number};
 selectionRule:string;uncertaintyReason:string;limitations:string[];
};
type ExperimentalBase={schemaVersion:1;kind:'experimental-synthetic-result';domain:'hiring';dataClass:'constructed-synthetic';
 operationallyQualified:false;sourceTruthVerified:false;forecastBaseline:null;interval:null;causalEffect:null;
 identity:string;implementationIdentity:string;reasonCodes:string[]};
export type ExperimentalHiringResult=ExperimentalBase&(
 {status:'benchmarked';artifactIdentity:string;benchmark:ExperimentalBenchmark}|
 {status:'unavailable';artifactIdentity:null;benchmark:null}
);
