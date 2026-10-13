/** Pure manual-assumption contract. No source reads, forecasting, staffing approval or cost model. */
export const monthlyWorkloadVersion = 'monthly-supply-workload/v1' as const;
export type Unit = 'people' | 'FTE' | 'FTE/person' | 'work-units/month' | 'hours/work-unit' | 'hours/FTE/month' | 'fraction';
export type Quantity<U extends Unit> = {value:number|null;unit:U;basis:{kind:'user-assumption'|'unknown';note:string}};
export type Movement = {people:Quantity<'people'>;fte:{mode:'explicit';quantity:Quantity<'FTE'>}|{mode:'per-person';quantity:Quantity<'FTE/person'>}};
export type WorkloadMonth = {
  month:string;scopeId:string;
  hires:Movement;exits:Movement;transfersIn:Movement;transfersOut:Movement;
  volume:Quantity<'work-units/month'>;hoursPerUnit:Quantity<'hours/work-unit'>;
  productiveHoursPerFte:Quantity<'hours/FTE/month'>;allocation:Quantity<'fraction'>;productivityUplift:Quantity<'fraction'>;
};
export type MonthlyWorkloadSpec = {
  version:typeof monthlyWorkloadVersion;
  scope:{id:string;label:string;kind:'company'|'workload-group';workUnit:string};
  accounting:{timing:'start-of-month-outflows-from-opening';exits:'all-separations-including-retirement';movements:'disjoint';workload:'before-productivity';productiveHours:'net-of-non-work-time-before-allocation'};
  opening:{scopeId:string;asOf:string;headcount:Quantity<'people'>;contractedFte:Quantity<'FTE'>};
  months:WorkloadMonth[];
};
const scale=1_000_000;
const maximumStock=1_000_000;
const flowNames=['hires','exits','transfersIn','transfersOut'] as const;
function fail(message:string):never {throw Error(message);}
function object(value:unknown,keys:readonly string[],path:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))fail(`${path}: unsupported or missing fields.`);
  return value as Record<string,unknown>;
}
function text(value:unknown,path:string){if(typeof value!=='string'||!value.trim()||value.length>400)fail(`${path}: use nonempty text up to 400 characters.`);return value;}
function quantity(raw:unknown,unit:Unit,max:number,path:string,missing:string[]):number|null{
  const q=object(raw,['value','unit','basis'],path),basis=object(q.basis,['kind','note'],path+'.basis');
  text(basis.note,path+'.basis.note');
  if(q.unit!==unit)fail(`${path}: expected ${unit}.`);
  if(q.value===null){if(basis.kind!=='unknown')fail(`${path}: missing values require unknown provenance.`);missing.push(path);return null;}
  if(basis.kind!=='user-assumption')fail(`${path}: known values must be explicit user assumptions, not observed facts or proposals.`);
  const n=q.value;
  if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max||Number(n.toFixed(6))!==n||(unit==='people'&&!Number.isSafeInteger(n)))fail(`${path}: invalid value or support bound; at most six decimal places, whole people.`);
  return n;
}
function monthIndex(value:unknown,path:string):number{
  if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))fail(`${path}: expected YYYY-MM.`);
  const year=Number(value.slice(0,4));if(year<2000||year>2100)fail(`${path}: supported years are 2000–2100.`);
  return year*12+Number(value.slice(5,7))-1;
}
const sum=(...values:(number|null)[])=>values.some(v=>v===null)?null:values.reduce<number>((s,v)=>s+v!,0);
const product=(...values:(number|null)[])=>values.some(v=>v===null)?null:values.reduce<number>((s,v)=>s*v!,1);
const difference=(a:number|null,b:number|null)=>a===null||b===null?null:a-b;
function stock(people:number|null,fteMicro:number|null,path:string){
  if(people!==null&&(people<0||people>maximumStock))fail(`${path}: infeasible headcount.`);
  if(fteMicro!==null&&(!Number.isSafeInteger(fteMicro)||fteMicro<0||fteMicro>maximumStock*scale))fail(`${path}: infeasible contracted FTE.`);
  if(people!==null&&fteMicro!==null&&fteMicro>people*scale)fail(`${path}: contracted FTE exceeds people under the <=1 FTE/person contract.`);
}

