// @ts-expect-error Native Node tests share the TypeScript source.
import {normalizeHomeMonthlyRows} from './home-monthly-evidence.ts';

const metrics = [
  ['total_exits','total exits'], ['voluntary_exits','voluntary exits'],
  ['involuntary_exits','involuntary exits'], ['regrettable_exits','regrettable exits'],
  ['monthly_turnover_pct','monthly total turnover rate'],
  ['monthly_voluntary_turnover_pct','monthly voluntary turnover rate'],
] as const;

// Subtract supplied decimal values without turning 0.93 - 0.96 into -0.029999….
// Direction is derived from the exact scaled integers, never from model prose.
function decimal(value:number) {
  const [mantissa,exponent='0']=String(value).split('e');
  const [whole,fraction='']=mantissa.split('.');
  const scale=fraction.length-Number(exponent);
  return scale<0?{integer:BigInt(whole+fraction)*BigInt(10)**BigInt(-scale),scale:0}:{integer:BigInt(whole+fraction),scale};
}
function difference(value:number,baseline:number) {
  const a=decimal(value),b=decimal(baseline),scale=Math.max(a.scale,b.scale);
  const delta=a.integer*BigInt(10)**BigInt(scale-a.scale)-b.integer*BigInt(10)**BigInt(scale-b.scale);
  return {delta:Number(`${delta}e-${scale}`),direction:delta<BigInt(0)?'below':delta>BigInt(0)?'above':'equal to'};
}

/** Derived only from normalized source rows, not client comparisons or assistant history. */
export function homeMonthlyComparisons(pack:unknown) {
  const sources=pack&&typeof pack==='object'&&'sources' in pack?pack.sources:null;
  const source=Array.isArray(sources)?sources.find(item=>item?.id==='A1'):null;
  if(source?.status!=='loaded'||!source.facts)return [];
  const rows=normalizeHomeMonthlyRows(source.facts.monthly);
  // Conflicting or repeated period rows cannot establish one authoritative value.
  const unique=rows.filter(row=>rows.filter(other=>other.month===row.month).length===1).sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  const comparisons=[];
  for(let i=unique.length-1;i>0;i--)for(let j=i-1;j>=0;j--)for(const [metric,label] of metrics){
    const current=unique[i],prior=unique[j],value=current[metric],baseline=prior[metric];
    if(typeof value!=='number'||typeof baseline!=='number')continue;
    const {delta,direction}=difference(value,baseline),rate=metric.endsWith('_pct'),unit=rate?'percentage points':'exits';
    comparisons.push({source:'A1',scope:'Company-wide; unfiltered',metric,month:current.month,comparedWith:prior.month,value,baseline,delta,unit,direction,
      statement:`${current.month} ${label} (${value}${rate?'%':''}) is ${direction} ${prior.month} (${baseline}${rate?'%':''})${delta===0?'':` by ${Math.abs(delta)} ${unit}`}. [A1]`});
  }
  return comparisons;
}

export const homeMonthlyComparisonInstructions = `COMPUTED MONTHLY COMPARISONS are authoritative arithmetic derived from the supplied A1 monthly rows. For a matching pair and metric, use the supplied values, signed delta, direction and unit; do not independently calculate or reverse the comparison. The subject is month and the baseline is comparedWith. A negative rate delta means below, not above; rate deltas are percentage points, not relative percentages. Do not describe a month as higher than a supplied baseline when its computed direction is below. Compare only the requested matching metric and periods. These dated pairs do not choose the user's intended year: preserve ambiguity and ask which year when necessary. They remain company-wide, do not establish selected-scope rates, and supply neither missing denominators nor causes. Missing or suppressed values produce no comparison and remain unknown.`;
