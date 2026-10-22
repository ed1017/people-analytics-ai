import {publicCatalogBands} from './home-pay-catalog-aggregates.mjs';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

/** A scenario range, never an observed salary, affordability ceiling or loaded cost. */
export function estimatePolicyBasePay(data,args){
 const rows=publicCatalogBands(data);
 if(!args||Object.keys(args).sort().join()!=='fte,jobCode,level,months'||
   !Number.isFinite(args.fte)||args.fte<=0||args.fte>1000||
   !(args.months===null||Number.isInteger(args.months)&&args.months>=1&&args.months<=24)||
   !(args.jobCode===null||typeof args.jobCode==='string'&&args.jobCode.length<=40)||
   !(args.level===null||typeof args.level==='string'&&args.level.length<=4))throw Error('Invalid policy estimate scope.');
 const jobs=[...new Set(rows.map(r=>r.job))];
 const row=rows.find(r=>r.job===args.jobCode&&r.level===args.level);
 if(!row)return {status:'clarification',availableJobCodes:jobs,availableLevels:[...new Set(rows.map(r=>r.level))],message:'Choose an exact listed job code and level. Department and business unit names are not job-code mappings.'};
 const scale=args.fte*(args.months??12)/12;
 const money=n=>Math.round(n*scale*100)/100;
 return {status:'estimate',jobCode:row.job,level:row.level,fte:args.fte,months:args.months??12,
  horizon:args.months===null?'Annualized scenario; planning period not yet specified':'Requested months assuming full-period capacity',
  currency:'USD',basis:'annual_base_1_fte',source:{datasetToken:P.token,asOf:P.cutoff,policyVersion:'constructed-9037-inherited-range-policy-v1'},
  annualBasePerFte:{minimum:row.minimum,midpoint:row.midpoint,maximum:row.maximum},
  estimatedBaseFunding:{minimum:money(row.minimum),midpoint:money(row.midpoint),maximum:money(row.maximum)},
  affordability:'not assessed',approvedBudget:null,
  limitations:['Constructed global policy band, not observed salaries or a market quote.','No department, business-unit or location-specific pricing or currency conversion.','Base pay only: excludes employer costs, recruiting fees, training, backfill and readiness delays.','This range is policy variation, not a statistical confidence interval.'],
  next:'Confirm or adjust the job code, level, FTE, horizon and chosen base-pay assumption before calculating options. Confirming an estimate does not approve a budget ceiling.'};
}

export const policyEstimateTool={type:'function',name:'estimate_policy_base_pay',strict:true,
 description:'Read the current constructed global USD policy band by exact catalog job code and level and calculate a base-pay scenario range for explicit FTE. Use before asking for a staffing budget. This is not observed pay, loaded cost, location-specific pricing or approved funding. Do not map a department/BU to a job code by guess. Use null jobCode/level to discover supported identifiers, null months for clearly annualized estimates. Ask the user to confirm/adjust assumptions; do not automatically put the estimate into budget or annualBasePay.',
 parameters:{type:'object',additionalProperties:false,required:['jobCode','level','fte','months'],properties:{jobCode:{type:['string','null'],maxLength:40},level:{type:['string','null'],maxLength:4},fte:{type:'number',exclusiveMinimum:0,maximum:1000},months:{type:['integer','null'],minimum:1,maximum:24}}}};