/** Every month is supplied explicitly; no defaults, interpolation, rates, growth or implicit conversions. */
export function calculateMonthlyWorkload(raw:unknown){
  const spec=object(raw,['version','scope','accounting','opening','months'],'scenario');
  if(spec.version!==monthlyWorkloadVersion)fail('Unsupported monthly workload version.');
  const scope=object(spec.scope,['id','label','kind','workUnit'],'scope');
  for(const key of ['id','label','workUnit'])text(scope[key],`scope.${key}`);
  if(scope.kind!=='company'&&scope.kind!=='workload-group')fail('Unsupported scope kind.');
  const conventions={timing:'start-of-month-outflows-from-opening',exits:'all-separations-including-retirement',movements:'disjoint',workload:'before-productivity',productiveHours:'net-of-non-work-time-before-allocation'};
  const accounting=object(spec.accounting,Object.keys(conventions),'accounting');
  for(const [key,value] of Object.entries(conventions))if(accounting[key]!==value)fail(`accounting.${key}: unsupported convention.`);
  const opening=object(spec.opening,['scopeId','asOf','headcount','contractedFte'],'opening');
  if(opening.scopeId!==scope.id)fail('Opening scope mismatch.');
  const asOf=opening.asOf;
  if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))fail('Opening requires an exact month-end date.');
  const openingMonth=monthIndex(asOf.slice(0,7),'opening.asOf');
  const lastDay=new Date(Date.UTC(Math.floor(openingMonth/12),openingMonth%12+1,0)).toISOString().slice(0,10);
  if(asOf!==lastDay)fail('Opening requires an exact month-end date.');
  if(!Array.isArray(spec.months)||spec.months.length<1||spec.months.length>24)fail('Supply 1–24 explicit consecutive months.');
  const missing:string[]=[];
  let hc=quantity(opening.headcount,'people',maximumStock,'opening.headcount',missing);
  const openingFte=quantity(opening.contractedFte,'FTE',maximumStock,'opening.contractedFte',missing);
  let fte=openingFte===null?null:Math.round(openingFte*scale);
  stock(hc,fte,'opening');
  const points=spec.months.map((rawMonth,index)=>{
    const path=`months[${index}]`,m=object(rawMonth,['month','scopeId',...flowNames,'volume','hoursPerUnit','productiveHoursPerFte','allocation','productivityUplift'],path);
    if(monthIndex(m.month,path+'.month')!==openingMonth+index+1)fail(`${path}: month must immediately follow the opening/previous month, without gaps or duplicates.`);
    if(m.scopeId!==scope.id)fail(`${path}: scope mismatch.`);
    const flows=Object.fromEntries(flowNames.map(name=>{
      const p=path+'.'+name,movement=object(m[name],['people','fte'],p),people=quantity(movement.people,'people',maximumStock,p+'.people',missing),basis=object(movement.fte,['mode','quantity'],p+'.fte');
      if(basis.mode!=='explicit'&&basis.mode!=='per-person')fail(`${p}: unsupported FTE mode.`);
      const amount=quantity(basis.quantity,basis.mode==='explicit'?'FTE':'FTE/person',basis.mode==='explicit'?maximumStock:1,p+'.fte.quantity',missing);
      const micro=amount===null?null:basis.mode==='explicit'?Math.round(amount*scale):people===null?null:people*Math.round(amount*scale);
      stock(people,micro,p);
      if(scope.kind==='company'&&(name==='transfersIn'||name==='transfersOut')&&(people!==0||micro!==0))fail('Company internal transfers must be explicitly zero: internal moves do not change company supply.');
      return [name,{people,fteMicro:micro}];
    })) as Record<typeof flowNames[number],{people:number|null;fteMicro:number|null}>;
    const before={headcount:hc,contractedFte:fte===null?null:fte/scale};
    // Departures must be feasible in the opening population; same-month inflows cannot conceal overdraw.
    const outPeople=sum(flows.exits.people,flows.transfersOut.people),outFte=sum(flows.exits.fteMicro,flows.transfersOut.fteMicro);
    const knownOutPeople=(flows.exits.people??0)+(flows.transfersOut.people??0),knownOutFte=(flows.exits.fteMicro??0)+(flows.transfersOut.fteMicro??0);
    if(hc!==null&&knownOutPeople>hc||fte!==null&&knownOutFte>fte)fail(`${path}: outflows exceed opening supply.`);
    hc=difference(hc,outPeople);fte=difference(fte,outFte);stock(hc,fte,path+' remaining opening supply');
    hc=sum(hc,flows.hires.people,flows.transfersIn.people);fte=sum(fte,flows.hires.fteMicro,flows.transfersIn.fteMicro);stock(hc,fte,path+' closing supply');
    const volume=quantity(m.volume,'work-units/month',1e6,path+'.volume',missing),effort=quantity(m.hoursPerUnit,'hours/work-unit',1e6,path+'.hoursPerUnit',missing);
    const year=Math.floor((openingMonth+index+1)/12),month=(openingMonth+index+1)%12;
    const calendarHours=new Date(Date.UTC(year,month+1,0)).getUTCDate()*24;
    const hours=quantity(m.productiveHoursPerFte,'hours/FTE/month',calendarHours,path+'.productiveHoursPerFte',missing);
    if(hours===0)fail(`${path}: productive hours per FTE must be positive; zero is not a usable denominator.`);
    const allocation=quantity(m.allocation,'fraction',1,path+'.allocation',missing),uplift=quantity(m.productivityUplift,'fraction',1,path+'.productivityUplift',missing);
    const contractedFte=fte===null?null:fte/scale,allocatedFte=product(contractedFte,allocation),workloadHours=product(volume,effort);
    const effectiveHoursPerFte=product(hours,uplift===null?null:1+uplift);
    const requiredFte=workloadHours===null||effectiveHoursPerFte===null?null:workloadHours/effectiveHoursPerFte;
    const capacityHours=product(allocatedFte,effectiveHoursPerFte),gapFte=difference(requiredFte,allocatedFte),gapHours=difference(workloadHours,capacityHours);
    for(const n of [allocatedFte,workloadHours,effectiveHoursPerFte,requiredFte,capacityHours,gapFte,gapHours])if(n!==null&&(!Number.isFinite(n)||Math.abs(n)>1e12))fail(`${path}: calculated output exceeds supported magnitude 1e12.`);
    return {month:m.month as string,opening:before,movements:Object.fromEntries(flowNames.map(name=>[name,{people:flows[name].people,contractedFte:flows[name].fteMicro===null?null:flows[name].fteMicro!/scale}])),headcount:hc,contractedFte,allocatedFte,workloadHours,effectiveHoursPerFte,requiredFte,capacityHours,gapFte,gapHours};
  });
  return {version:monthlyWorkloadVersion,status:missing.length?'needs-inputs' as const:'calculated' as const,assumptions:structuredClone(raw) as MonthlyWorkloadSpec,missing,points,
    gapConvention:'positive-shortfall-negative-surplus' as const,
    units:{headcount:'people',contractedFte:'FTE',allocatedFte:'FTE',requiredFte:'FTE',gapFte:'FTE',workloadHours:'hours/month',capacityHours:'hours/month',gapHours:'hours/month'} as const,
    limitations:['User assumptions, not verified workforce facts, a forecast or staffing readiness.','One homogeneous workload scope; inputs assert disjoint movements and before-productivity workload. Aggregate values cannot prove no individual overlaps.','Start-of-month outflows are taken from opening stock, then inflows supply the full month. No within-month ramp or timing model.','Productive hours exclude non-work time; allocation is a separate share assigned to this workload. Productivity uplift is applied exactly once as throughput, not as fewer hires.','No costs, savings, confidence intervals, skill-match scores, hiring recommendations or action-plan effects are calculated.']};
}
