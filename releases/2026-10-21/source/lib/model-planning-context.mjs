/** Lossless model-only factoring of repeated planning subtrees. Authoritative state is never changed. */
export function compactPlanningInput(input) {
 const projected=structuredClone(input), locations=[];
 for(const item of projected){
  if(item.role==='user'&&typeof item.content==='string'&&item.content.startsWith('CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n')){
   const value=JSON.parse(item.content.slice(item.content.indexOf('\n')+1));locations.push({value,write:()=>{item.content='CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n'+JSON.stringify(value);}});
  }else if(item.type==='function_call_output'&&typeof item.output==='string'){
   const value=JSON.parse(item.output);if(value&&typeof value==='object')locations.push({value,write:()=>{item.output=JSON.stringify(value);}});
  }
 }
 const roots=locations.flatMap(x=>['businessPlanning','workingProposals'].filter(key=>x.value[key]).map(key=>({parent:x.value,key}))), counts=new Map();
 const count=value=>{if(!value||(typeof value!=='object'&&typeof value!=='string'))return;const key=JSON.stringify(value);if(key.length>=128)counts.set(key,(counts.get(key)??0)+1);if(typeof value==='object')for(const child of Object.values(value))count(child);};
 for(const {parent,key} of roots)count(parent[key]);
 const values=[],indices=new Map();
 const project=value=>{
  if(!value||(typeof value!=='object'&&typeof value!=='string'))return value;
  const key=JSON.stringify(value);
  if((counts.get(key)??0)>1){let index=indices.get(key);if(index===undefined){index=values.length;indices.set(key,index);values.push(value);}return {planningContextRef:index};}
  if(typeof value==='string')return value;
  return Array.isArray(value)?value.map(project):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,project(v)]));
 };
 for(const {parent,key} of roots)parent[key]=project(parent[key]);
 if(!values.length)return input;
 const initial=locations.find(x=>x.value.currentMessage);
 if(!initial)return input;
 initial.value.planningContextDictionary={instruction:'Within businessPlanning and workingProposals only, an object containing only planningContextRef is an exact reference to values[index]. Expand it before interpreting. The referenced value is complete and unchanged; different revisions and all provenance are retained.',values};
 for(const location of locations)location.write();
 return new TextEncoder().encode(JSON.stringify(projected)).length<new TextEncoder().encode(JSON.stringify(input)).length?projected:input;
}

