// Compile-only assertions: numerical payloads must not regress to inferred JavaScript `any`.
import type {PlanAnalysisContext, SatisfactionAnalysisView, SatisfactionPayload, TurnoverReference} from '../../lib/ml/analysis-demo-types';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type AnalysisDemoTypeContract = [
  Assert<Equal<TurnoverReference['points'][number]['expectedExits'], number>>,
  Assert<Equal<TurnoverReference['baselineComparisons'][number]['assessment']['overall']['mae'], number>>,
  Assert<Equal<TurnoverReference['uncertainty']['interval'], null>>,
  Assert<Equal<SatisfactionAnalysisView['waves'][number]['scorePct'], number>>,
  Assert<Equal<SatisfactionAnalysisView['changes'][number]['fixedMeanScenarios'][number]['eligibleMeanChangePp'], number>>,
  Assert<Equal<SatisfactionAnalysisView['confidenceInterval'], null>>,
  Assert<Equal<SatisfactionAnalysisView['operationallyQualified'], false>>,
  Assert<Equal<Extract<'source', keyof SatisfactionAnalysisView>, never>>,
  Assert<Equal<SatisfactionPayload['baselineComparison']['status'], 'not-applicable'>>,
  Assert<Equal<PlanAnalysisContext['source']['status'], 'unqualified'>>,
];
