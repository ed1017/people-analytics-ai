// Pure record preparation only. Callers resolve stable identities and own storage
// transactions. No browser state, API, calculator duplication or hiring advice.
// @ts-expect-error Native Node tests share TypeScript source.
import {capacitySpec, emptyCapacityDraft, type CapacityDraft} from './swp-capacity-draft.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateMonthlyWorkload, monthlyWorkloadVersion, type MonthlyWorkloadSpec} from './swp-monthly-workload.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validDatasetToken} from './swp-input-identity.ts';
import {monthlyScenarioInputKey as key, monthlyScenarioAssumptionDifferences as diff} from './monthly-scenario-compatibility.mjs';

// @ts-expect-error Native Node tests share TypeScript source.
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey,type CapacityCost} from './swp-capacity-cost.ts';

type Result = ReturnType<typeof calculateMonthlyWorkload>;
/** These identities must come from the caller's active context, never inferred
 * from free text. scopeLabel/workUnit bind the stable ID to the reviewed draft.
 * Equality checks are not authorization or protection against coherent forgery.
 */
export type CapacityRecordBinding = {
  datasetToken:string; goalId:string; goal:string;
  scopeId:string; scopeLabel:string; workUnit:string;
};
type CapacityRecordBase = { kind:'monthly-workload-capacity';
  id:string; name:string; createdAt:string; binding:CapacityRecordBinding;
  calculatorVersion:typeof monthlyWorkloadVersion; inputKey:string;
  inputs:MonthlyWorkloadSpec; result:Result;
};
export type CapacityRecord=CapacityRecordBase & ({schemaVersion:1}|{schemaVersion:2;cost:CapacityCost});
type Session = {draft:CapacityDraft;result:Result|null;error:string;cost?:CapacityCost|null};
type Metadata = Pick<CapacityRecord,'id'|'name'|'createdAt'>;
const recordFields = ['schemaVersion','kind','id','name','createdAt','binding','calculatorVersion','inputKey','inputs','result'];
function requireValue(value:unknown,message:string):asserts value {if(!value)throw Error(message);}
function exact(raw:unknown, fields:string[], label:string):Record<string,unknown> {
  key(raw);
  requireValue(raw && Object.getPrototypeOf(raw)===Object.prototype && Object.keys(raw).sort().join('|')===[...fields].sort().join('|'), `Invalid ${label} fields.`);
  return raw as Record<string,unknown>;
}
function text(value:unknown,max:number):value is string {return typeof value==='string' && value===value.trim() && value.length>0 && value.length<=max;}
function identifier(value:unknown):value is string {return typeof value==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);}
function binding(raw:unknown):CapacityRecordBinding {
  const b=exact(raw,['datasetToken','goalId','goal','scopeId','scopeLabel','workUnit'],'binding');
  requireValue(validDatasetToken(b.datasetToken) && identifier(b.goalId) && identifier(b.scopeId) && text(b.goal,240) && text(b.scopeLabel,400) && text(b.workUnit,400),'Stable dataset, goal and scope binding is required.');
  return structuredClone(b) as CapacityRecordBinding;
}
function metadata(raw:unknown):Metadata {
  const m=exact(raw,['id','name','createdAt'],'record metadata');
  requireValue(identifier(m.id) && text(m.name,160) && typeof m.createdAt==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(m.createdAt) && Number.isFinite(Date.parse(m.createdAt)) && new Date(m.createdAt).toISOString()===m.createdAt,'Invalid record identity or timestamp.');
  return structuredClone(m) as Metadata;
}
function scopeMatches(inputs:MonthlyWorkloadSpec,b:CapacityRecordBinding) {
  // capacitySpec currently sets engine scope.id to its free-text label. Preserve
  // that exact calculation snapshot; the separate binding carries stable identity.
  requireValue(inputs.scope.kind==='workload-group' && inputs.scope.id===b.scopeLabel && inputs.scope.label===b.scopeLabel && inputs.scope.workUnit===b.workUnit,'Calculation scope does not match the resolved binding.');
}
function recalculate(inputs:unknown):Result {
  key(inputs); // Reject non-JSON/class/getter inputs before calculator traversal.
  const fresh=calculateMonthlyWorkload(inputs);
  requireValue(fresh.status==='calculated','Complete the missing assumptions before saving or comparing.');
  return fresh;
}
/** Recalculate from the current confirmed draft. Never re-key an old result.
 * Cosmetic numeric formatting and ignored hidden movement fields are not edits
 * to the normalized calculator inputs and therefore need not invalidate them.
 */
export function prepareCapacityRecord(session:Session,context:CapacityRecordBinding,meta:Metadata):CapacityRecord {
  exact(session,['draft','result','error',...(Object.hasOwn(session,'cost')?['cost']:[])],'session');
  requireValue(session.error==='' && session.result!==null,'A successful current calculation is required.');
  const hasCost=Object.hasOwn(session.draft,'costRate');
  const draft=exact(session.draft,[...Object.keys(emptyCapacityDraft),...(hasCost?['costRate']:[]),...(Object.hasOwn(session.draft,'sourceNote')?['sourceNote']:[])],'draft');
  if(hasCost)requireValue(typeof draft.costRate==='string','Invalid cost draft value type.');
  for(const field of Object.keys(emptyCapacityDraft)) requireValue(typeof draft[field]===typeof emptyCapacityDraft[field as keyof CapacityDraft], 'Invalid draft value type.');
  const b=binding(context),m=metadata(meta),inputs=capacitySpec(session.draft),fresh=recalculate(inputs);
  scopeMatches(inputs,b);
  requireValue(key(session.result.assumptions)===key(inputs),'Inputs changed after calculation; calculate again before saving.');
  requireValue(key(session.result)===key(fresh),'Calculated results changed; calculate again before saving.');
  const base={kind:'monthly-workload-capacity' as const,...m,binding:b,calculatorVersion:monthlyWorkloadVersion,inputs,result:fresh};
  if(hasCost){
    const cost=calculateCapacityCost(fresh,capacityCostAssumptions(session.draft.costRate!));
    requireValue(session.cost&&key(session.cost)===key(cost),'Cost inputs or results changed; calculate again before saving.');
    return structuredClone({...base,schemaVersion:2,cost,inputKey:capacityCalculationKey(fresh,cost)});
  }
  requireValue(session.cost==null,'Legacy capacity cannot carry a cost result.');
  return structuredClone({...base,schemaVersion:1,inputKey:key(inputs)});
}
/** Reload requires explicit expected context and recomputation. A record is a
 * verified historical snapshot; it is not automatically the current draft.
 */
