import constraints from './data/position-inventory-constraints-v1.json' with {type:'json'};
import marginals from './data/company-position-marginals-v2.json' with {type:'json'};
// @ts-expect-error Native regression tests share application source.
import {catalogDisplayLabel} from './catalog-display.ts';
import type {InventoryPosition,PositionInventory} from './position-inventory';
export const COMPANY_POSITION_MODEL_V2='company-position-model-v2';
export const companyPositionV2Provenance=Object.freeze({
 source:'aggregate-constrained-model',datasetToken:marginals.metadata.datasetToken,bundleDigest:marginals.metadata.bundleDigest,
 filledFte:'Synthetic position allocation reconciled to employee FTE marginals; not observed position FTE or employee assignments.',
 locations:'Country assignments are constructed; country-by-business-unit, role and level intersections are not observed.',
 vacancies:'Vacant slots are modeled at 1 FTE and allocated across countries proportionally to filled headcount. No source vacancy FTE or country distribution exists.',
 funding:'Budgeted flags remain modeling assumptions, not Finance approval.',
 fractionalMix:'A balanced fractional starting allocation is varied in matched country/business-unit/level pairs. Individual FTE values are assumptions, not measured employment contracts.',
});
type ModeledPosition={-readonly [K in keyof InventoryPosition]:InventoryPosition[K]}&{countryCode:string;orgCode:string;fteBasis:'modeled-employee-marginals'|'modeled-vacancy-assumption';locationBasis:'modeled-country-assignment';financeApproval:'unknown'};
const integer=(n:number)=>{if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid position marginal count.');return n;};
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const key=(a:string,b:string)=>JSON.stringify([a,b]);
/** A deterministic integer transport, not a recovered employee-to-position mapping. */
function fractionalQuotas(){
 const capacity=new Map<string,number>(),adj=new Map<string,string[]>();
 const add=(a:string,b:string,n:number)=>{capacity.set(key(a,b),(capacity.get(key(a,b))??0)+n);capacity.set(key(b,a),capacity.get(key(b,a))??0);adj.set(a,[...(adj.get(a)??[]),b]);adj.set(b,[...(adj.get(b)??[]),a]);};
 const quota=(headcount:number,fte:number)=>{const n=(headcount-fte)*5;if(!near(n,Math.round(n)))throw Error('Unsupported fractional marginal precision.');return integer(Math.round(n));};
 for(const b of marginals.business_units)add('source',b.org_code,quota(b.headcount,b.fte));
 for(const l of marginals.levels)add(l.level_code,'sink',quota(l.headcount,l.fte));
 const groups=new Map<string,number>();
 for(const g of constraints.combinations){const k=key(g.org_code,g.level_code);groups.set(k,(groups.get(k)??0)+integer(g.current_positions-g.vacant_positions));}
 for(const [k,n] of [...groups].sort()){const [a,b]=JSON.parse(k);add(a,b,n);}
 let flow=0;
 while(true){const previous=new Map<string,string|null>([['source',null]]),queue=['source'];for(const a of queue){for(const b of adj.get(a)??[])if(!previous.has(b)&&(capacity.get(key(a,b))??0)>0){previous.set(b,a);queue.push(b);}if(previous.has('sink'))break;}if(!previous.has('sink'))break;let amount=Infinity,b='sink';while(previous.get(b)!==null){const a=previous.get(b)!;amount=Math.min(amount,capacity.get(key(a,b))!);b=a;}b='sink';while(previous.get(b)!==null){const a=previous.get(b)!;capacity.set(key(a,b),capacity.get(key(a,b))!-amount);capacity.set(key(b,a),capacity.get(key(b,a))!+amount);b=a;}flow+=amount;}
 if(flow!==marginals.summary.non_full_time_headcount)throw Error('FTE marginals cannot be reconciled with the position cohorts.');
 return new Map([...groups].map(([k,n])=>[k,n-(capacity.get(k)??0)]));
}
function assignCountries(rows:ModeledPosition[],quotas:Map<string,number>){
 const codes=[...quotas.keys()].sort(),names=new Intl.DisplayNames(['en'],{type:'region'});let cursor=0;
 for(const row of rows){let chosen='';for(let i=0;i<codes.length;i++){const index=(cursor+i)%codes.length,code=codes[index];if((quotas.get(code)??0)>0){chosen=code;cursor=(index+1)%codes.length;break;}}if(!chosen)throw Error('Country assignment does not reconcile.');quotas.set(chosen,quotas.get(chosen)!-1);row.countryCode=chosen;row.location=names.of(chosen)??chosen;}
 if([...quotas.values()].some(n=>n!==0))throw Error('Country totals were not consumed exactly.');
}
export function generateCompanyPositionInventoryV2():PositionInventory&{positions:readonly ModeledPosition[]}{
 if(marginals.metadata.datasetToken!==constraints.datasetToken||marginals.metadata.bundleDigest!==constraints.bundleDigest||marginals.asOf!==constraints.asOf)throw Error('Position and workforce snapshots do not match.');
 const quotas=fractionalQuotas(),rows:ModeledPosition[]=[];
 for(const g of [...constraints.combinations].sort((a,b)=>key(a.org_code,key(a.job_profile_code,a.level_code)).localeCompare(key(b.org_code,key(b.job_profile_code,b.level_code))))){
  const filled=integer(g.current_positions-g.vacant_positions),total=integer(g.current_positions+g.frozen_positions);
  if(g.open_requisition_vacancies+g.on_hold_requisition_vacancies+g.uncovered_vacancies!==g.vacant_positions)throw Error('Vacancy states do not reconcile.');
  for(let i=0;i<total;i++){const occupied=i<filled,k=key(g.org_code,g.level_code),fractional=occupied&&(quotas.get(k)??0)>0;if(fractional)quotas.set(k,quotas.get(k)!-1);const vacancy=i-filled;
   rows.push({id:`MODEL2-${g.org_code}--${g.job_profile_code}--${g.level_code}--${String(i+1).padStart(4,'0')}`,role:catalogDisplayLabel(constraints.job_profiles.find(r=>r.job_profile_code===g.job_profile_code)?.job_profile_name??g.job_profile_code),team:catalogDisplayLabel(constraints.business_units.find(r=>r.org_code===g.org_code)?.org_name??g.org_code),orgCode:g.org_code,level:g.level_code,location:'',countryCode:'',fte:fractional?0.8:1,budgeted:true,status:occupied?'filled':'vacant',vacancyStatus:occupied?null:i>=g.current_positions?'frozen':vacancy<g.open_requisition_vacancies?'recruiting':vacancy<g.open_requisition_vacancies+g.on_hold_requisition_vacancies?'on-hold':'available',fteBasis:occupied?'modeled-employee-marginals':'modeled-vacancy-assumption',locationBasis:'modeled-country-assignment',financeApproval:'unknown'});
  }
 }
 if([...quotas.values()].some(n=>n!==0))throw Error('Unassigned fractional slots.');
 const countries=[...marginals.countries].sort((a,b)=>a.country_code.localeCompare(b.country_code));
 const partTime=new Map(countries.map(c=>[c.country_code,integer(Math.round((c.headcount-c.fte)*5))]));
 assignCountries(rows.filter(r=>r.status==='filled'&&r.fte!==1),new Map(partTime));
 assignCountries(rows.filter(r=>r.status==='filled'&&r.fte===1),new Map(countries.map(c=>[c.country_code,c.headcount-partTime.get(c.country_code)!])));
 const fractionalGroups=new Map<string,ModeledPosition[]>();for(const row of rows.filter(r=>r.status==='filled'&&r.fte!==1)){const k=JSON.stringify([row.orgCode,row.level,row.countryCode]);fractionalGroups.set(k,[...(fractionalGroups.get(k)??[]),row]);}
 for(const group of fractionalGroups.values())for(let i=0;i+1<group.length;i+=2){group[i].fte=0.7;group[i+1].fte=0.9;}
 const vacant=rows.filter(r=>r.status==='vacant'),split=countries.map(c=>({code:c.country_code,exact:vacant.length*c.headcount/marginals.summary.headcount}));
 const vacancyQuotas=new Map(split.map(x=>[x.code,Math.floor(x.exact)]));let remainder=vacant.length-[...vacancyQuotas.values()].reduce((a,b)=>a+b,0);for(const x of [...split].sort((a,b)=>(b.exact%1)-(a.exact%1)||a.code.localeCompare(b.code))){if(remainder--<=0)break;vacancyQuotas.set(x.code,vacancyQuotas.get(x.code)!+1);}assignCountries(vacant,vacancyQuotas);
 const filledRows=rows.filter(r=>r.status==='filled');
 const check=(selected:ModeledPosition[],headcount:number,fte:number)=>{if(selected.length!==headcount||!near(selected.reduce((sum,r)=>sum+r.fte!,0),fte))throw Error('Generated register does not reconcile to the workforce marginals.');};
 check(filledRows,marginals.summary.headcount,marginals.summary.fte);
 for(const c of countries)check(filledRows.filter(r=>r.countryCode===c.country_code),c.headcount,c.fte);
 for(const b of marginals.business_units)check(filledRows.filter(r=>r.orgCode===b.org_code),b.headcount,b.fte);
 for(const l of marginals.levels)check(filledRows.filter(r=>r.level===l.level_code),l.headcount,l.fte);
 if(filledRows.filter(r=>r.fte===1).length!==marginals.summary.full_time_headcount||filledRows.filter(r=>r.fte!==1).length!==marginals.summary.non_full_time_headcount)throw Error('Modeled employment fractions do not reconcile.');
 for(const row of rows)Object.freeze(row);
 return Object.freeze({version:COMPANY_POSITION_MODEL_V2,asOf:marginals.asOf,source:'aggregate-constrained-model',positions:Object.freeze(rows)});
}
