/** Deterministic scenario arithmetic. No database reads, FX or compensation-demo fallback. */
export type HiringBudgetInput={role:string|null;level:string|null;location:string|null;snapshotDate:string|null;hires:number|null;budget:number|null;currency:string|null;startMonth:string|null;months:number|null;arrivalDate:string|null;ftePerHire:number|null;annualBasePay:number|null;payBasis:'per_hire'|'per_fte'|null;annualAdditionalCostPerHire:number|null;recruitingFeePerHire:number|null;otherCostsComplete:boolean|null};
export const hiringBudgetFields=['role','level','location','snapshotDate','hires','budget','currency','startMonth','months','arrivalDate','ftePerHire','annualBasePay','payBasis','annualAdditionalCostPerHire','recruitingFeePerHire','otherCostsComplete'] as const;
export type HiringBudgetField=typeof hiringBudgetFields[number];
export const emptyHiringBudget=():HiringBudgetInput=>Object.fromEntries(hiringBudgetFields.map(k=>[k,null])) as HiringBudgetInput;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const date=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const month=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}$/.test(s)&&date(s+'-01');
export function readHiringBudgetInput(raw:unknown):HiringBudgetInput{
 if(!object(raw)||Object.keys(raw).sort().join()!==[...hiringBudgetFields].sort().join())throw Error('Invalid hiring budget inputs.');
 for(const key of hiringBudgetFields){
  const v=raw[key];if(v===null)continue;
  if(['role','level','location'].includes(key)){if(typeof v!=='string'||!v.trim()||v.length>120)throw Error('Use a short exact role, level and location.');}
  else if(key==='currency'){if(typeof v!=='string'||!['USD','EUR','GBP','CAD','AUD','JPY','INR','SGD','CHF','CNY'].includes(v))throw Error('Select a supported currency; no currency conversion is performed.');}
  else if(key==='snapshotDate'||key==='arrivalDate'){if(!date(v))throw Error('Use a valid date.');}
  else if(key==='startMonth'){if(!month(v))throw Error('Use a valid start month.');}
  else if(key==='payBasis'){if(!['per_hire','per_fte'].includes(String(v)))throw Error('Specify annual base pay per hire or per full-time equivalent.');}
  else if(key==='otherCostsComplete'){if(typeof v!=='boolean')throw Error('Cost completeness must be explicit.');}
  else {
   if(!number(v)||v<0||v>1e9||Math.abs(v*100-Math.round(v*100))>1e-5)throw Error('Use finite nonnegative quantities with at most two decimals.');
   if(key==='hires'&&(!Number.isSafeInteger(v)||v>10000))throw Error('Use at most 10,000 whole hires.');
   if(key==='months'&&(!Number.isInteger(v)||v<1||v>24))throw Error('Use a horizon of 1–24 whole months.');
   if(key==='ftePerHire'&&(v<=0||v>1))throw Error('FTE per hire must be greater than zero and at most one.');
  }
 }
 const s=raw as HiringBudgetInput;
 if(s.arrivalDate&&s.startMonth&&s.arrivalDate<s.startMonth+'-01')throw Error('New hires must arrive on or after the budget start.');
 return structuredClone(s);
}

