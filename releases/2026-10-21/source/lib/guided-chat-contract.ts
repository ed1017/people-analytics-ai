// @ts-expect-error Native fixtures share source.
import {assertSolutionShape} from './home-solution-conversation-schema.ts';
type Schema=Parameters<typeof assertSolutionShape>[1];
const text=(maxLength:number)=>({type:'string',minLength:1,maxLength});
const object=(properties:Record<string,Schema>)=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const list=(maxItems:number)=>({type:'array',maxItems,items:text(500)});
/** In-band intent/result contract, not an additional classifier or model round. */
const recommendationSchema=object({name:text(160),rationale:text(1000),steps:{...list(4),minItems:1},assumptions:list(6),caveats:list(4)});
export const guidedChatAnswerSchema={anyOf:[object({discussion:text(10000)}),object({recommendation:recommendationSchema}),object({unsupportedPlan:object({decision:text(800),nextStep:text(800),reason:text(1000)})}),object({alternatives:object({recommendedIndex:{type:'integer',minimum:0,maximum:3},plans:{type:'array',minItems:2,maxItems:4,items:recommendationSchema}})})]};
export const guidedChatAnswerInstructions='Return answer as a typed outcome: discussion only for factual/explanation/no-plan requests; recommendation with concrete steps, assumptions and caveats for planning; or unsupportedPlan identifying the exact unsupported decision, reason and a concrete nextStep. A question or unknowns list alone is not planning completion. Use one recommendation by default; use alternatives with separate plans and a recommendedIndex only when explicitly requested. Numeric claims retain the current deterministic tool/result basis; this response does not save a plan.';
export function renderGuidedChatAnswer(raw:unknown):string{
 assertSolutionShape(raw,guidedChatAnswerSchema,'guided answer');
 const value=raw as {discussion?:string;recommendation?:{name:string;rationale:string;steps:string[];assumptions:string[];caveats:string[]};unsupportedPlan?:{decision:string;nextStep:string;reason:string};alternatives?:{recommendedIndex:number;plans:Array<{name:string;rationale:string;steps:string[];assumptions:string[];caveats:string[]}>}};
 if(value.discussion!==undefined)return value.discussion;
 if(value.unsupportedPlan){const p=value.unsupportedPlan;return `${p.reason}\n\nDecision needed: ${p.decision}\n\nNext step: ${p.nextStep}`;}
 if(value.alternatives){const a=value.alternatives;if(a.recommendedIndex>=a.plans.length)throw Error('The recommended alternative is unavailable.');return a.plans.map((p,index)=>(index===a.recommendedIndex?'Recommended alternative: ':'Alternative: ')+renderGuidedChatAnswer({recommendation:p})).join('\n\n');}
 const p=value.recommendation!;return [`Recommended plan: ${p.name}`,p.rationale,...p.steps.map((step,index)=>`${index+1}. ${step}`),...p.assumptions.map(a=>'Assumption: '+a),...p.caveats.map(a=>'Caveat: '+a)].join('\n\n');
}
type Format={text?:{format:{type:'json_schema';name:string;strict:boolean;schema:Record<string,unknown>}}};
export function guidedChatContract<T>(original:Format,reply:(text:string,status?:string)=>T,enabled:boolean){
 if(!enabled)return {format:original,instructions:'',reply};
 const schema=original.text?.format.schema;
 const format={text:{format:{type:'json_schema' as const,name:'guided_chat_reply',strict:true,schema:schema?{...schema,properties:{...(schema.properties as Record<string,unknown>),answer:guidedChatAnswerSchema}}:object({answer:guidedChatAnswerSchema})}}};
 return {format,instructions:guidedChatAnswerInstructions,reply:(raw:string,status?:string)=>{
  if(status!=='completed')throw Error('The guided response is incomplete; no answer was saved.');
  const body=JSON.parse(raw);assertSolutionShape(body,format.text.format.schema as Schema,'guided reply');
  const answer=renderGuidedChatAnswer(body.answer);return reply(schema?JSON.stringify({...body,answer}):answer,status);
 }};
}
