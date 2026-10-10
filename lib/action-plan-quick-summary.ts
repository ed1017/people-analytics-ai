import type {BundleDraft,BundleResult} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey} from './home-bundle-reconciliation.ts';
const known=(value:number|null|undefined):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
/** Presentation of one checked result only; never combines plans or recalculates costs. */
export function actionPlanQuickSummary(draft:BundleDraft|null,result?:BundleResult|null){
 const current=!!draft&&!!result&&result.inputKey===bundleInputKey(draft)&&result.calculationStatus!=='awaiting-scope'&&result.scope.currency==='USD'&&JSON.stringify(result.scope)===JSON.stringify(draft.inputs.scope);
 const checked=current?result:null;
 const estimate=checked?.cashEstimate;
 const complete=estimate?estimate.coverage==='reviewed'&&known(estimate.cash):known(checked?.cashTotal);
 const cash=complete?(estimate?.cash??checked?.cashTotal??null):null;
 const subtotal=estimate?.coverage==='partial'&&known(estimate.cash)?estimate.cash:null;
 const priority=['capacity:trainingCash','capacity:hireStaffingCost','capacity:recruitingFees'];
 const rank=(id:string)=>priority.includes(id)?priority.indexOf(id):priority.length;
 const costs=checked?.ledger.filter(row=>row.kind==='cash').map(row=>({id:row.id,label:row.label,value:known(row.total)?row.total:null})).sort((a,b)=>rank(a.id)-rank(b.id))??[];
 // A bar is a share of this plan's complete cash total, never a share of a partial subtotal.
 const chart=known(cash)&&cash>0&&costs.length>1&&costs.every(row=>row.value!==null)&&Math.abs(costs.reduce((sum,row)=>sum+row.value!,0)-cash)<.005;
 const coverage=checked?.conditionalCoverage,startMonth=checked?.scope.startMonth.value;
 const capacitySeries=coverage&&coverage.length>=2&&coverage.length===checked?.scope.months.value&&coverage.every(known)&&startMonth&&/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)?coverage.map((people,index)=>{const month=Number(startMonth.slice(0,4))*12+Number(startMonth.slice(5))-1+index;return {month:`${Math.floor(month/12)}-${String(month%12+1).padStart(2,'0')}`,people:people!};}):[];
 const timing=current?draft!.inputs.timing:[];
 const starts=timing.map(row=>row.start.value),start=starts.length&&starts.every(Boolean)?[...starts as string[]].sort()[0]:null;
 const finish=checked?.planFinish??null;
 const first=start?Date.parse(start+'T00:00:00Z'):NaN,last=finish?Date.parse(finish+'T00:00:00Z'):NaN;
 const days=Number.isFinite(first)&&Number.isFinite(last)&&last>=first?Math.round((last-first)/86400000)+1:null;
 return {cash,subtotal,costs,chart,capacitySeries,demand:known(checked?.scope.demand.value)?checked.scope.demand.value:null,coverage:complete?'reviewed':subtotal!==null?'partial':'unknown',start,finish,days,
  dateCount:timing.filter(row=>row.start.value&&row.finish.value).length,activityCount:draft?.bundle.components.length??0,
  months:checked?.scope.months.value??null,people:known(checked?.uniqueParticipants)?checked.uniqueParticipants:null,
  deliveryHours:known(checked?.deliveryEstimate?.hours)?checked.deliveryEstimate.hours:null,
  staffingHoursSeparate:!!draft?.inputs.capacity,fte:null,current};
}
