/** Explicitly authorized fictional-only live evaluation. No hosted route or DB. */
import OpenAI from 'openai';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openAIProxyTransport} from '../../lib/openai-proxy-transport.ts';
import {CHAT_MODEL} from '../../lib/chat-model.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {solutionConversationInstructions,solutionTools,solutionResponseFormat} from '../../lib/home-solution-conversation-schema.ts';
import {emptySolutionState,saveSolutionCandidate,readSolutionState} from '../../lib/home-solution-conversation.ts';
import {associatePlanProposal,packPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {reviewBundleProposal} from '../../lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../../lib/local-decisions.ts';
import {fictionalProvenance,fictionalScenarios,fictionalRequest,fictionalProjection,fictionalEvidence} from '../fixtures/fictional-solution-evaluation.mjs';
import {createEvaluationReservation,evaluationLimits} from '../helpers/solution-evaluation-budget.mjs';
import {liveBudget} from '../helpers/solution-live-budget.mjs';
const [directory,ledgerPath,expectedHead,...selected]=process.argv.slice(2);
if(!directory||!ledgerPath||!/^[a-f0-9]{40}$/.test(expectedHead??''))throw Error('New output directory, cumulative ledger and exact reviewed HEAD required.');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(head!==expectedHead)throw Error('Checkout HEAD changed.');
execFileSync('git',['diff','--exit-code',expectedHead,'--','app','components','lib'],{stdio:'pipe'});
if(CHAT_MODEL!=='gpt-5.6-luna')throw Error('Model changed.');
const out=resolve(directory);mkdirSync(out,{mode:0o700});
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const write=(name,value)=>{const text=JSON.stringify(value,null,2)+'\n',fd=openSync(join(out,name),'wx',0o600);try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}return hash(text);};
const scenarios=selected.length?fictionalScenarios.filter(item=>selected.includes(item.id)):fictionalScenarios;
if(!scenarios.length||selected.some(id=>!scenarios.some(item=>item.id===id)))throw Error('Unknown evaluation sequence.');
const manifest={mode:'real-model',applicationCommit:head,applicationTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),provenance:fictionalProvenance,scenarios,fixtureSourceSha256:hash(readFileSync(new URL('../fixtures/fictional-solution-evaluation.mjs',import.meta.url))),runnerSha256:hash(readFileSync(new URL(import.meta.url))),projection:fictionalProjection(),model:CHAT_MODEL,instructions:solutionConversationInstructions,tools:solutionTools,responseFormat:solutionResponseFormat,limits:evaluationLimits,serviceTier:'default',tokenCounts:'Exact provider count of identical token-relevant payload before every generation.',costBasis:{inputUsdPerMillion:.25,outputUsdPerMillion:1.2,tokenCountAllowance:'Conservative input-rate allowance; endpoint-specific billing not established.',generationReservations:'Full 200000 input + 5000 output envelope retained on success/failure.',totalTestingCeilingUsd:50,initialRunCeilingUsd:4.5},hostedAcceptanceCalls:0};
write('immutable-inputs.json',manifest);
const budget=liveBudget(resolve(ledgerPath),out,{preflightTokens:9278});
const report={...manifest,turns:[],generationCalls:0,tokenCountCalls:0,inputTokens:0,outputTokens:0,usageUpperEstimateUsd:0,checks:[],qualityStatus:'Pending semantic review of actual model output.'};
const guard=createEvaluationReservation({receipt:{model:CHAT_MODEL,standardTier:true,endpointRatesVerified:true,exactProviderTokenCountVerified:true,inputUsdPerMillion:.25,outputUsdPerMillion:1.2},persist:entries=>{const item=entries.at(-1);budget.reserve('generation',56000,{turnId:item.turnId,reservationId:item.id});write('reservation-'+String(item.id).padStart(3,'0')+'.json',item);}});
const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
const starts=[];let serial=0,abortRun=false;
async function pace(){while(starts.filter(time=>Date.now()-time<60000).length>=6){const active=starts.filter(time=>Date.now()-time<60000);await new Promise(resolve=>setTimeout(resolve,Math.min(15000,60010-(Date.now()-active[0]))));}starts.push(Date.now());}
const check=(name,passed)=>report.checks.push({name,passed:!!passed});
try{
 for(const scenario of scenarios){
  let state=emptySolutionState(),goal,catalog,contextLost=false;
  for(let index=0;index<scenario.turns.length;index++){
   if(abortRun)break;
   const request=await fictionalRequest(scenario,index,state,goal,catalog),before=hash(request),originals=hash(request.catalog),turnId=request.requestId,transcript=[];
   if(/https?:\/\/|@[A-Za-z0-9.-]+\.|(?:ghp_|github_pat_|sk-proj-)/.test(JSON.stringify(request)))throw Error('Unexpected external reference in fictional input.');
   const record={sequenceId:scenario.id,turn:index+1,contextLost,request,provider:transcript};
   try{
    const reply=await converseSolutions(request,{
     now:()=>new Date(fictionalProvenance.syntheticClock),loadProjection:async filters=>fictionalProjection(filters),
     complete:async(input,finalOnly,signal)=>{
      const id=String(++serial).padStart(3,'0'),payload={model:CHAT_MODEL,instructions:solutionConversationInstructions,input:structuredClone(input),tools:solutionTools,text:{format:solutionResponseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false};
      const entry={id,request:payload,finalOnly};transcript.push(entry);write('provider-'+id+'-request.json',payload);
      const counting=budget.reserve('token-count-allowance',50000,{turnId});await pace();report.tokenCountCalls++;
      let count;
      try{count=await client.responses.inputTokens.count(payload,{maxRetries:0,timeout:30000,signal});entry.exactCount=count;write('provider-'+id+'-count.json',count);if(count.object!=='response.input_tokens')throw Error('Unexpected token-count response.');budget.settleCount(counting,count.input_tokens);}
      catch(error){abortRun=true;entry.countError={name:error.constructor?.name,status:error.status??null};throw error;}
      await pace();const reservation=guard.reserve({turnId,inputTokenUpperBound:count.input_tokens,maxOutputTokens:5000});entry.reservationId=reservation.id;report.generationCalls++;
      try{
       const response=await client.responses.create({...payload,max_output_tokens:5000,service_tier:'default'},{maxRetries:0,timeout:30000,signal});
       entry.response=response;write('provider-'+id+'-response.json',response);guard.settle(reservation.id,response.usage);
       if(response.service_tier&&response.service_tier!=='default'){abortRun=true;throw Error('Unexpected provider service tier.');}
       report.inputTokens+=response.usage?.input_tokens??0;report.outputTokens+=response.usage?.output_tokens??0;report.usageUpperEstimateUsd=(report.inputTokens*.25+report.outputTokens*1.2)/1e6;
       return {completed:response.status==='completed',items:response.output,calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
      }catch(error){try{guard.settle(reservation.id);}catch{}entry.generationError={name:error.constructor?.name,status:error.status??null};if([401,403,429].includes(error.status))abortRun=true;throw error;}
     }
    },new AbortController().signal);
    record.reply=reply;state=reply.state;goal=request.goal;catalog=request.catalog;
    check(turnId+' input unchanged',hash(request)===before);if(scenario.saved)check(turnId+' originals unchanged',hash(catalog)===originals);
    if(scenario.selectAfterTurn===index+1){
     const item=state.working.findLast(value=>reply.candidateIds.includes(value.id));if(!item)throw Error('No reviewed candidate offered for intentional selection.');
     const desired={id:'selected-fictional-turnover',statement:item.candidate.goal.statement};
     const saved=await saveSolutionCandidate({...request,state},catalog,item,desired,fictionalEvidence(),true);
     catalog=associatePlanProposal(saved.catalog,saved.catalog,saved.plan.id,{inputKey:saved.plan.result.inputKey,attachmentId:saved.plan.requestId,at:fictionalProvenance.syntheticClock,acknowledgeUnknowns:true});
     state=structuredClone(state);for(const proposal of state.working){proposal.binding={...proposal.binding,goalId:desired.id,goal:desired.statement};if(proposal.draft){proposal.draft.binding=proposal.binding;if(proposal.draft.inputs.successMeasure)proposal.draft.inputs.successMeasure.goal=desired.statement;proposal.result=reviewBundleProposal(proposal.draft);}}
     state=readSolutionState(state);const values=new Map(),store=new DecisionStore();store.initialize({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
     store.commitGoalSelection(desired.id,desired.statement,store.getSnapshot().data.revision,fictionalProvenance.syntheticClock,()=>({homePlanAlternativesV1:packPlanAlternatives(catalog),homeSolutionConversationV1:state}));goal=desired;
     record.selection={goal,catalog,receipt:store.getSnapshot().data};check(turnId+' intentional pin and association',store.getSnapshot().data.goals.activeId===goal.id&&catalog.attachments.at(-1).purpose==='proposal-selection'&&!saved.plan.applied);
    }
    if(scenario.id==='same-people-correction')check(turnId+' exact shared people',state.working.at(-1)?.result.uniqueParticipants===[10,5,8][index]);
    if(scenario.id==='constraint-recovery'&&index===1)check(turnId+' cap removed and fee retained',state.working.at(-1)?.draft?.inputs.budget.amount.value===null&&state.working.at(-1)?.result.cashEstimate.cash===2000);
    if(scenario.id==='headcount-followup'&&index<2)check(turnId+' projection returned and reconciles',reply.analysisIds.length>0&&state.analyses.at(-1)?.points.every(p=>Math.abs(p.headcount-(p.opening+p.hires-p.exits+p.transfersIn-p.transfersOut))<1e-8));
    if(scenario.id==='headcount-followup'&&index===2)check(turnId+' scoped company defaults refused',reply.analysisIds.length===0);
   }catch(error){record.error={name:error.constructor?.name,message:error.status?'Provider request failed: HTTP '+error.status:error.message,status:error.status??null};contextLost=true;check(turnId+' completed',false);}
   const digest=write(turnId+'.json',record);report.turns.push({id:turnId,sha256:digest,providerRequests:transcript.length,completed:!!record.reply,error:record.error??null,contextLost});
   console.log(JSON.stringify({turn:turnId,completed:!!record.reply,error:record.error??null,generationCalls:report.generationCalls,usageUpperEstimateUsd:report.usageUpperEstimateUsd,reservedUsd:budget.totals().batch/1e6}));
  }
  if(abortRun)break;
 }
}finally{
 report.budget={...budget.totals(),generationReservedUsd:report.generationCalls*.056,remainingTotalUsd:(50000000-budget.totals().total)/1e6};report.stopped=abortRun;
 execFileSync('git',['diff','--exit-code',expectedHead,'--','app','components','lib'],{stdio:'pipe'});
 const digest=write('report.json',report);budget.close();console.log(JSON.stringify({reportSha256:digest,directory:out,turns:report.turns.length,generationCalls:report.generationCalls,tokenCountCalls:report.tokenCountCalls,usageUpperEstimateUsd:report.usageUpperEstimateUsd,budget:report.budget,stopped:abortRun}));
}