/** Proposed input from a separately approved aggregate release; never accept this from a browser/model. */
export type SalaryCohort={datasetToken:string;releaseId:string;snapshotDate:string;role:string;level:string;location:string;currencies:string[];eligibleCount:number;coveredCount:number;coveredFte:number;fteMin:number;fteMax:number;meanAnnualBase:number;aggregation:'employee_mean'|'fte_weighted_mean';payBasis:'annual_contracted_base'|'annual_base_per_fte';coverage:'complete'|'partial';status:'published'|'withheld';provenance:'company-synthetic'};
export type SalaryReference={status:'available';cohort:SalaryCohort;annualBasePerHire:number}|{status:'unavailable';reason:string};
export function resolveSalaryReference(input:HiringBudgetInput,datasetToken:string,raw?:unknown):SalaryReference{
 const unavailable=(reason:string):SalaryReference=>({status:'unavailable',reason});
 if(raw===undefined)return unavailable('Comparable company salary data is unavailable for this estimate.');
 if(!object(raw))return unavailable('No comparable salary cohort is available.');
 const c=raw as unknown as SalaryCohort;
 if(c.status!=='published')return unavailable('This salary cohort is unavailable or withheld.');
 if(c.provenance!=='company-synthetic'||typeof c.releaseId!=='string'||!c.releaseId.trim()||c.releaseId.length>120||c.datasetToken!==datasetToken)return unavailable('Salary source or dataset identity does not match.');
 if(!date(c.snapshotDate)||!input.snapshotDate||c.snapshotDate!==input.snapshotDate||!input.role||!input.level||!input.location||c.role!==input.role||c.level!==input.level||c.location!==input.location)return unavailable('Select the exact role, level, location and snapshot; no broader cohort is substituted.');
 if(!Array.isArray(c.currencies)||c.currencies.length!==1||!input.currency||c.currencies[0]!==input.currency)return unavailable('Salary and budget require one matching currency; mixed currencies are not converted.');
 if(!Number.isSafeInteger(c.eligibleCount)||!Number.isSafeInteger(c.coveredCount)||c.coveredCount<5||c.coveredCount>c.eligibleCount||!number(c.meanAnnualBase)||c.meanAnnualBase<=0||c.meanAnnualBase>1e9)return unavailable('The salary cohort lacks a publishable count or mean.');
 if(c.coverage!=='complete'||c.coveredCount!==c.eligibleCount)return unavailable('Partial salary coverage cannot silently fill the hiring rate. Use an explicit scenario override.');
 if(!number(c.coveredFte)||!number(c.fteMin)||!number(c.fteMax)||c.fteMin<=0||c.fteMax>1||c.fteMin>c.fteMax||c.coveredFte<c.coveredCount*c.fteMin-1e-6||c.coveredFte>c.coveredCount*c.fteMax+1e-6||input.ftePerHire===null)return unavailable('The salary cohort or proposed hire has an unknown FTE basis.');
 if(c.aggregation!==(c.payBasis==='annual_base_per_fte'?'fte_weighted_mean':'employee_mean'))return unavailable('The annual salary aggregation and FTE weighting method is unverified.');
 if(c.payBasis!=='annual_base_per_fte'&&(c.payBasis!=='annual_contracted_base'||c.fteMin!==c.fteMax||Math.abs(c.fteMin-input.ftePerHire)>1e-9))return unavailable('Contracted salaries with mixed or different FTE fractions are not comparable.');
 // An exact allowlist prevents incidental fields from entering the calculator/model output.
 const cohort:SalaryCohort={datasetToken:c.datasetToken,releaseId:c.releaseId,snapshotDate:c.snapshotDate,role:c.role,level:c.level,location:c.location,currencies:[...c.currencies],eligibleCount:c.eligibleCount,coveredCount:c.coveredCount,coveredFte:c.coveredFte,fteMin:c.fteMin,fteMax:c.fteMax,meanAnnualBase:c.meanAnnualBase,aggregation:c.aggregation,payBasis:c.payBasis,coverage:c.coverage,status:c.status,provenance:c.provenance};
 return {status:'available',cohort,annualBasePerHire:c.meanAnnualBase*(c.payBasis==='annual_base_per_fte'?input.ftePerHire:1)};
}
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
function affordableHires(budget:number,perHire:number){
 // Compare rounded group costs, as the budget check does; do not round the per-hire rate first.
 let low=0,high=Math.floor((budget+.01)/perHire)+1;
 if(!Number.isSafeInteger(high))return null;
 while(low+1<high){
  const middle=low+Math.floor((high-low)/2);
  if(round(middle*perHire)<=budget)low=middle;else high=middle;
 }
 return low;
}
export function calculateHiringBudget(raw:HiringBudgetInput,datasetToken='unconnected',cohort?:unknown){
 const input=readHiringBudgetInput(raw),salary=resolveSalaryReference(input,datasetToken,cohort),missing:string[]=[];
 const annualBasePerHire=input.annualBasePay!==null?(input.payBasis==='per_hire'?input.annualBasePay:input.payBasis==='per_fte'&&input.ftePerHire!==null?input.annualBasePay*input.ftePerHire:null):salary.status==='available'?salary.annualBasePerHire:null;
 const rateSource=input.annualBasePay!==null?'scenario-override':salary.status==='available'?'company-synthetic-aggregate':'unknown';
 const rows:{month:string;activeYearFraction:number;hiresPresent:number|null;listedCost:number|null}[]=[];
 let activeYearFraction:number|null=null;
 if(input.startMonth&&input.months&&input.arrivalDate){
  activeYearFraction=0;
  for(let n=0;n<input.months;n++){
   const start=new Date(input.startMonth+'-01T00:00:00Z');start.setUTCMonth(start.getUTCMonth()+n);const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);
   const arrival=Date.parse(input.arrivalDate),fraction=Math.max(0,Math.min(1,(end.getTime()-Math.max(start.getTime(),arrival))/(end.getTime()-start.getTime())))/12;
   activeYearFraction+=fraction;
   rows.push({month:start.toISOString().slice(0,7),activeYearFraction:fraction,hiresPresent:fraction>0?input.hires:0,listedCost:null});
  }
 }else missing.push('Budget start, horizon and arrival date are needed for period costs.');
 if(input.hires===null||input.hires===0)missing.push('A positive whole hiring count is needed.');
 if(!input.currency)missing.push('Budget and cost currency is unknown.');
 if(input.ftePerHire===null)missing.push('FTE per proposed hire is unknown.');
 if(annualBasePerHire===null)missing.push('Comparable annual base pay or an explicit override with its pay basis is needed.');
 if(input.annualAdditionalCostPerHire===null)missing.push('Annual non-base cost per hire is unknown (benefits, employer costs and other recurring costs).');
 if(input.recruitingFeePerHire===null)missing.push('One-time recruiting cost per hire is unknown.');
 if(input.otherCostsComplete!==true)missing.push('Coverage of all other costs is unconfirmed.');
 const positiveCount=input.hires!==null&&input.hires>0;
 const budgetPerHire=positiveCount&&input.budget!==null?round(input.budget/input.hires!):null;
 const baseCost=positiveCount&&annualBasePerHire!==null&&activeYearFraction!==null?round(input.hires!*annualBasePerHire*activeYearFraction):null;
 let listedCost:number|null=null,perHire:number|null=null;
 if(positiveCount&&annualBasePerHire!==null&&input.annualAdditionalCostPerHire!==null&&input.recruitingFeePerHire!==null&&activeYearFraction!==null&&input.currency){
  perHire=(annualBasePerHire+input.annualAdditionalCostPerHire)*activeYearFraction+(activeYearFraction>0?input.recruitingFeePerHire:0);
  listedCost=round(input.hires!*perHire);
  for(const row of rows)row.listedCost=round(input.hires!*((annualBasePerHire+input.annualAdditionalCostPerHire)*row.activeYearFraction+(row.month===input.arrivalDate!.slice(0,7)?input.recruitingFeePerHire:0)));
  if(rows.length)rows[rows.length-1].listedCost=round(rows[rows.length-1].listedCost!+listedCost-rows.reduce((sum,row)=>sum+row.listedCost!,0));
 }
 const complete=listedCost!==null&&input.otherCostsComplete===true&&input.ftePerHire!==null;
 const periodCost=complete?listedCost:null;
 const knownParts=activeYearFraction===null?[]:[
  annualBasePerHire===null?null:annualBasePerHire*activeYearFraction,
  input.annualAdditionalCostPerHire===null?null:input.annualAdditionalCostPerHire*activeYearFraction,
  input.recruitingFeePerHire===null?null:activeYearFraction>0?input.recruitingFeePerHire:0,
 ].filter((cost):cost is number=>cost!==null);
 const knownSubtotal=listedCost??(positiveCount&&knownParts.length?round(input.hires!*knownParts.reduce((sum,cost)=>sum+cost,0)):null);
 const budgetStatus=input.currency&&input.budget!==null&&knownSubtotal!==null&&knownSubtotal>input.budget?'over':periodCost!==null&&input.budget!==null?'within':'unknown';
 const maxAffordableHires=complete&&perHire!==null&&perHire>0&&input.budget!==null?affordableHires(input.budget,perHire):null;
 return {input,salary,rateSource,annualBasePerHire,budgetPerHire,baseCost,knownSubtotal,listedCost,periodCost,budgetStatus,maxAffordableHires,activeYearFraction,annualRunRate:positiveCount&&annualBasePerHire!==null&&input.annualAdditionalCostPerHire!==null?round(input.hires!*(annualBasePerHire+input.annualAdditionalCostPerHire)):null,hiresInHorizon:activeYearFraction===null||!positiveCount?null:activeYearFraction>0?input.hires:0,rows,missing,limitations:[
  'Budget per hire is an allowance for the specified budget period, not an annual salary or a market/company pay fact.',
  'Annual costs are divided by 12 and prorated by calendar days in each active month; recruiting cost is charged on arrival. All hires share the entered arrival date. The final month carries any cent-rounding residual.',
  'Later starts can reduce period cash but postpone staffing; they do not reduce the annual recurring rate. No ramp, attrition, salary growth or productivity effect is estimated.',
  'Known costs form a lower-bound subtotal including supplied base pay, non-base costs and recruiting fees. Missing components remain unknown; affordability requires explicit cost coverage. Internal moves and development need separate availability and cost evidence.',
 ],saved:false as const,operationalFeasibilityVerified:false as const};
}
