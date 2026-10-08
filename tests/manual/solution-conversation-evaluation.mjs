/** Network-free evaluation rehearsal. The separately authorized live runner
 * pins source provenance and counts exact provider inputs before generation.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {solutionRequest,candidate,based,retained,activity,quantity,constraint,final,evaluate,project,projectionSpec,projectionInputs,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {saveSolutionCandidate,readSolutionState} from '../../lib/home-solution-conversation.ts';
import {associatePlanProposal,packPlanAlternatives,readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {DecisionStore} from '../../lib/local-decisions.ts';
import {reviewBundleProposal} from '../../lib/home-bundle-reconciliation.ts';
import {solutionConversationInstructions,solutionTools,solutionResponseFormat} from '../../lib/home-solution-conversation-schema.ts';
import {buildHomePack} from '../../lib/home-pack.mjs';
import {evaluationLimits,createEvaluationReservation} from '../helpers/solution-evaluation-budget.mjs';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const frozen=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(frozen);}return value;};
const ref=(item,activityId)=>({kind:'working',id:item.id,revision:item.revision,...(activityId?{activityId}:{})});
const last=state=>state.working.at(-1);
function retainWorking(state){const old=last(state),c=candidate();c.base=ref(old);c.activities=old.candidate.activities.map(item=>({...item,mode:'retain',source:ref(old,item.id)}));return c;}
function stepsFor(id,index,state){
 if(id==='clock-deadline'){
  if(index===0)return [{name:'read_clock',args:{}},final('It is 3:24 PM UTC, using the supplied clock.')];
  if(index===1)return [final('Manager support could surface workload obstacles earlier. That mechanism is a hypothesis; ask volunteers whether concerns lead to practical follow-up, while watching manager time.')];
  const c=based();c.quantities=[{...quantity('activity_finish',null,'YYYY-MM-DD','c1','user-3'),text:'2026-11-20'}];return [evaluate(c),final('Here is a deadline revision for review; the saved plan is unchanged.',['mentoring'])];
 }
 if(id==='goal-select-refine'){
  const c=index?retainWorking(state):candidate();
  if(index===0){c.name='Friction diary and follow-through';c.objective='Run a voluntary friction diary trial';c.approach='Collect small recurring obstacles and test one fix chosen by volunteers.';c.rationale='Small unresolved obstacles may undermine confidence that feedback matters. A diary can make follow-through visible; effectiveness is unproven.';c.activities=[{...activity('c1','Voluntary friction diary'),domain:'execution',step:'Invite volunteers to record one avoidable obstacle, choose a reversible fix and check whether it helped.',ownerRole:'Volunteer coordinator'}];}
  else {c.name='Friction diary and follow-through';c.activities[0]={...c.activities[0],mode:'adapt',name:index===1?'Volunteer-led friction diary':'Peer check-ins',step:index===1?'Volunteers choose a coordinator and one obstacle to address, without manager workshops.':'Volunteers use brief peer check-ins to surface obstacles and review a reversible response.',ownerRole:'Volunteer coordinator'};}
  return [evaluate(c),final(index?'Here is a revised voluntary approach. Its resources and effects still need review.':'Try a voluntary friction diary with visible follow-through. It goes beyond a workshop, but its value needs testing.',['mentoring'])];
 }
 if(id==='blend-replace'){
  const c=index?retainWorking(state):based();if(index===0)c.activities.push(retained('B','c2'));
  if(index===1)c.activities[0]={...c.activities[0],mode:'adapt',name:'Open office hour',step:'Invite staff to bring one current obstacle to a voluntary open office hour.'};
  return [evaluate(c),final('The learning activity stays. Connect discussion of current obstacles to a practice opportunity; confirm time and participant overlap before acting.',['mentoring'])];
 }
 if(id==='same-people-correction'){
  const c=index?retainWorking(state):based();if(index===0)c.activities.push({...retained('B','c2'),audienceOf:'c1'});
  if(index===1)c.quantities=[{...quantity('participants',null,'people','all','user-2'),kind:'scale',source:{...c.base,field:'participants',target:'c1'},factor:.5}];
  if(index===2)c.quantities=[quantity('participants',8,'people','all','user-3')];
  const result=final('Both activities use the same reviewed participant group.',['mentoring']);result.verifiedMetrics=[{kind:'candidate',id:'mentoring',revision:index+1,metric:'participants'}];return [evaluate(c),result];
 }
 if(id==='constraint-recovery'){
  if(index===0){const fixed=based();fixed.quantities=[quantity('cash',2000,'USD','c1')];return [evaluate(based(),[constraint(2500)]),evaluate(fixed),final('The reviewed fee revision fits the known ceiling. Other assumptions remain subject to review.',['mentoring'])];}
  if(index===1)return [evaluate(retainWorking(state),[{...constraint(null,'user-2'),action:'remove'}]),final('The cap is removed; the proposed fee remains.',['mentoring'])];
  return [final('We cannot establish savings or improved retention from a proposed fee. It is a planning assumption, not an observed counterfactual. Review outcomes against a baseline before claiming an effect.')];
 }
 if(id==='headcount-followup'){
  const spec=projectionSpec();if(index===1){spec.base={id:'headcount',revision:1};spec.changes=[{field:'fill_rate_pct',kind:'scale',value:.5,basis:'user',turnId:'user-2',interpretation:'Half the prior fill rate, as requested.'}];}
  if(index===2)return [project(spec),final('Company-wide defaults cannot establish an Engineering scenario. Supply scoped monthly external hires, exits and transfers; the existing company scenario remains available for reference.')];
  const result=final('This is a stock-flow scenario under explicit assumptions, not a trained prediction.',[],['headcount']);result.verifiedMetrics=[{kind:'projection',id:'headcount',revision:index+1,metric:'closing_headcount'}];return [project(spec),result];
 }
 throw Error('Unknown fixed sequence');
}
export const scoringRubric={
 usefulCreativeReasoning:'0: empty/menu-bound or unsupported; 1: generic; 2: plausible mechanism; 3: useful novel approach with tradeoffs; 4: tailored creative reasoning plus a practical learning step.',
 conversationContinuity:'0: loses goal/reference; 1: partial repetition; 2: carries goal; 3: resolves references and corrections; 4: preserves intent, constraints and rejected ideas across all turns.',
 numericalHonesty:'0: invented quantity/effect or false verification; 1: hidden assumptions; 2: some limits; 3: exact reviewed inputs and honest unknowns; 4: fully traceable quantities with observations, assumptions and results distinguished.',
 projectionBehavior:'0: fabricated forecast or scope; 1: incomplete source boundary; 2: disclosed scenario; 3: reconciled flows and follow-up; 4: exact lineage, scoped boundaries and useful explanation of missing data.',
 intentionalSelection:'0: discussion saves or required goal-first flow; 1: unclear commit action; 2: selection works; 3: goal and association atomic with unknowns; 4: persistence, idempotency, cancellation and existing work preserved.'
};
export function scoreReview(review,report){
 if(report.mode!=='real-model')throw Error('Scripted fixture output cannot establish real-model quality scores.');
 const values=Object.keys(scoringRubric).map(key=>{const item=review[key];if(!Number.isInteger(item?.score)||item.score<0||item.score>4||typeof item.rationale!=='string'||!item.rationale.trim()||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.some(digest=>!report.turns.some(turn=>turn.sha256===digest)))throw Error('Every quality score needs a rationale and exact captured-turn evidence.');return item.score;});
 return {score:values.reduce((a,b)=>a+b,0),possible:20,accepted:values.every(value=>value>=3)&&review.hardFailure===false};
}
export async function rehearse(output){
 const out=resolve(output);mkdirSync(out,{mode:0o700}); // Refuse an existing run directory: never overwrite evidence.
 const manifest=JSON.parse(readFileSync(new URL('../fixtures/solution-evaluation-sequences.json',import.meta.url),'utf8'));
 const checkoutHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),applicationCommit=checkoutHead;
 // Offline rehearsals may exercise local edits; identify them instead of claiming
 // the old fixture-design commit is the running source. Live evaluation stays pinned.
 const applicationDiffSha256=hash(execFileSync('git',['diff','HEAD','--','app','components','lib'],{encoding:'utf8'}));
 const evidence=buildHomePack({dashboard:{status:'loaded',data:{overview:{snapshot_date:'2026-08-31',headcount:100,fte:98,open_positions:3}}},attrition:{status:'loaded',data:{as_of:'2026-08-31',summary:{total_exits:12,voluntary_exits:9,voluntary_turnover_ytd_pct:9}}}},'All company','Reduce turnover');
 const immutable=frozen({manifest,applicationCommit,applicationDiffSha256,evidence,projection:projectionInputs(),model:'gpt-5.6-luna',instructions:solutionConversationInstructions,tools:solutionTools,responseFormat:solutionResponseFormat});const fixtureHash=hash(immutable);
 const write=(name,value)=>{const content=JSON.stringify(value,null,2)+'\n';writeFileSync(join(out,name),content,{flag:'wx',mode:0o600});return hash(content);};const immutableFileHash=write('immutable-inputs.json',immutable);
 const priorFetch=globalThis.fetch;let networkAttempts=0;globalThis.fetch=()=>{networkAttempts++;throw Error('Network access prohibited in fixture rehearsal.');};
 let virtualTime=0;const journal=[];
 const simulatedReceipt={model:'gpt-5.6-luna',standardTier:true,endpointRatesVerified:true,localTokenUpperBoundVerified:true,inputUsdPerMillion:.25,outputUsdPerMillion:1.2};
 const budget=createEvaluationReservation({receipt:simulatedReceipt,now:()=>virtualTime,persist:entries=>{const entry=entries.at(-1);const fd=openSync(join(out,`reservation-${String(entry.id).padStart(3,'0')}.json`),'wx',0o600);try{writeFileSync(fd,JSON.stringify({...entry,simulationOnly:true,tokenBound:'Hypothetical 200000-token envelope; not a measured or verified provider count.'})+'\n');fsyncSync(fd);}finally{closeSync(fd);}journal.push(entry);}});
 const report={mode:'fixtures',applicationCommit,checkoutHead,immutableInputsSha256:immutableFileHash,providerCalls:0,providerTokenCountCalls:0,networkAttempts:0,turns:[],checks:[],qualityScores:null,qualityStatus:'Not assessed: scripted fixtures are not real-model responses.',rubric:scoringRubric,limits:evaluationLimits,paidExecutionReady:false,blockers:['This offline runner cannot establish provider access, actual model quality or usage. Use the separately authorized live runner with its access, provenance and budget checks.']};
 const check=(name,pass)=>{assert.ok(pass,name);report.checks.push({name,passed:true});};
 try{for(const sequence of manifest.sequences){
  let request=solutionRequest(sequence.turns[0],sequence.saved),state=request.state,goal=request.goal,catalog=request.catalog;const originals=hash(catalog);
  for(let index=0;index<3;index++){
   request=solutionRequest(sequence.turns[index],false,state,index+1);request.requestId=sequence.id+'-'+(index+1);request.goal=goal;request.catalog=catalog;request.selectedId=catalog?.order[0]??null;request.evidence=structuredClone(evidence);
   if(sequence.id==='headcount-followup'&&index===2){request.filters={country:'all',org:'ENG',level:'all'};request.scope='Engineering';}
   const before=hash(request),turnId=request.requestId,runtime=fixtureRuntime(stepsFor(sequence.id,index,state),projectionInputs(request.filters)),transcript=[];
   runtime.now=()=>new Date(manifest.fixtureClockUtc);const complete=runtime.complete;
   runtime.complete=async(input,finalOnly,signal)=>{
    virtualTime+=11000;const reservation=budget.reserve({turnId,inputTokenUpperBound:200000,maxOutputTokens:5000});
    const payload={model:immutable.model,instructions:immutable.instructions,input,tools:immutable.tools,text:{format:immutable.responseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000};
    try{const reply=await complete(input,finalOnly,signal);transcript.push({reservationId:reservation.id,request:structuredClone(payload),requestUtf8Bytes:bytes(payload),verifiedInputTokens:null,response:structuredClone(reply)});budget.settle(reservation.id);return reply;}catch(error){budget.settle(reservation.id);throw error;}
   };
   const reply=await converseSolutions(request,runtime,new AbortController().signal);check(turnId+' input preserved',hash(request)===before);check(turnId+' immutable evidence preserved',hash(immutable)===fixtureHash);check(turnId+' context continuity',reply.state.turns.length===(index+1)*2);
   const record={sequenceId:sequence.id,turn:index+1,request,providerSimulation:transcript,reply};const digest=write(turnId+'.json',record);report.turns.push({id:turnId,sha256:digest,simulatedRequests:transcript.length,maxRequestUtf8Bytes:Math.max(...transcript.map(item=>item.requestUtf8Bytes)),verifiedInputTokens:null});state=reply.state;
   if(sequence.selectAfterTurn===index+1){
    check(turnId+' no automatic goal/catalog',!goal.id&&catalog===null);const item=last(state),desired={id:'selected-turnover',statement:item.candidate.goal.statement};const saved=await saveSolutionCandidate({...request,state},catalog,item,desired,evidence,true);catalog=associatePlanProposal(saved.catalog,saved.catalog,saved.plan.id,{inputKey:saved.plan.result.inputKey,attachmentId:saved.plan.requestId,at:manifest.fixtureClockUtc,acknowledgeUnknowns:true});
    state=structuredClone(state);for(const proposal of state.working){proposal.binding={...proposal.binding,goalId:desired.id,goal:desired.statement};if(proposal.draft){proposal.draft.binding=proposal.binding;if(proposal.draft.inputs.successMeasure)proposal.draft.inputs.successMeasure.goal=desired.statement;proposal.result=reviewBundleProposal(proposal.draft);}}
    state=readSolutionState(state);const values=new Map(),store=new DecisionStore();store.initialize({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});store.commitGoalSelection(desired.id,desired.statement,store.getSnapshot().data.revision,manifest.fixtureClockUtc,()=>({homePlanAlternativesV1:packPlanAlternatives(catalog),homeSolutionConversationV1:state}));goal=desired;
    check(turnId+' selection pins desired outcome with qualitative association',store.getSnapshot().data.goals.activeId===goal.id&&goal.statement==='Reduce turnover'&&catalog.attachments[0].purpose==='proposal-selection'&&catalog.plans[0].result.calculationStatus==='awaiting-scope'&&!catalog.plans[0].applied);write(turnId+'-selection.json',{goal,catalog,state,receipt:store.getSnapshot().data});
   }
   if(sequence.id==='same-people-correction')check(turnId+' exact shared people',last(state).result.uniqueParticipants===[10,5,8][index]);
   if(sequence.id==='constraint-recovery'&&index===1)check(turnId+' cap removed without losing fee',last(state).draft.inputs.budget.amount.value===null&&last(state).result.cashEstimate.cash===2000);
   if(sequence.id==='headcount-followup'&&index<2)check(turnId+' reconciled projection',state.analyses.at(-1).points.every(p=>Math.abs(p.headcount-(p.opening+p.hires-p.exits+p.transfersIn-p.transfersOut))<1e-8));
   if(sequence.id==='headcount-followup'&&index===2)check(turnId+' scoped limitation keeps earlier analysis',state.analyses.length===2&&reply.analysisIds.length===0&&transcript.some(item=>JSON.stringify(item.request).includes('company-wide')));
   if(sequence.saved)check(turnId+' original saved plans unchanged',hash(catalog)===originals);
   if(catalog)check(turnId+' catalog reload verifies',!!readPlanAlternatives(JSON.parse(JSON.stringify(catalog)),catalog));
  }
 }}finally{globalThis.fetch=priorFetch;report.networkAttempts=networkAttempts;}
 check('No network or provider calls',networkAttempts===0);report.simulatedRequests=journal.length;report.simulatedReservedUsd=journal.reduce((sum,item)=>sum+item.reservedMicrousd,0)/1e6;report.actualSpendUsd=0;report.mechanicalScore={passed:report.checks.length,total:report.checks.length};const reportFileHash=write('report.json',report);
 write('review-template.json',{reportSha256:reportFileHash,qualityScores:Object.fromEntries(Object.keys(scoringRubric).map(key=>[key,{score:null,rationale:'',evidence:[]}])),hardFailure:null,rule:'Only score actual model output with exact captured-turn hashes. Fixtures cannot establish acceptance.'});
 return {directory:out,reportSha256:reportFileHash,immutableInputsSha256:immutableFileHash,turns:report.turns.length,simulatedRequests:report.simulatedRequests,simulatedReservedUsd:report.simulatedReservedUsd,actualSpendUsd:0,mechanicalScore:report.mechanicalScore,paidExecutionReady:false,blockers:report.blockers};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,output]=process.argv.slice(2);if(mode!=='--fixtures'||!output)throw Error('This runner is network-free. Only --fixtures NEW_OUTPUT_DIRECTORY is supported.');
 console.log(JSON.stringify(await rehearse(output),null,2));
}
