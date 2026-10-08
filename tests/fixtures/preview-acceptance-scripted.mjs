/** Offline SDK double only. Scripted prose cannot establish model quality. */
import {candidate,based,retained,activity,quantity,constraint,final,evaluate,project,projectionSpec} from './home-solution-conversation.mjs';
const ref=(item,activityId)=>({kind:'working',id:item.id,revision:item.revision,...(activityId?{activityId}:{})});
const last=state=>state.working.at(-1);
function retainWorking(state){const old=last(state),c=candidate();c.base=ref(old);c.activities=old.candidate.activities.map(item=>({...item,mode:'retain',source:ref(old,item.id)}));return c;}
export function scriptedStepsFor(id,index,state){
 if(id==='clock-deadline'){
  if(index===0)return [{name:'read_clock',args:{}},final('It is 3:24 PM UTC, using the supplied clock.')];
  if(index===1)return [final('Manager support could surface workload obstacles earlier. That mechanism is a hypothesis; ask volunteers whether concerns lead to practical follow-up, while watching manager time.')];
  const c=based();c.quantities=[{...quantity('activity_finish',null,'YYYY-MM-DD','c1','user-3'),text:'2026-11-20'}];return [{name:'revise_parameters',args:{edit:{id:c.id,source:c.base,quantities:c.quantities},constraintUpdates:[]}},final('Here is a deadline revision for review; the saved plan is unchanged.',['mentoring'])];
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
