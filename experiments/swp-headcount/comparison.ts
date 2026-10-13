import type {SwpHistory} from '../../lib/swp-history-qualification';
// @ts-expect-error Native fixture tests share TypeScript source.
import {qualifySwpHistory} from '../../lib/swp-history-qualification.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {monthlyHeadcountFlow} from '../../lib/monthly-headcount-flow.ts';
import {predict} from './baselines.mjs';

export const swpDemoDisclaimer = 'Synthetic demo baseline. Conditional retrospective evaluation; not validated for operational planning.';
export type SwpUserFlows = {basis:'user-entered';monthlyHires:number;monthlyDepartures:number};
export type SwpUserMonthlyCost = {basis:'user-entered';currency:'USD';unit:'per-employee-month';amount:number};
const sourceVersion = '64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd';
// Pin this local demo to the reviewed extract, not merely a caller-supplied version label.
const reviewedValues = [8400,8455,8516,8570,8625,8673,8732,8783,8834,8888,8940,8994,9050,9094,9140,9184,9230,9277,9321,9369,9415,9459,9507,9553,9600,9646,9698,9749,9800,9850,9900,9951,10000];

/** Local fixed-scope prototype. Source identifiers are audit bindings, not authentication. */
export function compareSwpHeadcount(history:SwpHistory, assumptions:SwpUserFlows|null, monthlyCost:SwpUserMonthlyCost|null = null) {
  if (history.scope.dimension !== 'company' || history.scope.id !== 'all-company' || history.metric.kind !== 'headcount' || history.sourceVersion !== sourceVersion || history.sourceId !== 'public.employee_snapshots:company-month-end:captured-2026-10-05' || history.points.length !== 33 || history.points[0].month !== '2024-01' || history.points.at(-1)?.month !== '2026-09' || !qualifySwpHistory(history).conditionalRetrospectiveEligible) throw Error('This demo requires the reviewed company-headcount history through September 2026.');
  if (history.points.some((p,i)=>p.value !== reviewedValues[i])) throw Error('Headcount values differ from the reviewed synthetic extract.');
  if (assumptions && (Object.keys(assumptions).sort().join(',') !== 'basis,monthlyDepartures,monthlyHires' || assumptions.basis !== 'user-entered' || [assumptions.monthlyHires, assumptions.monthlyDepartures].some(v => !Number.isSafeInteger(v) || v < 0 || v > 1e6))) throw Error('Enter whole nonnegative monthly hires and departures, up to 1,000,000.');
  const asOf = '2026-09-30', opening = history.points.at(-1)!.value!;
  const baseline = predict('drift', history.points.map(p => p.value!), 6);
  const scenario = assumptions ? monthlyHeadcountFlow({asOf, opening, months:6, hires:assumptions.monthlyHires, exits:assumptions.monthlyDepartures, transfersIn:0, transfersOut:0}) : null;
  let cost = null;
  if (monthlyCost !== null) {
    const cents = Math.round(monthlyCost.amount * 100);
    if (Object.keys(monthlyCost).sort().join(',') !== 'amount,basis,currency,unit' || monthlyCost.basis !== 'user-entered' || monthlyCost.currency !== 'USD' || monthlyCost.unit !== 'per-employee-month' || typeof monthlyCost.amount !== 'number' || !Number.isFinite(monthlyCost.amount) || monthlyCost.amount < 0 || !Number.isSafeInteger(cents) || !/^\d+(?:\.\d{1,2})?$/.test(String(monthlyCost.amount))) throw Error('Enter a nonnegative monthly USD cost per employee with at most two decimal places.');
    const runRate = (headcount:number) => {const value=headcount*cents;if(!Number.isSafeInteger(value))throw Error('The assumed cost is too large to calculate safely.');return value;};
    cost = {assumption:{...monthlyCost},unit:'USD/month' as const,basis:'user-assumption-run-rate' as const,
      points:baseline.map((headcount,i)=>{const baselineCents=runRate(headcount),scenarioCents=scenario?runRate(scenario[i].headcount):null;return {month:new Date(Date.UTC(2026,9+i,1)).toISOString().slice(0,7),baseline:baselineCents/100,scenario:scenarioCents===null?null:scenarioCents/100,difference:scenarioCents===null?null:(scenarioCents-baselineCents)/100};})};
  }
  return {asOf, opening, scope:'Company-wide' as const, disclaimer:swpDemoDisclaimer,
    baseline:{basis:'synthetic-history-drift' as const, reviewCommit:'ff2778ecae0ad00e1a94c5d874c4350954ead512', sourceVersion},
    assumptions:assumptions ? {...assumptions} : null, cost, interval:null, operationalForecastAvailable:false as const,
    points:baseline.map((headcount, i) => ({month:new Date(Date.UTC(2026, 9 + i, 1)).toISOString().slice(0, 7), baseline:headcount, scenario:scenario?.[i].headcount ?? null, difference:scenario ? scenario[i].headcount - headcount : null})),
  };
}
