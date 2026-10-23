import type {Findings} from './key-findings';
import type {OccupationalReferenceEvidence} from './occupational-reference';
import type {DevelopmentQuote, developmentCost} from './development-costs';
import type {PlanningScenario, StructuralPositionScenarioResponse, TimePhasedWorkforceExecutionResponse, WorkforceResponsePlanAllocation} from './types';

const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const n = (v: number) => v.toLocaleString('en-US', {maximumFractionDigits: 2});
export function capacityFindings(r: ReturnType<typeof import('./swp-monthly-workload').calculateMonthlyWorkload> | null, preview: boolean): Findings {
  const p=r?.points.at(-1);
  return {scope:r ? `${r.assumptions.scope.label} · ${p?.month ?? 'unknown period'} · ${preview ? 'unconfirmed preview' : 'entered planning assumptions'}` : 'Workload capacity worksheet',items:p ? [
    valid(p.requiredFte) ? `${n(p.requiredFte)} FTE are required for the entered workload in the final month.` : 'Workload requirements remain unknown.',
    typeof p.gapFte==='number' && Number.isFinite(p.gapFte) ? `${n(Math.abs(p.gapFte))} FTE ${p.gapFte>0 ? 'shortfall' : p.gapFte<0 ? 'surplus' : 'gap'} in that month; review earlier months separately.` : 'Available capacity or the gap is still unknown; no staffing sufficiency is inferred.',
    'FTE measures working capacity, not a count of people or a hiring commitment.',
  ] : ['Enter the work, team and timing you know to compare required and available capacity.', 'Blank inputs remain unknown; no staffing recommendation is inferred.']};
}
export function occupationFindings(e: OccupationalReferenceEvidence): Findings {
  return {scope: `Selected occupational reference: ${e.selectedOccupationCode ?? 'none'}; not company performance`, items: [
    e.occupation ? `${e.occupation.title}: ${e.sourceMode === 'public_snapshot' ? 'curated public excerpt' : 'stored reference'}; release ${e.occupation.release ?? 'unknown'}.` : 'No occupation reference is available for this selection.',
    e.mappingStatus,
    'Reference tasks and skills do not establish employee proficiency or available internal capacity.',
  ]};
}
export function quoteFindings(q: DevelopmentQuote | undefined): Findings {
  const fee=q && q.fee.trim()!=='' ? Number(q.fee) : null;
  return {scope: q ? `${q.provider} · ${q.provenance === 'simulated' ? 'simulated quote' : 'unverified user quote'}` : 'Training and coaching catalogue',items:q ? [
    valid(fee) ? `${q.currency} ${n(fee)} per ${q.basis === 'person' ? 'person' : 'cohort package'} per session, before additional fees and employee time.` : 'Quote fee is unknown; it is not zero.',
    `${q.kind}: ${q.focus}. No learning outcome or staffing gain is established.`,
  ] : ['Select a quote for its fee basis and scope.', 'Catalogue examples are not vendor offers or evidence of learning outcomes.']};
}
export function developmentFindings(q: DevelopmentQuote, r: ReturnType<typeof developmentCost>): Findings {
  return {scope:`${q.provider} · ${q.currency} · entered attendance assumptions`,items:r.errors.length ? ['Correct the invalid inputs before interpreting calculated costs.', 'No learning outcome or staffing gain is established.'] : [
    valid(r.cashCost) ? `Modeled cash cost is ${q.currency} ${n(r.cashCost)}, including entered additional fees.` : 'Cash cost remains unknown until attendance, fee and additional-fee inputs are supplied.',
    valid(r.employeeHours) ? `${n(r.employeeHours)} employee hours are modeled; this assumes every participant attends every session.` : 'Employee hours remain unknown; no attendance is inferred.',
    valid(r.total) ? `Total including entered employee-time value is ${q.currency} ${n(r.total)}; this is not all incremental cash spending or an approved budget.` : 'Employee-time value or total cost remains unknown; no ROI or readiness gain is inferred.',
  ]};
}
export function scenarioFindings(s: PlanningScenario | undefined): Findings {
  const first=s?.points[0],last=s?.points.at(-1);
  return {scope:`${s?.scenario_name ?? 'No stored scenario selected'} · modeled plan, not actuals`,items:[
    first && last ? `Stored plan period: ${first.planning_month} to ${last.planning_month}.` : 'No stored planning period is available.',
    last && valid(last.planned_headcount) ? `Ending planned headcount is ${n(last.planned_headcount)}${valid(last.planned_fte) ? ` (${n(last.planned_fte)} FTE)` : ''}.` : 'Ending headcount is unavailable, not zero.',
    'This stored scenario is separate from unsaved custom assumptions; it does not establish staffing feasibility.',
  ]};
}
export function designFindings(r: StructuralPositionScenarioResponse | null, name: string): Findings {
  return {scope:`${name} · ${r?.as_of ?? 'no result date'} · calculated position design`,items:r ? [
    valid(r.modeled.authorized_positions) ? `${n(r.modeled.authorized_positions)} authorized positions are modeled.` : 'Authorized positions are unavailable.',
    valid(r.modeled.open_vacancies) ? `${n(r.modeled.open_vacancies)} vacancies remain in this design; vacancies are not hiring commitments.` : 'Vacancies are unavailable.',
    'Design assumptions do not establish individual availability or execution feasibility.',
  ] : ['No calculated position design is available yet.', 'Enter and run position changes before interpreting their impact.']};
}
export function allocationFindings(a: WorkforceResponsePlanAllocation | null, name: string): Findings {
  return {scope:`${name} · modeled response allocation`,items:a && [a.build,a.move,a.buy].every(valid) ? [
    `Build ${n(a.build)}, move ${n(a.move)} and buy ${n(a.buy)} role-capacity units are allocated.`,
    'Allocation is conditional; it does not confirm people, readiness, cost or arrival dates.',
  ] : ['No complete calculated response allocation is available yet.', 'Allocate role demand before testing dates and operating limits.']};
}
export function executionFindings(r: TimePhasedWorkforceExecutionResponse | null): Findings {
  return {scope:r ? `Conditional schedule · ${r.planning_start_month} to ${r.planning_end_month ?? 'unknown end'} · source ${r.as_of}` : 'Execution scenario',items:r ? [
    valid(r.final_remaining_net_gap) ? `${n(r.final_remaining_net_gap)} role-capacity units remain uncovered at the end of the modeled schedule.` : 'Remaining coverage is unknown.',
    'End-period coverage does not cancel earlier shortages. Dates are entered assumptions, not confirmed completion.',
    'This summary does not establish execution cost or that all operating constraints pass.',
  ] : ['No calculated execution schedule is available yet.', 'A response allocation and effective dates are needed to test coverage.']};
}
