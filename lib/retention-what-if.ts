/** Retain what-if v1: deterministic user assumptions, never a forecast or effect estimate. */
export const retentionMethod = 'retain-what-if-v1' as const;
export const retentionInputFields = [
  'population','startMonth','months','baselineExpectedExits','lagMonths','activeBaselineMode',
  'activeBaselineExpectedExits','effectLowPct','effectHighPct','setupCost','participants',
  'perParticipantCost','monthlyProgramCost','fundedMonths',
] as const;
export type RetentionField = typeof retentionInputFields[number];
export type RetentionInput = Record<RetentionField,string>;
export type RetentionIssue = {field:RetentionField;kind:'missing'|'invalid';message:string};
export type RetentionOutcome = {expectedExits:number|null;fewerExits:number|null;programCost:number|null};
export type RetentionResult = {
  method:typeof retentionMethod;provenance:'user assumptions';currency:'USD';
  population:string;startMonth:string;endMonth:string;effectStartMonth:string|null;
  activeMonths:number|null;baselineActive:number|null;
  noIntervention:RetentionOutcome;programNoEffect:RetentionOutcome;
  assumedRange:{lowReduction:RetentionOutcome;highReduction:RetentionOutcome};
  issues:RetentionIssue[];limitations:string[];
};
export const emptyRetentionInput = ():RetentionInput => Object.fromEntries(retentionInputFields.map(field=>[field,''])) as RetentionInput;
const validMonth=(text:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(text)&&Number(text.slice(0,4))>=1900&&Number(text.slice(0,4))<=9990;
const addMonths=(month:string,count:number)=>{const [year,part]=month.split('-').map(Number),index=year*12+part-1+count;return `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`};
const round=(value:number)=>Math.round((value+Number.EPSILON)*1e6)/1e6;
const cents=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;

export function readRetentionInput(value:unknown):RetentionInput {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Retention assumptions must be a plain record.');
 const input=value as Record<string,unknown>;
 if(Object.keys(input).length!==retentionInputFields.length||Object.keys(input).some(field=>!retentionInputFields.includes(field as RetentionField)))throw Error('Retention assumptions contain unsupported or missing fields.');
 for(const field of retentionInputFields)if(typeof input[field]!=='string'||(input[field] as string).length>(field==='population'?240:80))throw Error(`Unsupported retention input: ${field}.`);
 return Object.fromEntries(retentionInputFields.map(field=>[field,(input[field] as string).trim()])) as RetentionInput;
}

export function calculateRetentionWhatIf(value:RetentionInput):RetentionResult {
 const input=readRetentionInput(value),issues:RetentionIssue[]=[];
 const issue=(field:RetentionField,kind:RetentionIssue['kind'],message:string)=>issues.push({field,kind,message});
 const number=(field:RetentionField,label:string,max:number,integer=false,min=0):number|null=>{
  const text=input[field];
  if(!text){issue(field,'missing',`${label} is unknown.`);return null;}
  if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)||!Number.isFinite(Number(text))||Number(text)<min||Number(text)>max||integer&&!Number.isInteger(Number(text))){issue(field,'invalid',`Enter ${label.toLowerCase()} from ${min} to ${max}${integer?' as a whole number':''}.`);return null;}
  return Number(text);
 };
 if(!input.population)throw Error('Describe the aggregate population before calculating.');
 if(!validMonth(input.startMonth))throw Error('Enter a planning start month as YYYY-MM (1900–9990).');
 const months=number('months','Planning horizon in months',24,true,1);
 if(months===null)throw Error('Enter a planning horizon of 1–24 whole months.');
 const baseline=number('baselineExpectedExits','User-entered expected voluntary exits without intervention',1_000_000);
 const lag=number('lagMonths','Effect lag in months',120,true);
 const low=number('effectLowPct','Lower assumed relative reduction (%)',100);
 const high=number('effectHighPct','Upper assumed relative reduction (%)',100);
 if(low!==null&&high!==null&&low>high)issue('effectHighPct','invalid','The upper assumed reduction must be at least the lower reduction.');
 if(!['','direct','uniform'].includes(input.activeBaselineMode))issue('activeBaselineMode','invalid','Choose direct active-period expected exits or explicitly assume uniform timing.');
 // Validate inactive numeric fields too: switching modes must not hide corrupt values.
 let direct:number|null=null;
 if(input.activeBaselineExpectedExits)direct=number('activeBaselineExpectedExits','Active-period expected voluntary exits',1_000_000);
 if(direct!==null&&baseline!==null&&direct>baseline)issue('activeBaselineExpectedExits','invalid','Active-period expected exits cannot exceed the full-horizon baseline.');
 const activeMonths=lag===null?null:Math.max(0,months-lag);
 let active:number|null=null;
 if(baseline!==null&&lag!==null){
  if(lag===0){active=baseline;if(direct!==null&&input.activeBaselineMode==='direct'&&direct!==baseline)issue('activeBaselineExpectedExits','invalid','With zero lag, active-period expected exits must equal the full-horizon baseline.');}
  else if(lag>=months){active=0;if(direct!==null&&input.activeBaselineMode==='direct'&&direct!==0)issue('activeBaselineExpectedExits','invalid','An effect starting outside this horizon has zero active-period expected exits.');}
  else if(input.activeBaselineMode==='uniform')active=baseline*activeMonths!/months;
  else if(input.activeBaselineMode==='direct'){
   active=direct;if(direct===null)issue('activeBaselineExpectedExits','missing','Expected exits during the effect-active period are unknown.');
  }else issue('activeBaselineMode','missing','Choose how baseline exits fall after the lag. Uniform timing is not assumed automatically.');
 }
 const setup=number('setupCost','One-time setup cost (USD)',1_000_000_000);
 const participants=number('participants','Funded participant count',1_000_000,true);
 const unit=number('perParticipantCost','One-time cost per participant (USD)',1_000_000);
 const monthly=number('monthlyProgramCost','Monthly program cost (USD)',1_000_000_000);
 const funded=number('fundedMonths','Funded months within this horizon',24,true);
 if(funded!==null&&funded>months)issue('fundedMonths','invalid','Funded months cannot exceed this planning horizon.');
 const invalid=issues.filter(item=>item.kind==='invalid');if(invalid.length)throw Error(invalid.map(item=>item.message).join(' '));
 const cost=[setup,participants,unit,monthly,funded].some(item=>item===null)?null:cents(setup!+participants!*unit!+monthly!*funded!);
 const rangeKnown=baseline!==null&&active!==null&&low!==null&&high!==null;
 const outcome=(effect:number|null):RetentionOutcome=>{
  const fewer=rangeKnown?round(active!*effect!/100):null;
  return {expectedExits:fewer===null?null:round(baseline!-fewer),fewerExits:fewer,programCost:cost};
 };
 return {
  method:retentionMethod,provenance:'user assumptions',currency:'USD',population:input.population,
  startMonth:input.startMonth,endMonth:addMonths(input.startMonth,months-1),effectStartMonth:lag===null?null:addMonths(input.startMonth,lag),
  activeMonths,baselineActive:active===null?null:round(active),
  noIntervention:{expectedExits:baseline,fewerExits:baseline===null?null:0,programCost:0},
  programNoEffect:{expectedExits:baseline,fewerExits:baseline===null?null:0,programCost:cost},
  assumedRange:{lowReduction:outcome(low),highReduction:outcome(high)},issues,
  limitations:[
   'One proposed program, viewed under different effect assumptions; not three interventions or ranked recommendations.',
   'The baseline and relative reductions are user assumptions, not forecasts, measured effects or causal estimates.',
   'Historical annualized turnover is not an annual exit probability. Survey associations do not supply an effect size.',
   'Baseline active means expected voluntary exits during the effect-active interval, not active employee headcount.',
   'Effects begin after the entered whole-month lag and apply through the remaining horizon; no ramp, compounding or benefit beyond the horizon is modeled.',
   'Program funding duration is separate from effect lag. Costs remain even if the program has no effect.',
   'Expected counts may be fractional. These results do not identify retained people or establish operational capacity.',
   'The entered range covers assumed reductions only; the no-effect case is not a worst-case guarantee. Possible worsening, savings and ROI are not modeled.',
  ],
 };
}
