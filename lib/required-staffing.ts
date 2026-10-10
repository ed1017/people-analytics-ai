/** Fixed role requirements and explicit scenario rates. No source reads or workload inference. */
export const staffingInputLabels={role:'Required role',requiredRoles:'Required people',months:'Cost horizon (months)',currency:'Currency',budget:'Period budget',hireCostPerPerson:'Hire cost per person for the whole period',trainingCostPerPerson:'Training cash per trainee',trainingHoursPerPerson:'Planned hours per trainee',hireTrainingHoursPerPerson:'New-hire training hours per person',redeploymentCostPerPerson:'Incremental redeployment cash per person',backfillCostPerInternalPerson:'Backfill cash per internal person for the period',trainablePeople:'Trainable people',redeployablePeople:'Redeployable people',poolsDistinct:'Internal pools are separate',internalRelease:'Internal release assumed',costsComplete:'All incremental costs included',hireReadyAfterMonths:'Hire ready after months',trainingReadyAfterMonths:'Trainee ready after months',redeployReadyAfterMonths:'Redeployment ready after months'} as const;
export type StaffingInputField=keyof typeof staffingInputLabels;
export const requiredStaffingFields=Object.keys(staffingInputLabels) as StaffingInputField[];
export type RequiredStaffingInput={role:string|null;currency:string|null;requiredRoles:number|null;months:number|null;budget:number|null;hireCostPerPerson:number|null;trainingCostPerPerson:number|null;trainingHoursPerPerson:number|null;hireTrainingHoursPerPerson:number|null;redeploymentCostPerPerson:number|null;backfillCostPerInternalPerson:number|null;trainablePeople:number|null;redeployablePeople:number|null;poolsDistinct:boolean|null;internalRelease:boolean|null;costsComplete:boolean|null;hireReadyAfterMonths:number|null;trainingReadyAfterMonths:number|null;redeployReadyAfterMonths:number|null};
export const emptyRequiredStaffing=():RequiredStaffingInput=>Object.fromEntries(requiredStaffingFields.map(k=>[k,null])) as RequiredStaffingInput;
export const staffingFlagFields=['poolsDistinct','internalRelease','costsComplete'] as const;
export const staffingCashFields=['budget','hireCostPerPerson','trainingCostPerPerson','redeploymentCostPerPerson','backfillCostPerInternalPerson'] as const;
const whole=['requiredRoles','months','trainablePeople','redeployablePeople','hireReadyAfterMonths','trainingReadyAfterMonths','redeployReadyAfterMonths'];
export function readRequiredStaffingInput(raw:unknown):RequiredStaffingInput{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join()!==[...requiredStaffingFields].sort().join())throw Error('Invalid fixed-role staffing inputs.');
 const s=raw as RequiredStaffingInput;
 for(const field of requiredStaffingFields){
  const v=s[field];if(v===null)continue;
  if(field==='role'){if(typeof v!=='string'||!v.trim()||v.length>120)throw Error('Use a short role label.');}
  else if(field==='currency'){if(typeof v!=='string'||!['USD','EUR','GBP','CAD','AUD','JPY','INR','SGD','CHF','CNY'].includes(v))throw Error('Select one supported currency; no conversion is performed.');}
  else if(staffingFlagFields.includes(field as typeof staffingFlagFields[number])){if(typeof v!=='boolean')throw Error('State the staffing premise explicitly.');}
  else{
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e9||Math.abs(v*100-Math.round(v*100))>1e-5)throw Error('Use nonnegative values with at most two decimals.');
   if(whole.includes(field)&&!Number.isSafeInteger(v))throw Error('People and months must be whole counts.');
   if(['requiredRoles','trainablePeople','redeployablePeople'].includes(field)&&v>20)throw Error('This comparison supports at most 20 people per requirement or pool.');
   if(field==='months'&&(v<1||v>24)||field.endsWith('AfterMonths')&&v>24)throw Error('Use a horizon or readiness offset of at most 24 months.');
  }
 }
 return structuredClone(s);
}
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export type RequiredStaffingOption={id:string;train:number;redeploy:number;hire:number;coveredRoles:number;listedCash:number|null;knownSubtotal:number|null;completeCash:number|null;budgetStatus:'over'|'within'|'unknown';plannedTrainingHours:number|null;totalTrainingHours:number|null;newHireTrainingUnspecified:boolean;readyAfterMonths:number|null;coverage:'conditional'|'not-met';unknowns:string[]};
function option(s:RequiredStaffingInput,train:number,redeploy:number,hire:number):RequiredStaffingOption{
 const unknowns:string[]=[],parts:number[]=[],cost=(count:number,rate:number|null,label:string)=>{if(!count)return;if(rate===null)unknowns.push(label+' is unknown.');else parts.push(count*rate);};
 const internal=train+redeploy;
 cost(hire,s.hireCostPerPerson,'Whole-period hire cost');cost(train,s.trainingCostPerPerson,'Cash per trainee');cost(redeploy,s.redeploymentCostPerPerson,'Incremental redeployment cash');cost(internal,s.backfillCostPerInternalPerson,'Backfill cash for internal staffing');
 const missingCost=unknowns.length>0,knownSubtotal=parts.length?money(parts.reduce((a,b)=>a+b,0)):null;
 const listedCash=s.currency&&s.months!==null?knownSubtotal:null,completeCash=!missingCost&&s.costsComplete===true?listedCash:null;
 if(internal&&s.internalRelease!==true)unknowns.push(s.internalRelease===false?'Internal release is not available.':'Internal release is unverified.');
 if(train&&redeploy&&s.poolsDistinct!==true)unknowns.push('Overlap between the training and redeployment pools is unknown.');
 const readiness=[hire?s.hireReadyAfterMonths:0,train?s.trainingReadyAfterMonths:0,redeploy?s.redeployReadyAfterMonths:0];
 const readyAfterMonths=readiness.some(n=>n===null)?null:Math.max(...readiness as number[]);
 if(readyAfterMonths===null)unknowns.push('Readiness and coverage timing are unknown.');
 else if(readyAfterMonths>0)unknowns.push('These people do not cover the entire period from its start.');
 if(s.costsComplete!==true)unknowns.push('Other incremental costs and cost coverage remain unconfirmed.');
 const plannedTrainingHours=train?(s.trainingHoursPerPerson===null?null:money(train*s.trainingHoursPerPerson)):0;
 const newHireTrainingUnspecified=hire>0&&s.hireTrainingHoursPerPerson===null;
 if(newHireTrainingUnspecified)unknowns.push('New-hire training requirements are not specified.');
 if(plannedTrainingHours===null)unknowns.push('Planned training hours are unknown.');
 const totalTrainingHours=plannedTrainingHours===null||newHireTrainingUnspecified?null:money(plannedTrainingHours+hire*(s.hireTrainingHoursPerPerson??0));
 return {id:`train-${train}-redeploy-${redeploy}-hire-${hire}`,train,redeploy,hire,coveredRoles:train+redeploy+hire,listedCash,knownSubtotal,completeCash,budgetStatus:s.currency&&s.months!==null&&s.budget!==null&&knownSubtotal!==null&&knownSubtotal>s.budget?'over':completeCash!==null&&s.budget!==null?'within':'unknown',plannedTrainingHours,totalTrainingHours,newHireTrainingUnspecified,readyAfterMonths,coverage:internal&&s.internalRelease===false||readyAfterMonths!==null&&s.months!==null&&readyAfterMonths>s.months?'not-met':'conditional',unknowns};
}
export function calculateRequiredStaffing(raw:RequiredStaffingInput){
 const input=readRequiredStaffingInput(raw),missing:string[]=[];
 if(!input.role)missing.push('The required role is unknown.');
 if(!input.requiredRoles)missing.push('Supply a positive required headcount.');
 if(input.months===null)missing.push('The cost horizon is unknown.');
 if(!input.currency)missing.push('The cost currency is unknown.');
 if(input.trainablePeople===null||input.redeployablePeople===null)missing.push('Unspecified internal pools are not enumerated; their availability remains unknown.');
 if(input.poolsDistinct===false)missing.push('Combined training and redeployment are excluded because the pools are not separate.');
 const all:RequiredStaffingOption[]=[];
 if(input.requiredRoles&&input.role){
  const roles=input.requiredRoles;
  for(let train=0;train<=Math.min(input.trainablePeople??0,roles);train++)for(let redeploy=0;redeploy<=Math.min(input.redeployablePeople??0,roles-train);redeploy++){
   if(train&&redeploy&&input.poolsDistinct===false)continue;
   all.push(option(input,train,redeploy,roles-train-redeploy));
  }
 }
 if(all.length>256)throw Error('The staffing comparison exceeds its bounded search.');
 const eligible=all.filter(o=>o.coverage!=='not-met'&&o.budgetStatus!=='over'&&o.listedCash!==null&&(!o.hire||input.hireCostPerPerson!==null)&&(!o.train||input.trainingCostPerPerson!==null)&&(!o.redeploy||input.redeploymentCostPerPerson!==null));
 const recommended=[...eligible].sort((a,b)=>a.listedCash!-b.listedCash!||a.hire-b.hire||a.train-b.train)[0]??null;
 const internal=[...all].sort((a,b)=>a.hire-b.hire||(a.listedCash??Infinity)-(b.listedCash??Infinity)||a.train-b.train)[0];
 const anchor=recommended&&recommended.train+recommended.redeploy>0?recommended:internal;
 const hybrid=anchor?all.find(o=>o.redeploy===anchor.redeploy&&o.train===Math.floor(anchor.train/2)):undefined;
 const options=[...new Map([all[0],recommended??internal,hybrid,...all].filter((o):o is RequiredStaffingOption=>!!o).map(o=>[o.id,o])).values()].slice(0,3);
 const recommendation=recommended?{optionId:recommended.id,text:`Consider training ${recommended.train}, redeploying ${recommended.redeploy} and hiring ${recommended.hire}: lowest listed cash among the compared options that do not already exceed the cap. This remains conditional.`,nextStep:recommended.train+recommended.redeploy?'Confirm internal release, readiness and any backfill cost before committing.':'Confirm arrival timing, new-hire training and complete period costs.'}:null;
 return {input,missing,enumerated:all.length,options,recommendation,source:'explicit-scenario-inputs' as const,operationalFeasibilityVerified:false as const,saved:false as const,limitations:[
  'The required people count is supplied directly. No ticket volume, productive-hours denominator or company population is inferred.',
  'Hire cost is the quoted cost per person for this whole horizon. Training and redeployment cash are per person. Existing internal payroll is outside incremental cash unless explicitly included in the supplied rates; no cost is inferred from salary sources.',
  'Training hours describe the entered scenario. Zero planned training does not establish that new hires need no training. Training capacity and skill outcomes remain unverified.',
  'Every combination fills the stated count on paper; readiness, distinct internal pools, release and backfill still require review. Period quotes are not prorated from unknown arrival dates.',
  'At most three representative comparisons are displayed from the bounded enumeration. A listed-cash ranking does not establish complete cost or operational feasibility.',
 ]};
}
