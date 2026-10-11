// @ts-expect-error Native Node tests share TypeScript source.
import {buildCompensationResponse, type CompensationSourceRow} from './compensation.ts';

export type FinanceSourceRow = CompensationSourceRow & {
  cost_per_fte_usd: unknown;
  vacant_positions: unknown;
  estimated_vacancy_cost_exposure_usd: unknown;
};
const number = (value: unknown): number | null => {
  if(typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value.trim()))) return null;
  const parsed=Number(value);
  return Number.isFinite(parsed) && parsed>=0 ? parsed : null;
};
const sum = (values: (number|null)[]) => values.length && values.every(value=>value!==null)
  ? finiteSum(values) : null;
function finiteSum(values:(number|null)[]){
  const total=values.reduce<number>((total,value)=>total+(value??0),0);
  return Number.isFinite(total)?Number(total.toFixed(2)):null;
}

/** Existing BU aggregates only. An incomplete total remains unknown, not zero. */
export function buildFinanceCurrent(rows: FinanceSourceRow[]) {
  const compensation=buildCompensationResponse(rows);
  const byCode=new Map(rows.map(row=>[row.org_code,row]));
  const units=compensation.by_business_unit.map(unit=>{
    const source=byCode.get(unit.org_code)!;
    const vacancies=number(source.vacant_positions);
    return {
      org_code:unit.org_code,org_name:unit.org_name,org_type:'business_unit' as const,
      headcount:unit.headcount,fte:unit.fte,labor_cost_usd:unit.labor_cost_usd,
      cost_per_fte_usd:number(source.cost_per_fte_usd),
      vacant_positions:vacancies!==null&&Number.isSafeInteger(vacancies)?vacancies:null,
      estimated_vacancy_cost_exposure_usd:number(source.estimated_vacancy_cost_exposure_usd),
      share_of_enterprise_labor_cost_pct:unit.share_of_reported_cost_pct,
    };
  });
  return {
    source:compensation.source,currency:compensation.currency,cost_period:compensation.cost_period,
    snapshot_date:compensation.snapshot_date,source_refreshed_at:compensation.source_refreshed_at,
    current:{...compensation.current,vacant_positions:sum(units.map(row=>row.vacant_positions)),
      estimated_vacancy_cost_exposure_usd:sum(units.map(row=>row.estimated_vacancy_cost_exposure_usd))},
    by_business_unit:units,
  };
}
