# Current catalogue acceptance — October 23, 2026

Runtime tested: `600a4b2f22ed81a606fb83f761055b66cbb34806` (PR366). Provider calls: **0**.

The local check loaded the existing synthetic release binding, invoked `readPublicHomeAggregate` for every registered metric in ascending and descending order, and passed the returned charts through `readChatEvidenceSeries` using matching request/dataset identity. It includes the server-side turnover denominator and role-recruiting adapters. No raw records, private input files or credentials are published here.

Result: **140/140 passed**, 70 metrics, 24 collections. This checks successful retrieval and visual-contract acceptance, not model interpretation, independent numeric correctness for every metric, rendered browser behavior, or arbitrary unsupported filters. Existing targeted regressions remain the evidence for numerical and invalid-input behavior.

The older direct `queryAggregate` audit bypassed two required server adapters, causing false exceptions for total BU turnover and role median time to fill. Those exceptions are not current product failures. Learning catalogue ties also pass the current complete-tie contract.

| Collection | Metrics checked | Directions | Accepted visuals |
| --- | ---: | --- | ---: |
| workforce.business_units | 2 | Ascending and descending | 4/4 |
| workforce.countries | 2 | Ascending and descending | 4/4 |
| workforce.levels | 2 | Ascending and descending | 4/4 |
| workforce.tenure | 2 | Ascending and descending | 4/4 |
| finance.business_units | 3 | Ascending and descending | 6/6 |
| attrition.business_units | 5 | Ascending and descending | 10/10 |
| attrition.levels | 3 | Ascending and descending | 6/6 |
| attrition.tenure | 3 | Ascending and descending | 6/6 |
| recruiting.business_units | 6 | Ascending and descending | 12/12 |
| recruiting.roles | 1 | Ascending and descending | 2/2 |
| recruiting.sources | 3 | Ascending and descending | 6/6 |
| listening.items | 3 | Ascending and descending | 6/6 |
| learning.job_profiles | 5 | Ascending and descending | 10/10 |
| career.destination_roles | 2 | Ascending and descending | 4/4 |
| career.desired_locations | 2 | Ascending and descending | 4/4 |
| career.org_coverage | 3 | Ascending and descending | 6/6 |
| mobility.level_transitions | 1 | Ascending and descending | 2/2 |
| positions.business_unit | 3 | Ascending and descending | 6/6 |
| positions.level | 3 | Ascending and descending | 6/6 |
| skills.largest_gaps | 4 | Ascending and descending | 8/8 |
| skills.highest_demand | 4 | Ascending and descending | 8/8 |
| skills.strongest_coverage | 4 | Ascending and descending | 8/8 |
| pay.job_compa | 1 | Ascending and descending | 2/2 |
| catalog.policy_bands | 3 | Ascending and descending | 6/6 |