export function readCapacityRecord(raw:unknown,expected:CapacityRecordBinding):CapacityRecord {
  key(raw);
  const version=(raw as CapacityRecord)?.schemaVersion;
  const record=exact(raw,[...recordFields,...(version===2?['cost']:[])],'capacity record'),b=binding(expected);
  requireValue((record.schemaVersion===1||record.schemaVersion===2) && record.kind==='monthly-workload-capacity' && record.calculatorVersion===monthlyWorkloadVersion,'Unsupported capacity record or calculator version.');
  requireValue(key(binding(record.binding))===key(b),'Saved record belongs to a different dataset, goal or scope.');
  metadata({id:record.id,name:record.name,createdAt:record.createdAt});
  const fresh=recalculate(record.inputs);
  scopeMatches(fresh.assumptions,b);
  let cost:CapacityCost|undefined;
  if(record.schemaVersion===2){
    const saved=exact(record.cost,['assumptions','points'],'cost result');
    cost=calculateCapacityCost(fresh,saved.assumptions as CapacityCost['assumptions']);
    requireValue(key(saved)===key(cost),'Saved cost does not match recomputed results.');
  }
  requireValue(record.inputKey===capacityCalculationKey(fresh,cost),'Saved calculation input key changed.');
  requireValue(key(record.result)===key(fresh),'Saved calculation does not match recomputed results.');
  return structuredClone({...record,inputs:fresh.assumptions,result:fresh}) as CapacityRecord;
}
/** To present a saved result as current, additionally check the current draft.
 * Reload validation alone only establishes a historical record's consistency.
 */
export function capacityRecordIsCurrent(raw:unknown,context:CapacityRecordBinding,draft:CapacityDraft):boolean {
  try {
    const record=readCapacityRecord(raw,context);
    const hasCost=Object.hasOwn(draft,'costRate');
    exact(draft,[...Object.keys(emptyCapacityDraft),...(hasCost?['costRate']:[]),...(Object.hasOwn(draft,'sourceNote')?['sourceNote']:[])],'draft');
    if(hasCost&&typeof draft.costRate!=='string')return false;
    for(const field of Object.keys(emptyCapacityDraft)) if(typeof draft[field as keyof CapacityDraft]!==typeof emptyCapacityDraft[field as keyof CapacityDraft])return false;
    const fresh=recalculate(capacitySpec(draft));
    if(record.schemaVersion===1)return (!hasCost||capacityCostAssumptions(draft.costRate!).rateCents===null)&&key(fresh.assumptions)===record.inputKey;
    if(!hasCost)return false;
    return capacityCalculationKey(fresh,calculateCapacityCost(fresh,capacityCostAssumptions(draft.costRate!)))===record.inputKey;
  } catch {return false;}
}
/** Both records are revalidated. Intentionally different scenario assumptions
 * are reported by month/field, never used as compatibility blockers.
 */
export function compareCapacityRecords(left:unknown,right:unknown,context:CapacityRecordBinding) {
  const a=readCapacityRecord(left,context),b=readCapacityRecord(right,context);
  const basis=(r:CapacityRecord)=>({calculatorVersion:r.calculatorVersion,scope:r.inputs.scope,asOf:r.inputs.opening.asOf,months:r.inputs.months.map(m=>m.month),accounting:r.inputs.accounting,units:r.result.units,gapConvention:r.result.gapConvention});
  const differences=diff(basis(a),basis(b));
  if(differences.length)return {compatible:false,differences,assumptionDifferences:[]};
  const assumptionDifferences=[
    ...diff(a.inputs.opening,b.inputs.opening).map(change=>({...change,path:'opening.'+change.field})),
    ...a.inputs.months.flatMap((month,index)=>diff(month,b.inputs.months[index]).map(change=>({...change,path:month.month+'.'+change.field}))),
  ];
  const ac=a.schemaVersion===2?a.cost:null,bc=b.schemaVersion===2?b.cost:null;
  const costBasis=(cost:CapacityCost)=>{return {...cost.assumptions,rateCents:null,basis:'unknown'};};
  const costCompatible=!!ac&&!!bc&&key(costBasis(ac))===key(costBasis(bc));
  const costComparison={compatible:costCompatible,leftRateCents:ac?.assumptions.rateCents??null,rightRateCents:bc?.assumptions.rateCents??null,points:a.result.points.map((p,i)=>{
    const left=ac?.points[i].runRateCents??null,right=bc?.points[i].runRateCents??null;
    return {month:p.month,leftCents:left,rightCents:right,deltaCents:costCompatible&&left!==null&&right!==null?right-left:null};
  })};
  return {compatible:true,differences,assumptionDifferences,costComparison};
}
