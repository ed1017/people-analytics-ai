import {rng,release} from './common.mjs';
import protocol from '../group-turnover/protocol.json' with {type:'json'};

const ids=protocol.groups.map(group=>group.id);
const initial=protocol.groups.map(group=>group.initialHeadcount);
const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
const sum=values=>values.reduce((a,b)=>a+b,0);
const mask=(value,status)=>({...value,...Object.fromEntries(fields.map(field=>[field,null])),countStatus:status,
  exposure:{...value.exposure,status,personDays:null,days:null,meanHeadcount:null}});

/** Fixed synthetic partitions; allocation produces aggregate daily counts, no people. */
export function partitionTurnoverGroups(turnover,{seed,family}) {
  if(turnover.truth[0]?.startHeadcount!==8400)throw Error('Group protocol requires initial stock 8400');
  const random=rng(seed,`turnover-groups:${family}`),stock=[...initial],truth=[],releases=[];
  const allocate=(n,sign)=>{
    if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid group flow');
    const result=[0,0,0,0];
    for(let i=0;i<n;i++) {
      const total=sum(stock);if(total===0)throw Error('Cannot allocate flow without available stock');
      let draw=random()*total,chosen=stock.length-1;
      for(let j=0;j<stock.length;j++){draw-=stock[j];if(draw<0){chosen=j;break;}}
      stock[chosen]+=sign;result[chosen]++;
      if(stock[chosen]<0)throw Error('Negative group stock');
    }
    return result;
  };
  for(const company of turnover.truth) {
    const start=[...stock],daily=ids.map(()=>[]);
    for(const day of company.daily) {
      if(sum(stock)!==day.startHeadcount)throw Error('Company beginning stock mismatch');
      const beginning=[...stock],starts=allocate(day.starts,1),voluntary=allocate(day.voluntaryExits,-1),other=allocate(day.otherExits,-1);
      if(sum(stock)!==day.endHeadcount)throw Error('Company ending stock mismatch');
      for(let i=0;i<4;i++)daily[i].push({at:day.at,startHeadcount:beginning[i],starts:starts[i],voluntaryExits:voluntary[i],otherExits:other[i],endHeadcount:stock[i]});
    }
    for(let i=0;i<4;i++) {
      const personDays=sum(daily[i].map(row=>row.endHeadcount));
      truth.push({month:company.month,groupId:ids[i],startHeadcount:start[i],starts:sum(daily[i].map(row=>row.starts)),
        voluntaryExits:sum(daily[i].map(row=>row.voluntaryExits)),otherExits:sum(daily[i].map(row=>row.otherExits)),endHeadcount:stock[i],countStatus:'recorded',
        exposure:{...company.exposure,personDays,meanHeadcount:personDays/daily[i].length},daily:daily[i]});
    }
  }
  for(const company of turnover.releases) {
    const rows=truth.filter(row=>row.month===company.value.month).map(row=>{const value=structuredClone(row);delete value.daily;return value;});
    if(rows.length!==4)throw Error('Missing group month');
    if(company.status==='complete') {
      let delta=sum(rows.map(row=>row.voluntaryExits))-company.value.voluntaryExits;
      if(!Number.isSafeInteger(delta)||delta<0||sum(rows.map(row=>row.otherExits))+delta!==company.value.otherExits)throw Error('Unsupported company classification revision');
      // Largest group first; spill only if its voluntary count cannot cover the correction.
      for(const row of [...rows].sort((a,b)=>b.endHeadcount-a.endHeadcount||a.groupId.localeCompare(b.groupId))) {
        const move=Math.min(delta,row.voluntaryExits);row.voluntaryExits-=move;row.otherExits+=move;delta-=move;
      }
      if(delta)throw Error('Unallocated company revision');
    }
    const hidden=new Set(company.status==='complete'?rows.filter(row=>Math.min(row.startHeadcount,row.endHeadcount)<protocol.privacy.minimumHeadcount||(row.voluntaryExits!==0&&row.voluntaryExits<protocol.privacy.minimumPositiveCount)).map(row=>row.groupId):ids);
    if(hidden.size===1)hidden.add([...rows].filter(row=>!hidden.has(row.groupId)).sort((a,b)=>a.endHeadcount-b.endHeadcount||a.groupId.localeCompare(b.groupId))[0].groupId);
    for(const row of rows) {
      const status=company.status!=='complete'?company.status:hidden.has(row.groupId)?'suppressed':'complete';
      releases.push(release(`turnover:${row.groupId}:${row.month}`,company.revision,company.effectiveAt,company.simulatedAvailableAt,status==='complete'?row:mask(row,status),status));
    }
  }
  return {definitions:{protocolVersion:protocol.version,population:'four-fixed-synthetic-groups-v1',groupIds:ids,initialHeadcounts:initial,initialWeights:initial.map(n=>n/8400),
    allocation:'Sequential seeded draws weighted by current group stock; starts increase stock before voluntary and other exits decrease available stock.',
    privacy:{minimumBoundaryHeadcount:protocol.privacy.minimumHeadcount,minimumNonzeroMonthlyVoluntaryCount:protocol.privacy.minimumPositiveCount,complementarySuppression:'If exactly one group is hidden, also hide the remaining group with smallest end headcount; ID breaks ties.',
      limitations:'Fixed groups only. Not a formal privacy guarantee; no repeated-release, differencing, arbitrary-query or cross-period privacy protection.'},
    classificationRevision:'Reclassify voluntary to other in largest end-stock group first, preserving total exits, stock and exposure.',operationallyQualified:false},truth,releases};
}
