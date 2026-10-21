import {DAY,rng,binomial,integer,monthsFor,firstDay,dayAdd,monthEnd,release} from './common.mjs';

/** One generated population; all actual external starts enter its daily stock. */
export function generateTurnover(config,{seed,family,startEvents}) {
  if(!config.seeds.includes(seed)||!config.families.includes(family))throw Error('Unfrozen turnover scenario');
  const random=rng(seed,`turnover:${family}`),entries=new Map(),truth=[],releases=[],coverage=[];
  for(const event of startEvents){
    if(!Number.isSafeInteger(event.count)||event.count<0||!Number.isFinite(Date.parse(event.at)))throw Error('Invalid generated entry event');
    const day=event.at.slice(0,10);entries.set(day,(entries.get(day)??0)+event.count);
  }
  let stock=config.initialHeadcount;
  for(const [index,month]of monthsFor(config).entries()){
    const startHeadcount=stock,start=firstDay(month),end=monthEnd(month),days=Math.round((Date.parse(end)+1-Date.parse(start))/DAY);
    let rate=.007;
    if(family==='gradual-improvement')rate=Math.max(.003,rate-index*.000045);
    if(family==='regime-reversal')rate=month>=config.regimeChangeMonth?.014:Math.max(.004,.007-index*.000035);
    const seasonal=1+.12*Math.sin(2*Math.PI*index/12);
    const voluntaryExits=index===7?0:binomial(random,startHeadcount,rate*seasonal);
    const otherExits=binomial(random,startHeadcount,.0015);
    const exits=Array.from({length:days},()=>({voluntary:0,other:0}));
    for(let n=0;n<voluntaryExits;n++)exits[integer(random,0,days-1)].voluntary++;
    for(let n=0;n<otherExits;n++)exits[integer(random,0,days-1)].other++;
    const daily=[];let starts=0,personDays=0;
    for(let n=0;n<days;n++){
      const at=dayAdd(start,n),beginning=stock,joined=entries.get(at.slice(0,10))??0;
      stock+=joined-exits[n].voluntary-exits[n].other;
      if(stock<0)throw Error('Generated stock became negative');
      starts+=joined;personDays+=stock;
      daily.push({at,startHeadcount:beginning,starts:joined,voluntaryExits:exits[n].voluntary,otherExits:exits[n].other,endHeadcount:stock});
    }
    const value={month,startHeadcount,starts,voluntaryExits,otherExits,endHeadcount:stock,countStatus:'recorded',
      exposure:{status:'complete',personDays,days,meanHeadcount:personDays/days,unit:'person-days',definitionVersion:'start-of-UTC-day-events-v1'}};
    truth.push({...value,daily});
    const key=`turnover:${month}`,stress=family==='reporting-stress',available=dayAdd(end,stress?35:3);
    const state=stress&&index%18===4?'missing':stress&&index%9===2?'partial':'complete';
    const masked={month,startHeadcount:null,starts:null,voluntaryExits:null,otherExits:null,endHeadcount:null,countStatus:state,
      exposure:{status:state,personDays:null,days,meanHeadcount:null,unit:'person-days',definitionVersion:'start-of-UTC-day-events-v1'}};
    // All exits are present; the initial classification can later be corrected.
    const correction=index===22||(stress&&index%10===0),delta=correction?Math.min(2,voluntaryExits):0;
    const initial={...value,voluntaryExits:voluntaryExits-delta,otherExits:otherExits+delta};
    const append=(revision,at,payload,status)=>{
      releases.push(release(key,revision,end,at,structuredClone(payload),status));
      coverage.push({recordKey:key,revision,effectiveAt:end,simulatedAvailableAt:at,sourceObservedAt:null,status,
        populationVersion:'synthetic-company-v1',coverageBasis:'enumerated-generated-daily-stock-and-flows',complete:status==='complete'});
    };
    append(1,available,state==='complete'?initial:masked,state);
    if(state!=='complete'||correction)append(2,dayAdd(end,stress?95:45),value,'complete');
  }
  return {domain:'turnover',definitions:{populationVersion:'synthetic-company-v1',initialHeadcount:config.initialHeadcount,
    membership:'Hires enter at start of UTC event day; exits leave at start of UTC event day. No transfers, rehires or unrecorded flows.',
    starts:'Generated hiring actual starts within the workforce window; post-window starts remain hiring follow-up only. Planned, accepted, cancelled and no-show cases are not workforce entries.',
    exposure:'Sum of post-event daily stocks over calendar days. Simulated person-time; not month-end headcount or future forecast exposure.',
    generationAssumptions:{voluntaryMonthlyProbability:.007,otherMonthlyProbability:.0015,seasonalAmplitude:.12,improvementPerMonth:.000045,
      improvementFloor:.003,reversalPreTrend:.000035,reversalPreFloor:.004,reversalProbability:.014,trueZeroMonthIndex:7,
      ordinaryReportingDays:3,stressReportingDays:35,ordinaryCorrectionDays:45,stressCorrectionDays:95},
    historicalAvailability:'simulated-only',operationallyQualified:false},truth,releases,coverage};
}
