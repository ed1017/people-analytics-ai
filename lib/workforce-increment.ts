// Incremental single-role planning. Historical evidence is not a hiring promise.
import type {RecruitingTimingEvidence} from "./recruiting-timing";
// Increment on any arithmetic/assumption semantic change; distinct from result schema version.
export const workforceIncrementMethodVersion = "workforce-increment-v1" as const;
export const workforcePlanFields = ["businessUnit", "jobProfile", "intent", "roles", "build", "move", "buy", "backfills", "planningMonth", "months", "recruitingStart", "arrivalMode", "arrivalDate", "buildMonth", "moveMonth", "backfillDate", "annualHireCost", "hireFee", "annualBackfillCost", "backfillFee", "internalAnnualCostChange", "trainingCash", "trainingHours", "loadedHourlyCost", "budget", "maxAddedEmployees", "deadlineMonth"] as const;
export type WorkforcePlanField = typeof workforcePlanFields[number];
export type WorkforcePlanInput = Record<WorkforcePlanField,string>;
export const emptyWorkforcePlanInput = (): WorkforcePlanInput => Object.fromEntries(workforcePlanFields.map(key=>[key,""])) as WorkforcePlanInput;
const DAY=86400000;
export function planDate(value:string):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
}
const monthIndex=(value:string)=>{if(!/^\d{4}-\d{2}$/.test(value)||planDate(value+'-01')===null)throw Error('Use a valid YYYY-MM month.');return Number(value.slice(0,4))*12+Number(value.slice(5))-1};
const monthName=(index:number)=>`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;
const round=(value:number)=>{if(!Number.isFinite(value)||!Number.isSafeInteger(Math.round(value*100)))throw Error("Cost or hours total exceeds supported numeric precision.");return Math.round((value+Number.EPSILON)*100)/100};
function number(value:string,label:string,max=100000000,whole=false,required=false):number|null {
 if(value===''){if(required)throw Error(`Enter ${label}.`);return null}
 if(!/^\d+(\.\d{1,2})?$/.test(value))throw Error(`${label}: use a nonnegative number, with at most two decimals.`);
 const n=Number(value);if(!Number.isFinite(n)||n>max||whole&&!Number.isInteger(n))throw Error(`${label}: invalid amount.`);return n;
}
export function validateWorkforcePlanInput(raw:unknown):WorkforcePlanInput {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Missing workforce inputs.');
 const input=raw as WorkforcePlanInput;
 if(Object.keys(input).length!==workforcePlanFields.length||workforcePlanFields.some(key=>typeof input[key]!=='string'||input[key].length>100))throw Error('Unexpected or missing workforce inputs.');
 if(!input.businessUnit.trim()||!input.jobProfile.trim())throw Error('Select one governed business unit and job profile.');
 if(input.intent!=='additional')throw Error('This workflow models additional positions only. Replacement hiring must be separated from additional demand before calculation.');
 const roles=number(input.roles,'additional roles',1000,true,true)!;
 if(roles<1)throw Error('Enter at least one additional role.');
 const build=number(input.build,'Build count',1000,true,true)!,move=number(input.move,'Move count',1000,true,true)!,buy=number(input.buy,'Buy count',1000,true,true)!;
 if(build+move+buy!==roles)throw Error('Build, Move and Buy must sum to the additional role requirement.');
 const backfills=number(input.backfills,'external backfills',1000,true,build+move>0);
 if(backfills!==null&&backfills>build+move)throw Error('External backfills cannot exceed the internal Build and Move count in this bounded workflow.');
 const start=monthIndex(input.planningMonth),months=number(input.months,'planning months',24,true,true)!;
 if(months<1)throw Error('Planning horizon must contain at least one month.');
 for(const key of ['buildMonth','moveMonth','deadlineMonth'] as const)if(input[key]){const month=monthIndex(input[key]);if(month<start||month>=start+months)throw Error(`${key} must be within the planning horizon.`)}
 for(const key of ['recruitingStart','arrivalDate','backfillDate'] as const)if(input[key]&&planDate(input[key])===null)throw Error(`${key}: use a valid YYYY-MM-DD date.`);
 if(!['','historical-median','explicit'].includes(input.arrivalMode))throw Error('Choose an explicit date or the historical opening-to-start median assumption.');
 if(buy>0&&input.arrivalMode==='historical-median'&&!input.recruitingStart)throw Error('Enter the proposed recruiting launch date to use a historical timing assumption.');
 if(input.arrivalDate&&input.recruitingStart&&input.arrivalDate<input.recruitingStart)throw Error('Arrival cannot precede the supplied recruiting launch date.');
 for(const key of ['annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange','trainingCash','trainingHours','loadedHourlyCost','budget'] as const)number(input[key],key);
 number(input.maxAddedEmployees,'maximum added employees',2000,true);
 return {...input};
}
export function calculateWorkforceIncrement(raw:unknown,evidence:RecruitingTimingEvidence|null) {
 const input=validateWorkforcePlanInput(raw),roles=Number(input.roles),build=Number(input.build),move=Number(input.move),buy=Number(input.buy),backfills=build+move===0?0:Number(input.backfills);
 const start=monthIndex(input.planningMonth),count=Number(input.months),warnings:string[]=[];
 let arrival:string|null=null;
 if(buy>0&&input.arrivalMode==='explicit')arrival=input.arrivalDate||null;
 if(buy>0&&input.arrivalMode==='historical-median'){
  if(evidence?.scope.job_profile_code!==input.jobProfile)throw Error('Recruiting evidence does not match the selected role.');
  const days=evidence.opening_to_start.median_days;
  if(days!==null&&evidence.opening_to_start.valid_sample_count>=5)arrival=new Date(planDate(input.recruitingStart)!+Math.ceil(days)*DAY).toISOString().slice(0,10);
  else warnings.push('Comparable completed-start history is insufficient; arrival stays unknown. Enter an explicit assumption to calculate timing.');
 }
 const backfillArrival=backfills===0?null:input.backfillDate||null;
 for(const [label,when] of [['Hire arrival',arrival],['Backfill arrival',backfillArrival]] as const)if(when&&(monthIndex(when.slice(0,7))<start||monthIndex(when.slice(0,7))>=start+count))throw Error(`${label} must fall within the planning horizon; extend the horizon or revise the assumption.`);
 const cost=(key:WorkforcePlanField)=>input[key]===''?null:Number(input[key]);
 const hireAnnual=buy===0?0:cost('annualHireCost'),hireFee=buy===0?0:cost('hireFee'),backfillAnnual=backfills===0?0:cost('annualBackfillCost'),backfillFee=backfills===0?0:cost('backfillFee');
 const internalAnnual=build+move===0?0:cost('internalAnnualCostChange');
 const trainingCash=build===0?0:cost('trainingCash'),trainingHours=build===0?0:cost('trainingHours'),hourly=cost('loadedHourlyCost');
 const trainingTime=trainingHours===0?0:trainingHours===null||hourly===null?null:round(trainingHours*hourly);
 const active=(when:string|null,month:string,n:number)=>n===0?0:when===null?null:when.slice(0,7)<=month?n:0;
 const monthlyRecurring=(when:string|null,month:string,n:number,annual:number|null):number|null=>{
  if(n===0)return 0;if(when===null)return null;if(when.slice(0,7)>month)return 0;if(annual===null)return null;
  const index=monthIndex(month),first=planDate(month+'-01')!,next=planDate(monthName(index+1)+'-01')!,days=(next-first)/DAY,paidDays=(next-Math.max(first,planDate(when)!))/DAY;
  return round(n*annual/12*paidDays/days);
 };
 const oneTime=(when:string|null,month:string,n:number,fee:number|null)=>n===0?0:when===null?null:when.slice(0,7)===month?fee===null?null:round(n*fee):0;
 const add=(...values:(number|null)[])=>values.some(n=>n===null)?null:round((values as number[]).reduce((a,b)=>a+b,0));
 const internalUnknownTiming=(build>0&&!input.buildMonth)||(move>0&&!input.moveMonth);
 const rows=Array.from({length:count},(_,i)=>{
  const month=monthName(start+i),hires=active(arrival,month,buy),backfill=active(backfillArrival,month,backfills),buildReady=active(input.buildMonth?input.buildMonth+'-01':null,month,build),moveReady=active(input.moveMonth?input.moveMonth+'-01':null,month,move);
  const covered=add(hires,buildReady,moveReady),salary=monthlyRecurring(arrival,month,buy,hireAnnual),backfillSalary=monthlyRecurring(backfillArrival,month,backfills,backfillAnnual);
  // Total user-entered internal salary uplift (not existing payroll), allocated
  // evenly per internal role from each explicitly supplied effective month.
  // Build/Move dates are month starts. Combine their shares before rounding so
  // splitting the same internal cohort cannot create an extra cent of uplift.
  const internalCost=build+move===0?0:internalAnnual===null||internalUnknownTiming?null:round(internalAnnual/12*((buildReady??0)+(moveReady??0))/(build+move));
  const fees=add(oneTime(arrival,month,buy,hireFee),oneTime(backfillArrival,month,backfills,backfillFee));
  const programCash=i===0?trainingCash:0,programTime=i===0?trainingTime:0;
  return {month,externalHires:hires,externalBackfills:backfill,addedEmployees:add(hires,backfill),conditionalRoleCoverage:covered,remainingRoles:covered===null?null:Math.max(0,roles-covered),hireStaffingCost:salary,backfillStaffingCost:backfillSalary,internalSalaryUplift:internalCost,recruitingFees:fees,trainingCash:programCash,employeeTimeValue:programTime,incrementalCash:add(salary,backfillSalary,internalCost,fees,programCash)};
 });
 const totalCash=add(...rows.map(row=>row.incrementalCash)),totalTime=trainingTime,totalWithTime=add(totalCash,totalTime),maxAdded=buy+backfills;
 const budget=cost('budget'),cap=cost('maxAddedEmployees'),deadline=input.deadlineMonth?rows.find(row=>row.month===input.deadlineMonth)!:null;
 const checks=[{name:'Incremental cash budget',status:budget===null||totalCash===null?'unknown':totalCash<=budget?'met':'not met'},{name:'Maximum added employees',status:cap===null?'unknown':maxAdded<=cap?'met':'not met'},{name:'Conditional role coverage by deadline',status:deadline===null||deadline.remainingRoles===null?'unknown':deadline.remainingRoles===0?'met':'not met'}];
 if(build+move>0)warnings.push('Internal availability and source-team impact are unverified. Backfills and salary uplifts are explicit user assumptions; internal moves do not create new company employees.');
 warnings.push('This is an incremental plan, not the total workforce forecast. Other hiring, departures and existing payroll are excluded; do not add it to another scenario without reconciling overlapping hires.','All arrivals within each path are a user-selected common batch assumption, not evidence that multiple hires can arrive together.','Training cash and employee time are placed in the first planning month as an explicit comparison convention. Capability/readiness is not inferred from training cost or completion.','USD annual staffing rates are user assumptions, divided by 12 and prorated by calendar days in the arrival month. Existing structural annual budget remains a separate reference, never added to this cash total.','Budget checks cover incremental cash only. Employee time value is separate and is not assumed additional cash spending.');
 return {version:1 as const,input,arrivalDate:arrival,arrivalBasis:input.arrivalMode||'unknown',backfillArrival,rows,totalCash,totalTime,totalWithTime,maxAddedEmployees:maxAdded,checks,warnings};
}
export type WorkforceIncrement = ReturnType<typeof calculateWorkforceIncrement>;
