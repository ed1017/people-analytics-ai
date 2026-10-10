import type {FinanceBusinessUnit} from './types';
/** The Finance API sums these source-reported business-unit amounts; it does not
 * multiply the enterprise average cost/FTE by all vacancies. No total is replaced. */
export function financeVacancyBasis(headline:number,rows:readonly FinanceBusinessUnit[]){
 const valid=(value:number)=>Number.isFinite(value)&&value>=0;
 const complete=rows.length>0&&rows.every(row=>valid(row.estimated_vacancy_cost_exposure_usd));
 const subtotal=complete?Math.round(rows.reduce((total,row)=>total+row.estimated_vacancy_cost_exposure_usd,0)*100)/100:null;
 const difference=subtotal!==null&&valid(headline)?Math.round((headline-subtotal)*100)/100:null;
 return {subtotal,difference,reconciles:difference!==null&&Math.abs(difference)<=Math.max(.01,rows.length*.005)};
}
