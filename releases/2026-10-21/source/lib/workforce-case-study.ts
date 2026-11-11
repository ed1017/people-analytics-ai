import {calculateRequiredStaffing, type RequiredStaffingInput} from './required-staffing';

/** Published business context only. None of these figures supplies a model input. */
export const workforceCaseSources = [
  {id: 'strategy', date: 'June 13, 2023', title: 'Accenture AI investment announcement', url: 'https://newsroom.accenture.com/news/2023/accenture-to-invest-3-billion-in-ai-to-accelerate-clients-reinvention', fact: 'Accenture announced a planned $3 billion investment over three years in Data & AI and a goal to double its AI talent to 80,000 through hiring, acquisitions and training.'},
  {id: 'report', date: 'Fiscal year ended August 31, 2025', title: 'Accenture FY2025 Form 10-K', url: 'https://www.sec.gov/Archives/edgar/data/1467373/000146737325000217/acn-20250831.htm', fact: 'Accenture reported approximately 77,000 skilled AI and data practitioners at fiscal year-end. The earlier 80,000 figure was a target, not an outcome established by this report.'},
  {id: 'rebalance', date: 'Quarter ended August 31, 2025', title: 'FY2025 Form 10-K: Business Optimization', url: 'https://www.sec.gov/Archives/edgar/data/1467373/000146737325000217/acn-20250831.htm', fact: 'Accenture began a strategy combining upskilling, exits where reskilling was not viable, and operating efficiencies including AI. This was workforce rebalancing; its total workforce increased year over year. A contracting managed-services workstream is an assumption of our fictional case.'},
] as const;

export const workforceCaseAssumptions: RequiredStaffingInput = {
  role: 'Illustrative AI implementation analyst', requiredRoles: 10, months: 6,
  currency: 'USD', budget: 500000, hireCostPerPerson: 60000,
  trainingCostPerPerson: 5000, trainingHoursPerPerson: 80, hireTrainingHoursPerPerson: 16,
  redeploymentCostPerPerson: 2000, backfillCostPerInternalPerson: 10000,
  trainablePeople: 4, redeployablePeople: 3, poolsDistinct: true, internalRelease: true,
  costsComplete: false, hireReadyAfterMonths: 3, trainingReadyAfterMonths: 4, redeployReadyAfterMonths: 1,
};

export type WorkforceCaseControls = {deadline: 2 | 3 | 4; budget: 250000 | 500000 | 650000; release: boolean};
export const defaultWorkforceCaseControls: WorkforceCaseControls = {deadline: 3, budget: 500000, release: true};

/** Three declared strategies, not an optimal allocation or a candidate assessment. */
export function compareWorkforceCase(controls: WorkforceCaseControls) {
  if (![2, 3, 4].includes(controls.deadline) || ![250000, 500000, 650000].includes(controls.budget) || typeof controls.release !== 'boolean') throw Error('Choose one of the displayed case-study assumptions.');
  const strategies = [
    {id: 'hire', title: 'Hire all 10', train: 0, redeploy: 0},
    {id: 'redeploy', title: 'Redeploy 3, hire 7', train: 0, redeploy: 3},
    {id: 'develop', title: 'Develop 4, redeploy 3, hire 3', train: 4, redeploy: 3},
  ];
  const options = strategies.map(strategy => {
    // Price the declared mix independently of the decision constraints. The
    // shared calculator returns representative options; changing its ranking
    // premises could omit this declared mix. Apply current constraints below.
    const input = {...workforceCaseAssumptions, trainablePeople: strategy.train, redeployablePeople: strategy.redeploy};
    const calculation = calculateRequiredStaffing(input);
    const result = calculation.options.find(option => option.train === strategy.train && option.redeploy === strategy.redeploy);
    if (!result || result.listedCash === null || result.readyAfterMonths === null) throw Error('Case-study comparison unavailable.');
    const blockers = [
      ...(result.listedCash > controls.budget ? ['Listed cash exceeds the budget.'] : []),
      ...(result.readyAfterMonths > controls.deadline ? ['Full readiness misses the delivery target.'] : []),
      ...(!controls.release && strategy.train + strategy.redeploy > 0 ? ['Internal release is unavailable.'] : []),
    ];
    // Export only the priced quantities and current constraint results, not
    // the calculator's baseline budget/coverage statuses.
    return {...strategy, hire: result.hire, listedCash: result.listedCash,
      readyAfterMonths: result.readyAfterMonths, totalTrainingHours: result.totalTrainingHours,
      completeCash: result.completeCash, blockers};
  });
  const shortlist = options.filter(option => option.blockers.length === 0).sort((a, b) => a.listedCash! - b.listedCash!)[0] ?? null;
  return {options, shortlist, controls, provenance: 'synthetic-assumptions', operationalFeasibilityVerified: false} as const;
}
