/** Synthetic deterministic completion only. Never calls a model, server or DB. */
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {demandQuantityFields} from '../../lib/swp-demand.ts';
import {fixture,openerRequest,bindClarificationReply} from './swp-reference-continuation.mjs';
import {runReferenceContinuation} from '../helpers/swp-reference-continuation.mjs';
import {periodFailureSpec} from './swp-demand-period-failures.mjs';
import {fixtureRuntime,final} from './home-solution-conversation.mjs';
const retain={ref:'retain'},signal=()=>new AbortController().signal;
async function anchor(){return bindClarificationReply(await converseSolutions(openerRequest(),{...fixtureRuntime([final('Which client work will these contracts cover?')]),demand:{datasetToken:fixture.datasetToken}},signal()));}
async function lane({hours=40,productive=120,unknownProductivity=false,recordHook=()=>{},suppliedAnchor=null}={}){
 const preserved=suppliedAnchor??await anchor(),runtimes=new Map(),events=[],contexts=[];
 const result=await runReferenceContinuation({anchor:preserved,record:async e=>{await recordHook(e);events.push(e);},complete:async({index,request,input,finalOnly})=>{
  if(runtimes.has(index))return runtimes.get(index).complete(input,finalOnly);
  const data=JSON.parse(input[0].content.split('\n').slice(1).join('\n'));contexts.push(data);
  const prior=data.goalContext.scenarioReview.demandProposal,basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit fictional user turn; not measured operations.'};let tool;
  if(index===0){const spec=periodFailureSpec('horizon-totals',request.goalContext.scenarioReview);for(const f of demandQuantityFields)if(!['hoursPerContract','productiveHoursPerFte'].includes(f))spec[f].period=null;spec.startMonth=null;spec.startBasis={kind:'unknown',turnId:null,quote:null,explanation:'Start not supplied.'};spec.scope={ref:'illustrative-service-role'};for(const f of demandQuantityFields)spec[f].scope={ref:'scenario-scope'};spec.contracts.scope='Contract work whose role scope still needs clarification';spec.hoursPerContract.value=hours;spec.productiveHoursPerFte.value=productive;if(unknownProductivity){spec.productiveHoursPerFte.value=null;spec.productiveHoursPerFte.basis={kind:'unknown',turnId:null,quote:null,explanation:'Still unresolved.'};}tool={name:'review_scoped_service_demand',args:{spec}};}
  else {const changes=index===1?[{field:'months',quantity:null,number:9,text:null,basis}]:index===2?['existingRoles','availabilityPct'].map(field=>({field,quantity:{value:field==='existingRoles'?4:25,period:retain,scope:retain},number:null,text:null,basis})):[{field:'startMonth',quantity:null,number:null,text:'2027-01',basis},{field:'contracts',quantity:{value:retain,period:retain,scope:{ref:'scenario-scope'}},number:null,text:null,basis}];tool={name:'revise_scoped_service_demand',args:{edit:{reviewRef:prior.reviewRef,changes}}};}
  const r=fixtureRuntime([tool,final(index===2?'The edits are retained. What start month should we use, and do the contracts cover this same role slice?':'Review the scenario assumptions and remaining limitations.')]);runtimes.set(index,r);return r.complete(input,finalOnly);
 }});return {result,events,contexts,preserved};
}
export {lane,anchor};
