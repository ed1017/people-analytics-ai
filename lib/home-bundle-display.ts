import type {SolutionBundle} from './home-solution-bundles';
/** Presentation-only resolution of this contract's exact internal reference tokens.
 * No semantic classification or editing of the stored model text. Unknown tokens stay literal.
 */
export function bundleDisplayText(text:string,bundle:SolutionBundle):string{
 const titles=new Map(bundle.components.map(component=>[component.id,component.name]));
 return text.replace(/\bc[1-6]\b/g,id=>titles.get(id)??id);
}
export function bundleComponentLabels(ids:string[],bundle:SolutionBundle):string{
 return ids.map(id=>bundle.components.find(component=>component.id===id)?.name??'Unavailable component').join(', ');
}

/** Exact presentation aliases only; arbitrary model titles keep their meaning. */
export function bundleDisplayName(name:string):string{
 return ({
  "Retention Signal Diagnosis":"Retention diagnosis",
  "Manager Experience Review":"Manager & workload review",
 } as Record<string,string>)[name]??name;
}

type DisplayAssumption<T>={value:T|null;kind:'unknown'|'user-entered'|'illustrative'|'adopted'};
/** Label every hypothetical value; never render missing inputs as zero or verified facts. */
export function bundleAssumptionText<T>(assumption:DisplayAssumption<T>,format:(value:T)=>string=value=>String(value)):string{
 if(assumption.value===null)return 'Not yet assessed';
 const label=assumption.kind==='illustrative'?'Illustrative':assumption.kind==='adopted'?'Adopted assumption':'User assumption';
 return `${label}: ${format(assumption.value)}`;
}
/** Shared horizon end, not a forecast or a component readiness date. */
export function bundleHorizonEnd(scope:{startMonth:DisplayAssumption<string>;months:DisplayAssumption<number>}):DisplayAssumption<string>{
 if(scope.startMonth.value===null||scope.months.value===null)return {value:null,kind:'unknown'};
 const [year,month]=scope.startMonth.value.split('-').map(Number);
 const value=new Date(Date.UTC(year,month-1+scope.months.value,0)).toISOString().slice(0,10);
 return {value,kind:scope.startMonth.kind==='illustrative'||scope.months.kind==='illustrative'?'illustrative':scope.startMonth.kind==='adopted'&&scope.months.kind==='adopted'?'adopted':'user-entered'};
}
