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
