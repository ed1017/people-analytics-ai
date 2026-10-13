import {candidate,activity,quantity} from './home-solution-conversation.mjs';
// Synthetic quantity-scope fixtures. No live source packet or deployment receipt.
const proposed=(field,number,unit,target)=>({...quantity(field,number,unit,target,null),kind:'model-proposed',interpretation:field==='cash'?'Internal review without additional purchases; labor still consumes time.':'Unconfirmed pilot design choice; no availability or effect is established.'});
const unknown=(field,target)=>({...quantity(field,null,'text',target,null),kind:'unknown'});
export function failedTurnoverPilot(revision){
 const c=candidate('turnover-team-pilot');
 c.goal.statement='Reduce turnover in the team with the highest recorded voluntary turnover';
 c.activities=(revision===3?['c1']:['c1','c2','c3']).map((id,i)=>({...activity(id,['Verify priority team','Stay interviews and reversible experiment','Review and follow up'][i]),domain:i===1?'manager_workload':'execution',ownerRole:i===1?'HR business partner':'People Analytics lead'}));
 c.quantities=[proposed('horizon_months',2,'months',revision===1?null:revision===2?'all':'c1')];
 for(const a of c.activities){
  const sample=revision===3||a.id==='c2';
  c.quantities.push(proposed('participants',sample?10:2,'people',a.id),proposed('hours_per_participant',2,'hours/person/total',a.id),proposed('coordination_hours',revision===3?20:sample?12:2,'hours/total',a.id),proposed('cash',0,'USD',a.id));
 }
 c.quantities.push(...['population','success_baseline','success_target'].map(field=>unknown(field,revision===2?'all':null)));
 return c;
}
// A separately authored whole-plan estimate, not automatic normalization or summing
// of the three rejected payloads. Only the single-activity draft supports this example.
export function reviewedTurnoverPilot(){
 const c=failedTurnoverPilot(3);
 c.quantities=c.quantities.map(q=>['horizon_months','hours_per_participant','coordination_hours'].includes(q.field)?{...q,target:null}:q);
 return c;
}
