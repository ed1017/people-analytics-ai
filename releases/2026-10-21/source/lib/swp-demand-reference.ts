/** Model wire references resolve only against the server's checked current review.
 * Full persisted reviews, exact keys and legacy editor validation are unchanged. */
import type {DemandContext,DemandReview,DemandPatch,DemandQuantityField} from './swp-demand';
// @ts-expect-error Native fixtures share TypeScript source.
import {serviceDemandSchema,demandPatchSchema,demandQuantityFields,serviceIllustrationScope,createDemandReview,readDemandReview,reviseDemandReview,demandInstructions} from './swp-demand.ts';
// @ts-expect-error Native fixtures share TypeScript source.
import {assertSolutionShape,solutionTools,solutionConversationInstructions,solutionResponseFormat} from './home-solution-conversation-schema.ts';
const obj=(properties:Record<string,typeof serviceDemandSchema>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const ref=(value:string)=>obj({ref:{type:'string',enum:[value]}});
const retain=ref('retain');
const initialSchema=structuredClone(serviceDemandSchema);
// State shared provenance guidance once, without repeating it at every leaf.
function compactBasisGuidance(schema:typeof serviceDemandSchema){if(schema.description?.startsWith('Only user-supplied inputs'))delete schema.description;for(const child of Object.values(schema.properties??{}))compactBasisGuidance(child);for(const child of schema.anyOf??[])compactBasisGuidance(child);if(schema.items)compactBasisGuidance(schema.items);}
compactBasisGuidance(initialSchema);
initialSchema.properties!.scope={anyOf:[initialSchema.properties!.scope,ref('illustrative-service-role')]};
for(const field of demandQuantityFields){const q=initialSchema.properties![field];q.properties!.scope={anyOf:[q.properties!.scope,ref('scenario-scope')]};}
export const reviewReferencedDemandTool={type:'function' as const,name:'review_scoped_service_demand',strict:true,
 description:'Initial unverified demand proposal. scope may use {ref:"illustrative-service-role"} for the code-owned illustrative role, a different literal scope, or null. Quantity scope may use {ref:"scenario-scope"} only when it actually covers that role slice; different literal scopes and unknowns remain distinct. Only user-supplied bases carry a turn/quote; all others use null. Never infer availability from headcount.',parameters:obj({spec:initialSchema})};
const editSchema=structuredClone(demandPatchSchema);
delete editSchema.properties!.baseKey;
editSchema.properties!.reviewRef={type:'string',minLength:1,maxLength:180};
editSchema.required=Object.keys(editSchema.properties!);
for(const change of editSchema.properties!.changes.items!.anyOf!){
 if(change.properties!.quantity.type==='null')continue;
 const q=change.properties!.quantity;
 delete q.properties!.basis;
 q.properties!.value={anyOf:[q.properties!.value,retain]};
 q.properties!.period={anyOf:[q.properties!.period,retain]};
 q.properties!.scope={anyOf:[retain,ref('scenario-scope'),obj({literal:{anyOf:[{type:'string',minLength:1,maxLength:240},{type:'null'}]}})]};
 q.required=Object.keys(q.properties!);
}
export const reviseReferencedDemandTool={type:'function' as const,name:'revise_scoped_service_demand',strict:true,
 description:'Edit the exact server-issued current reviewRef. One current-user basis per change; no duplicated quantity basis or serialized review key. Quantity value/period may use {ref:"retain"}. Scope requires {ref:"retain"}, an explicitly requested {ref:"scenario-scope"}, or {literal:...}. Omitted fields stay exact. Scope references never automatically repair other quantities.',parameters:obj({edit:editSchema})};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const isRef=(v:unknown,name:string)=>object(v)&&v.ref===name;
export function createReferencedDemandReview(raw:unknown,context:DemandContext,requestId:string,turns:DemandReview['basisTurns']){
 assertSolutionShape({spec:raw},reviewReferencedDemandTool.parameters,'referenced demand');
 const spec=structuredClone(raw) as Record<string,unknown>;
 if(isRef(spec.scope,'illustrative-service-role'))spec.scope=serviceIllustrationScope;
 for(const field of demandQuantityFields){const q=spec[field] as Record<string,unknown>;if(isRef(q.scope,'scenario-scope')){if(typeof spec.scope!=='string')throw Error('A scenario-scope reference requires an explicit role slice.');q.scope=spec.scope;}}
 return createDemandReview(spec,context,requestId,turns);
}
/** Issued per invocation/review step, never an authorization token. */
export function demandReferenceId(requestId:string,step:number){if(!requestId||requestId.length>100||!Number.isSafeInteger(step)||step<0||step>6)throw Error('Invalid demand reference identity.');return requestId+'/demand/'+step;}
export function referencedDemandView(review:DemandReview,context:DemandContext,reviewRef:string){
 const checked=readDemandReview(review,context);
 return {version:checked.version,intakeId:checked.intakeId,datasetToken:checked.datasetToken,requestId:checked.requestId,revision:checked.revision,reviewRef,spec:checked.spec,result:checked.result,scopeReferences:{scenarioScope:checked.spec.scope},projection:'Model view only; full review/key/turns retained server-side. Not a save payload.'};
}
export function reviseReferencedDemandReview(base:DemandReview,raw:unknown,context:DemandContext,requestId:string,turns:DemandReview['basisTurns'],currentTurnId:string,expectedRef:string){
 const source=readDemandReview(base,context);assertSolutionShape({edit:raw},reviseReferencedDemandTool.parameters,'referenced parameter edit');
 const edit=structuredClone(raw) as {reviewRef:string;changes:(Omit<DemandPatch['changes'][number],'quantity'>&{quantity:Record<string,unknown>|null})[]};
 if(edit.reviewRef!==expectedRef)throw Error('The current demand reference changed. Use the latest returned reviewRef.');
 const scopeEdit=edit.changes.find(c=>c.field==='scope'),scope=scopeEdit?scopeEdit.text:source.spec.scope;
 const changes=edit.changes.map(c=>{
  if(!demandQuantityFields.includes(c.field as DemandQuantityField))return c;
  const q=c.quantity!,prior=source.spec[c.field as DemandQuantityField];
  const targetScope=isRef(q.scope,'retain')?prior.scope:isRef(q.scope,'scenario-scope')?scope:(q.scope as {literal:string|null}).literal;
  if(isRef(q.scope,'scenario-scope')&&typeof targetScope!=='string')throw Error('Clarify the scenario scope before linking this quantity.');
  return {...c,quantity:{...prior,value:isRef(q.value,'retain')?prior.value:q.value,period:isRef(q.period,'retain')?prior.period:q.period,scope:targetScope,basis:c.basis}};
 });
 // The existing exact-key, quote, current-turn, distinct-field, unit and unknown
 // checks run after reference resolution. Resolution never mutates the source.
 return reviseDemandReview(source,{baseKey:source.key,changes},context,requestId,turns,currentTurnId);
}
export const demandReferenceInstructions=demandInstructions
 .replaceAll('review_service_demand','review_scoped_service_demand').replaceAll('revise_service_demand','revise_scoped_service_demand')
 .replace(/Once a demandProposal exists,[\s\S]*?(?=\nUse an ordinary)/,`Once a demandProposal exists, use revise_scoped_service_demand and copy its current code-issued reviewRef. Code retains the exact underlying review key. Supply one current-turn basis per edit; there is no nested duplicate basis. Omitted fields remain exact. Quantity value and period can use {ref:"retain"}; quantity scope must explicitly retain its existing value, use {ref:"scenario-scope"} when the user actually connects it to the current role slice, or supply a distinct literal. A scope edit never silently repairs other quantities. Initial scope may use {ref:"illustrative-service-role"} for the narrow supported fictional template; quantity scope may explicitly reference that scenario. Different scopes and missing dates stay unresolved until clarified. Do not invent a date or rename an unsupported role. New strategies cannot be smuggled into parameter edits. No editor unless requested.`);

/** Shared by the app route and separately authorized portable transports. */
export const demandReferenceModelContract={tools:[...solutionTools.filter(t=>['read_clock','read_evidence'].includes(t.name)),reviewReferencedDemandTool,reviseReferencedDemandTool],instructions:solutionConversationInstructions+'\n'+demandReferenceInstructions,responseFormat:solutionResponseFormat};
