/** Reader-facing copy only; stored provenance identifiers and kinds stay unchanged. */
export function bundleAssumptionCopy(text:string){return text.replaceAll('illustrative-pilot-v1','Starting estimate preset').replace(/\billustrative\b/gi,word=>word[0]==='I'?'Assumed':'assumed');}
import type {SolutionBundle} from './home-solution-bundles';
import type {BundleInputs} from './home-bundle-reconciliation';
/** Presentation-only resolution of this contract's exact internal reference tokens.
 * No semantic classification or editing of the stored model text. Unknown tokens stay literal.
 */
export function bundleDisplayText(text:string,bundle:SolutionBundle,inputs?:Pick<BundleInputs,'groups'>):string{
 const titles=new Map(bundle.components.map(component=>[component.id,component.name]));
 let result=text.replace(/\bc[1-6]\b/g,id=>titles.get(id)??id);
 // Resolve explicit shared-participant references from the current draft only.
 // Stored proposal text, unrelated quantities and attachment history stay intact.
 if(inputs?.groups.length===1&&inputs.groups[0].count.value!==null){
  const count=String(inputs.groups[0].count.value),quantity='(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
  result=result.replace(new RegExp('\\b'+quantity+'(\\s+(?:pilot\\s+)?participants)\\b','gi'),(_,noun)=>count+noun)
   .replace(new RegExp('\\b'+quantity+'[- ](person|participant)(?=\\s+(?:pilot|group|cohort)\\b)','gi'),(_,noun)=>count+'-'+noun)
   .replace(new RegExp('(\\b(?:pilot|pilot group|participant group|participant cohort)\\s+of\\s+)'+quantity+'\\b','gi'),(_,prefix)=>prefix+count);
 }
 return result;
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
 const label=assumption.kind==='illustrative'?'Assumed':assumption.kind==='adopted'?'Adopted assumption':'User assumption';
 return `${label}: ${bundleAssumptionCopy(format(assumption.value))}`;
}
/** Shared horizon end, not a forecast or a component readiness date. */
export function bundleHorizonEnd(scope:{startMonth:DisplayAssumption<string>;months:DisplayAssumption<number>}):DisplayAssumption<string>{
 if(scope.startMonth.value===null||scope.months.value===null)return {value:null,kind:'unknown'};
 const [year,month]=scope.startMonth.value.split('-').map(Number);
 const value=new Date(Date.UTC(year,month-1+scope.months.value,0)).toISOString().slice(0,10);
 return {value,kind:scope.startMonth.kind==='illustrative'||scope.months.kind==='illustrative'?'illustrative':scope.startMonth.kind==='adopted'&&scope.months.kind==='adopted'?'adopted':'user-entered'};
}

/** Conservative label: recognized analysis verbs only; other drafts are not certified interventions. */
export function bundleIsAnalysisOnly(bundle:SolutionBundle){return bundle.components.length>0&&bundle.components.every(component=>/^(?:propose(?: to)?\s+)?(?:review|investigate|analy[zs]e|assess|compare|examine|audit|diagnose|summarize|summarise|triangulate|identify|define)\b/i.test(component.firstStep.trim()));}
