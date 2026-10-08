// @ts-expect-error Native Node fixtures share TypeScript source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
// @ts-expect-error Native fixture tests share TypeScript source.
import {validDatasetToken} from './swp-input-identity.ts';
type DemandRequestIdentity={goalContext:unknown;goal:{id:string;statement:string}};
export const serviceIllustrationScope='Illustrative Service Analyst / client operations';
export const SWP_DEMAND_MODE='business-swp-demand-v1';
export type DemandBasis={kind:'user-supplied'|'model-proposed'|'illustrative'|'unknown';turnId:string|null;quote:string|null;explanation:string};
export type DemandQuantity={value:number|null;scope:string|null;period:'month'|'year'|'horizon'|null;basis:DemandBasis};
export const demandQuantityFields=['contracts','hoursPerContract','productiveHoursPerFte','existingRoles','existingFtePerRole','availabilityPct','ftePerRole','explicitAdditionalRoles','budgetUsd'] as const;
export type DemandQuantityField=typeof demandQuantityFields[number];
export type ServiceDemand={objective:string;objectiveTurnId:string;scope:string|null;scopeBasis:DemandBasis;linkageBasis:DemandBasis;startMonth:string|null;months:number|null;startBasis:DemandBasis;monthsBasis:DemandBasis;linkage:string|null}&Record<DemandQuantityField,DemandQuantity>;
export type DemandContext={conversationMode:typeof SWP_DEMAND_MODE;classification:'unverified-business-inputs';intakeId:string;datasetToken:string;boundGoal:{id:string;statement:string};revision:number;demandProposal?:DemandReview|null};
export type DemandReview={version:1;intakeId:string;datasetToken:string;requestId:string;revision:number;spec:ServiceDemand;basisTurns:{id:string;text:string}[];result:ReturnType<typeof calculateServiceDemand>;key:string};
type Schema={description?:string;type?:string;enum?:readonly unknown[];properties?:Record<string,Schema>;required?:string[];additionalProperties?:boolean;items?:Schema;maxItems?:number;minItems?:number;minLength?:number;maxLength?:number;minimum?:number;maximum?:number;anyOf?:Schema[]};
const str=(maxLength=240):Schema=>({type:'string',minLength:1,maxLength});
const nullable=(schema:Schema):Schema=>({anyOf:[schema,{type:'null'}]});
const obj=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const basisSchema=obj({kind:{type:'string',enum:['user-supplied','model-proposed','illustrative','unknown']},turnId:nullable(str(80)),quote:nullable(str(1000)),explanation:str(400)});
const rateFields:readonly DemandQuantityField[]=['hoursPerContract','productiveHoursPerFte'];
const countFields:readonly DemandQuantityField[]=['contracts','existingRoles','explicitAdditionalRoles'];
const quantityUnits:Record<DemandQuantityField,string>={contracts:'whole contracts in this scenario',hoursPerContract:'role-slice hours per contract',productiveHoursPerFte:'productive hours per FTE',existingRoles:'whole existing roles',existingFtePerRole:'FTE per existing role, from 0 to 1',availabilityPct:'available percentage, from 0 to 100',ftePerRole:'FTE per additional role, from 0 to 1',explicitAdditionalRoles:'whole additional roles',budgetUsd:'total scenario cash in USD'};
const periodGuidance='Only hoursPerContract and productiveHoursPerFte use period "month", "year" or "horizon" (null if the denominator is unresolved). For contracts, existingRoles, existingFtePerRole, availabilityPct, ftePerRole, explicitAdditionalRoles and budgetUsd, period must be null, including unknown values. Counts are whole scenario counts, FTE fractions are 0–1, availabilityPct is 0–100, and budgetUsd is total USD; do not annualize them.';
const quantitySchema=(field:DemandQuantityField):Schema=>({...obj({value:nullable({type:countFields.includes(field)?'integer':'number',minimum:0,maximum:['existingFtePerRole','ftePerRole'].includes(field)?1:field==='availabilityPct'?100:1e9}),scope:nullable(str()),period:rateFields.includes(field)?nullable({type:'string',enum:['month','year','horizon']}):{type:'null'},basis:basisSchema}),description:`${quantityUnits[field]}. ${rateFields.includes(field)?'State the hour-rate denominator; null means unresolved.':'period must be null; this is not a recurring rate.'}`});
export const serviceDemandSchema=obj({objective:str(),objectiveTurnId:str(80),scope:nullable(str()),scopeBasis:basisSchema,linkageBasis:basisSchema,startMonth:nullable(str(7)),months:nullable({type:'integer',minimum:1,maximum:24}),startBasis:basisSchema,monthsBasis:basisSchema,linkage:nullable(str(600)),...Object.fromEntries(demandQuantityFields.map(k=>[k,quantitySchema(k)]))});
export const serviceDemandTool={type:'function' as const,name:'review_service_demand',description:'Propose a business-to-effort bridge for one managed-services role slice. Missing effort/timing/capacity may use clearly labeled proposed assumptions. Never infer productive availability from workforce headcount, save a goal, or authorize staffing. Initial proposal only; use revise_service_demand for corrections. '+periodGuidance,strict:true,parameters:obj({spec:serviceDemandSchema})};
export const demandPatchSchema=obj({baseKey:str(60000),changes:{type:'array',minItems:1,maxItems:12,items:{anyOf:[...demandQuantityFields.map(field=>obj({field:{type:'string',enum:[field]},quantity:quantitySchema(field),number:{type:'null'},text:{type:'null'},basis:basisSchema})),...(['months','startMonth','scope','linkage'] as const).map(field=>obj({field:{type:'string',enum:[field]},quantity:{type:'null'},number:field==='months'?{type:'integer',minimum:1,maximum:24}:{type:'null'},text:field==='months'?{type:'null'}:str(600),basis:basisSchema}))]}}});
export type DemandPatch={baseKey:string;changes:{field:DemandQuantityField|'months'|'startMonth'|'scope'|'linkage';quantity:DemandQuantity|null;number:number|null;text:string|null;basis:DemandBasis}[]};
export const demandPatchTool={type:'function' as const,name:'revise_service_demand',description:'Change only named assumptions on the exact current demand review. Omitted values and provenance are retained. Each change requires the current user turn and quote. Do not rewrite strategy/objective or silently redefine the operational role slice. Scope/role changes need separate review of every affected quantity scope. '+periodGuidance,strict:true,parameters:obj({edit:demandPatchSchema})};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Explain invalid periods without changing a proposed value, basis or calculation. */
export function demandPeriodFeedback(toolName:string,args:unknown){
 if(!object(args))return null;
 const entries=toolName==='review_service_demand'&&object(args.spec)?demandQuantityFields.map(field=>({field,quantity:(args.spec as Record<string,unknown>)[field],path:`spec.${field}.period`})):
  toolName==='revise_service_demand'&&object(args.edit)&&Array.isArray(args.edit.changes)?args.edit.changes.flatMap((change,index)=>object(change)&&demandQuantityFields.includes(change.field as DemandQuantityField)?[{field:change.field as DemandQuantityField,quantity:change.quantity,path:`edit.changes[${index}].quantity.period`}]:[]):[];
 const invalidPeriods=entries.flatMap(({field,quantity,path})=>{
  if(!object(quantity))return [];
  const allowedPeriods:(string|null)[]=rateFields.includes(field)?['month','year','horizon',null]:[null];
  return allowedPeriods.includes(quantity.period as string|null)?[]:[{field,path,unit:quantityUnits[field],received:quantity.period===undefined?'missing':typeof quantity.period==='string'||quantity.period===null?quantity.period:'invalid type',allowedPeriods}];
 });
 return invalidPeriods.length?{ok:false,code:'invalid_demand_period',error:'Demand quantities have unsupported periods. No demand review was created or changed.',invalidPeriods,instruction:periodGuidance+' Review the intended units and submit a corrected tool call only within the remaining existing round/tool budget. Do not silently convert values or change provenance.'}:null;
}
export function demandContext(raw:unknown):DemandContext|null{
 if(!object(raw)||raw.conversationMode!==SWP_DEMAND_MODE)return null;
 if(raw.classification!=='unverified-business-inputs'||typeof raw.intakeId!=='string'||!/^swp-demand-[A-Za-z0-9-]{1,60}$/.test(raw.intakeId)||!validDatasetToken(raw.datasetToken)||!object(raw.boundGoal)||typeof raw.boundGoal.id!=='string'||typeof raw.boundGoal.statement!=='string'||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<1)throw Error('Invalid business demand context.');
 return raw as DemandContext;
}
export function requestDemandContext(request:DemandRequestIdentity,datasetToken:string):DemandContext|null{
 const c=demandContext(object(request.goalContext)?request.goalContext.scenarioReview:null);if(!c)return null;
 if(c.datasetToken!==datasetToken||JSON.stringify(c.boundGoal)!==JSON.stringify(request.goal))throw Error('Business goal or dataset changed.');return c;
}
function checkBasis(basis:DemandBasis,turns:{id:string;text:string}[]){
 if(basis.kind==='user-supplied'){const t=turns.find(t=>t.id===basis.turnId);if(!t||!basis.quote||!t.text.includes(basis.quote))throw Error('User interpretations require an exact quote from a supplied user turn.');}
 else if(basis.turnId!==null||basis.quote!==null)throw Error('Unknown or proposed assumptions cannot borrow user provenance.');
}
export function validateServiceDemand(raw:unknown,turns:{id:string;text:string}[]):ServiceDemand{
 assertSolutionShape(raw,serviceDemandSchema,'service demand');const s=structuredClone(raw) as ServiceDemand;
 if(!Array.isArray(turns)||turns.length>64||turns.some(t=>!t||typeof t.id!=='string'||typeof t.text!=='string'||t.text.length>10000)||!turns.some(t=>t.id===s.objectiveTurnId))throw Error('The objective needs a supplied user turn.');
 if(s.startMonth!==null&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s.startMonth)||Number(s.startMonth.slice(0,4))<2000))throw Error('Review a valid planning month.');
 for(const b of [s.startBasis,s.monthsBasis,s.scopeBasis,s.linkageBasis])checkBasis(b,turns);
 if((s.scope===null)!==(s.scopeBasis.kind==='unknown')||(s.linkage===null)!==(s.linkageBasis.kind==='unknown'))throw Error('Scope and operating linkage need their own provenance.');
 for(const k of demandQuantityFields){const q=s[k];if(!rateFields.includes(k)&&q.period!==null)throw Error(`${k}.period must be null: ${quantityUnits[k]} is not a recurring rate.`);checkBasis(q.basis,turns);if((q.value===null)!==(q.basis.kind==='unknown'))throw Error('Missing values must remain unknown; zero must be explicit.');}
 if(s.startMonth!==null&&s.startBasis.kind==='unknown'||s.months!==null&&s.monthsBasis.kind==='unknown')throw Error('Dates need a stated or proposed basis.');
 if(s.availabilityPct.value!==null&&s.availabilityPct.value>100||s.ftePerRole.value!==null&&s.ftePerRole.value>1||s.existingFtePerRole.value!==null&&s.existingFtePerRole.value>1)throw Error('Availability is 0–100%; FTE per role cannot exceed one.');
 for(const k of ['contracts','existingRoles','explicitAdditionalRoles'] as const)if(s[k].value!==null&&!Number.isSafeInteger(s[k].value))throw Error(`${k} is a whole count, not FTE.`);
 return s;
}
/** Explicit effort-rate conversion only; no source allocation or causal productivity model. */
export function calculateServiceDemand(s:ServiceDemand){
 const missing:string[]=[];if(!s.scope)missing.push('Clarify the operational role slice.');if(!s.startMonth||!s.months)missing.push('Review a proposed start and horizon.');if(!s.linkage)missing.push('Explain which contract work this role slice covers.');
 const needed=['contracts','hoursPerContract','productiveHoursPerFte','existingRoles','existingFtePerRole','availabilityPct','ftePerRole'] as const;
 for(const k of needed){if(s[k].value===null)missing.push(`Supply or propose ${k.replace(/([A-Z])/g,' $1').toLowerCase()}.`);else if(!s[k].scope||s[k].scope!==s.scope)missing.push(`${k}: use the same explicit role slice; source headcount is not productive availability.`);}
 for(const k of ['hoursPerContract','productiveHoursPerFte'] as const)if(!s[k].period)missing.push(`${k}: state month, year or whole-horizon hours. No hidden denominator conversion.`);
 if(s.productiveHoursPerFte.value!==null&&s.productiveHoursPerFte.value<=0||s.ftePerRole.value!==null&&s.ftePerRole.value<=0||s.existingFtePerRole.value!==null&&s.existingFtePerRole.value<=0)missing.push('Productive hours and FTE per role must be positive.');
 const common={missing:[...new Set(missing)],explicitStaffingPremise:s.explicitAdditionalRoles.value,budgetUsd:s.budgetUsd.value,sourceClass:'unverified-scenario-inputs' as const,limitations:['This is a narrow role slice of proposed managed-services contracts, not a complete engineering, security or project-management delivery plan.','Code-owned workforce/skills facts do not establish project allocations, productive hours or uncommitted availability.','Proposed and user-supplied inputs remain scenario assumptions after acceptance; they are not source-verified facts.','Average effort and capacity do not establish peaks, shift coverage, service levels, contract wins or causal productivity gains.']};
 if(missing.length)return {...common,status:'needs-inputs' as const,workloadHours:null,capacityHours:null,productiveHoursInHorizon:null,availableFte:null,gapHours:null,additionalFte:null,additionalRoles:null};
 const overHorizon=(q:DemandQuantity)=>q.value!*(q.period==='year'?s.months!/12:q.period==='month'?s.months!:1);
 const productiveHoursInHorizon=overHorizon(s.productiveHoursPerFte);if(productiveHoursInHorizon>s.months!*744)throw Error('Productive hours exceed all calendar hours; review the denominator.');
 const workloadHours=s.contracts.value!*overHorizon(s.hoursPerContract),availableFte=s.existingRoles.value!*s.existingFtePerRole.value!*s.availabilityPct.value!/100,capacityHours=availableFte*productiveHoursInHorizon,gapHours=Math.max(0,workloadHours-capacityHours),additionalFte=gapHours/productiveHoursInHorizon,additionalRoles=Math.max(0,Math.ceil(additionalFte/s.ftePerRole.value!-1e-10));
 if(![workloadHours,capacityHours,productiveHoursInHorizon,availableFte,gapHours,additionalFte,additionalRoles].every(Number.isFinite))throw Error('Workload calculation is not finite.');
 return {...common,status:'calculated' as const,workloadHours,capacityHours,productiveHoursInHorizon,availableFte,gapHours,additionalFte,additionalRoles};
}
export function createDemandReview(spec:unknown,context:DemandContext,requestId:string,turns:{id:string;text:string}[]):DemandReview{
 const checked=validateServiceDemand(spec,turns),base={version:1 as const,intakeId:context.intakeId,datasetToken:context.datasetToken,requestId,revision:context.revision,spec:checked,basisTurns:structuredClone(turns),result:calculateServiceDemand(checked)};return {...base,key:JSON.stringify(base)};
}
export function readDemandReview(raw:unknown,context:DemandContext):DemandReview{
 if(!object(raw)||raw.intakeId!==context.intakeId||raw.datasetToken!==context.datasetToken||raw.revision!==context.revision||typeof raw.requestId!=='string'||!Array.isArray(raw.basisTurns))throw Error('This demand review belongs to another decision.');
 const checked=createDemandReview(raw.spec,context,raw.requestId,raw.basisTurns as DemandReview['basisTurns']);if(JSON.stringify(raw)!==JSON.stringify(checked))throw Error('Demand calculation changed.');return checked;
}
export function reviseDemandReview(base:DemandReview,patch:unknown,context:DemandContext,requestId:string,turns:{id:string;text:string}[],currentTurnId:string){
 const source=readDemandReview(base,context);assertSolutionShape(patch,demandPatchSchema,'demand parameter edit');const p=patch as DemandPatch;
 if(p.baseKey!==source.key||new Set(p.changes.map(c=>c.field)).size!==p.changes.length)throw Error('The exact current demand review and distinct parameter targets are required.');
 const spec=structuredClone(source.spec),allTurns=[...new Map([...source.basisTurns,...turns].map(t=>[t.id,t])).values()];
 for(const c of p.changes){if(c.basis.kind!=='user-supplied'||c.basis.turnId!==currentTurnId)throw Error('Parameter changes require the current user turn.');checkBasis(c.basis,turns);
  if(demandQuantityFields.includes(c.field as DemandQuantityField)){if(!c.quantity||c.number!==null||c.text!==null||JSON.stringify(c.quantity.basis)!==JSON.stringify(c.basis))throw Error('Review one typed quantity and its current-turn basis.');spec[c.field as DemandQuantityField]=structuredClone(c.quantity);}
  else {if(c.quantity!==null)throw Error('Unsupported parameter edit.');if(c.field==='months'){if(c.number===null||c.text!==null)throw Error('Months requires a number.');spec.months=c.number;spec.monthsBasis=structuredClone(c.basis);}else{if(c.number!==null||c.text===null)throw Error('This parameter requires text.');spec[c.field as 'startMonth'|'scope'|'linkage']=c.text;if(c.field==='startMonth')spec.startBasis=structuredClone(c.basis);if(c.field==='scope')spec.scopeBasis=structuredClone(c.basis);if(c.field==='linkage')spec.linkageBasis=structuredClone(c.basis);}}
 }
 return createDemandReview(spec,context,requestId,allTurns);
}
export function illustrativeServiceReview(context:DemandContext,at:string):DemandReview{
 const scope=serviceIllustrationScope,basis:DemandBasis={kind:'illustrative',turnId:null,quote:null,explanation:'Invented planning premise for this narrow managed-services role slice; not project allocation data.'},q=(value:number|null,period:DemandQuantity['period']=null):DemandQuantity=>({value,scope,period,basis:value===null?{kind:'unknown',turnId:null,quote:null,explanation:'Not supplied.'}:basis});
 const text='Could we support two new managed-services contracts next year?',turns=[{id:'illustrative-service-objective',text}];
 return createDemandReview({objective:text,objectiveTurnId:turns[0].id,scope,scopeBasis:basis,linkageBasis:basis,startMonth:`${new Date(at).getUTCFullYear()+1}-01`,months:12,startBasis:basis,monthsBasis:basis,linkage:'Estimate only the service-analyst/client-operations effort of proposed contracts; technical delivery roles and service-level outcomes require separate review.',contracts:q(2),hoursPerContract:q(4000,'year'),productiveHoursPerFte:q(1600,'year'),existingRoles:q(0),existingFtePerRole:q(1),availabilityPct:q(0),ftePerRole:q(1),explicitAdditionalRoles:q(null),budgetUsd:q(null)},context,'illustrative-service-review',turns);
}
export const demandInstructions=`Discuss the user's business objective naturally. Ed's fictional organization delivers software/digital products, data/AI implementations and managed technology services. Do not require a three-plan prompt or mandatory form. Only the explicitly named scope 'Illustrative Service Analyst / client operations' can use the existing illustrative staffing template; other role slices can retain an effort-gap calculation but require their own cost/readiness assumptions before staffing comparison. One implemented bridge estimates a narrow service-analyst/client-operations slice for proposed managed-services contracts: contracts × role-slice effort versus explicitly proposed productive availability. Other AI bids, products, modernization or redeployment objectives can be discussed qualitatively; clarify essential ambiguity about intended work rather than pretending the single role slice covers all roles.
Offer reasonable, clearly labeled model-proposed planning assumptions when effort, timing or availability is missing. Use conservative assumptions such as no uncommitted capacity when it is unknown, rather than treating headcount as free capacity. Explain the short rationale; budget is optional until a cost decision needs it. Use read_clock for relative dates. review_service_demand prepares the initial provisional scenario; it may contain unknowns when units or intended work cannot yet be resolved. Proposed numbers never acquire user or source provenance. A reported measurement is still user-supplied. Code computes the gap and supports explicit annual/monthly/whole-horizon effort rates; dates and denominators must be visible.
${periodGuidance}
Once a demandProposal exists, use revise_service_demand with its exact key for natural corrections such as 'make that nine months' or 'assume 25% available'. Each typed change requires the current turn quote; preserve omitted values, provenance, role slice and uncertainty exactly. Clarify ambiguous 'four engineers' if the operational role slice or FTE conversion is unresolved; do not silently replace service analysts with a complete engineering plan. A scope edit leaves mismatched quantity scopes blocked until separately reviewed. No editor unless requested. A new strategy or different work cannot be smuggled into a parameter edit.
Use an ordinary concise answer and direct the user to the compact Using proposed assumptions card. 'Use your assumptions for now' means permission to use this scenario, not verification or operational approval. Only the UI performs that acceptance and any later plan save. Never claim it already happened. Existing capacity and internal moves must not be counted twice. Zero positive gap generates no staffing plan. Different provisional scenarios can have one or no feasible route; never pad three options. Service levels, contract wins, actual allocation, internal release, skills readiness, savings and automation gains remain unproven. Code-owned workforce evidence retains its own scope and does not supply operational effort/availability. The scoped tools do not create generic plans, headcount forecasts or observations; explain the boundary when needed.`;
