// @ts-expect-error Native Node checks share the application schemas.
import {businessPlanningTools} from './home-business-planning.ts';

/** Outbound model schemas only. Server validation keeps the expanded originals. */
function sharedParameters(name:string,parameters:Record<string,unknown>){
 const at=(path:string[])=>path.reduce<unknown>((node,key)=>(node as Record<string,unknown>)[key],parameters);
 const definitions:Record<string,unknown>=name==='review_scoped_service_demand'
  ?{basis:at(['properties','spec','properties','scopeBasis'])}
  :name==='revise_scoped_service_demand'
   ?{basis:at(['properties','edit','properties','changes','items','anyOf','0','properties','basis']),scope:at(['properties','edit','properties','changes','items','anyOf','0','properties','quantity','properties','scope'])}
   :name==='compare_service_staffing'
    ?{basis:at(['properties','changes','items','anyOf','0','properties','basis'])}:{};
 if(!Object.keys(definitions).length)return parameters;
 if(parameters.$defs||Object.values(definitions).some(value=>!value))throw Error('Shared model schema definitions are unavailable.');
 const references=new Map(Object.entries(definitions).map(([key,value])=>[JSON.stringify(value),{$ref:'#/$defs/'+key}]));
 const project=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(project);
  if(value&&typeof value==='object')return references.get(JSON.stringify(value))??Object.fromEntries(Object.entries(value).map(([key,item])=>[key,project(item)]));
  return value;
 };
 return {...project(parameters) as Record<string,unknown>,$defs:structuredClone(definitions)};
}

// Build once, keeping tool names, descriptions, strictness and argument contracts.
export const businessPlanningModelTools=businessPlanningTools.map(tool=>({...tool,parameters:sharedParameters(tool.name,tool.parameters)}));
