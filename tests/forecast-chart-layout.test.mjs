import test from 'node:test';
import assert from 'node:assert/strict';
import artifact from '../lib/data/synthetic-domain-demo-v1.json' with {type:'json'};
import {forecastScale, forecastDateTicks, historySegments, monthIndex, forecastPointFeedback, forecastTooltipPosition} from '../lib/forecast-chart-layout.ts';

test('point feedback includes the exact supplied number, native unit, date and series',()=>{
  const february=artifact.domains.turnover.history.find(row=>row.month==='2026-02');
  assert.deepEqual(forecastPointFeedback('turnover',february.month,february.value),{date:'Feb 2026',value:'80 voluntary exits',series:'Demo history'});
  const projection=artifact.domains.turnover.rows[0];
  assert.equal(forecastPointFeedback('turnover',projection.month,projection.values[2],'Linear Regression').value,projection.values[2]+' voluntary exits');
  assert.equal(forecastPointFeedback('turnover',projection.month,projection.values[2],'Linear Regression').series,'Projection · Linear Regression');
  assert.equal(forecastPointFeedback('hiring','2026-10',.805).value,'80.5% within 90 days');
  assert.equal(forecastPointFeedback('satisfaction','2026-12',64.51217292377801).value,'64.51217292377801% favorable-answer share');
  assert.equal(forecastPointFeedback('turnover','2026-09',null).value,'Unavailable');
  assert.equal(forecastPointFeedback('turnover','2026-01',0).value,'0 voluntary exits');
});
test('compact tooltips remain inside narrow, offset and short viewports at every edge',()=>{
  for(const viewport of [{left:0,top:0,width:320,height:740},{left:0,top:0,width:390,height:844},{left:20,top:40,width:280,height:300}]){
    for(const anchor of [{left:-20,right:0,top:0,bottom:10},{left:viewport.width-5,right:viewport.width+5,top:viewport.height-10,bottom:viewport.height+10},{left:100,right:110,top:180,bottom:190}]){
      const card={width:230,height:90},position=forecastTooltipPosition(anchor,card,viewport);
      assert(position.left>=viewport.left+8&&position.left+card.width<=viewport.left+viewport.width-8);
      assert(position.top>=viewport.top+8&&position.top+card.height<=viewport.top+viewport.height-8);
    }
  }
});

for (const [domain, expected] of [['turnover',[40,120]],['hiring',[.76,.86]],['satisfaction',[62,68]]]) {
  test(`${domain}: padded domain contains every displayed source value in native units`, () => {
    const data = artifact.domains[domain];
    const history = domain === 'turnover' ? data.history.filter(row=>row.month >= '2026-01') : domain === 'hiring' ? data.history.slice(-12) : data.history;
    const values = [...history.map(row=>row.value), ...data.rows.flatMap(row=>row.values)].filter(value=>value!==null);
    const scale = forecastScale(domain, values);
    assert.deepEqual([scale.min,scale.max],expected);
    assert(values.every(value=>value>scale.min && value<scale.max));
    assert.equal(scale.ticks[0],scale.min);
    assert.equal(scale.ticks.at(-1),scale.max);
    assert(scale.ticks.length>=4 && scale.ticks.length<=7);
  });
}

test('percentage scales preserve 0–100 bounds and at least five percentage points at either edge', () => {
  for (const [domain, factor] of [['hiring',100],['satisfaction',1]]) {
    for (const values of [[0],[100],[0,100],[.01,.02],[99.99,100],[65,65.01]]) {
      const scale = forecastScale(domain,values.map(value=>value/factor));
      assert(scale.min>=0 && scale.max<=100/factor);
      assert(scale.max-scale.min>=5/factor - 1e-10);
      assert(values.every(value=>value/factor>=scale.min && value/factor<=scale.max));
    }
  }
});

test('flat, singleton, zero and null series have stable domains without manufactured values', () => {
  for (const domain of ['turnover','hiring','satisfaction']) {
    assert.equal(forecastScale(domain,[]),null);
    assert.equal(forecastScale(domain,[null,undefined,NaN,Infinity]),null);
    for (const value of [0,domain==='hiring'?.8:80]) {
      const scale=forecastScale(domain,[null,value,value]);
      assert(scale.min>=0 && scale.max>scale.min);
      assert(value>=scale.min && value<=scale.max);
    }
  }
});

test('quarterly history joins all eight available waves without filling September or inventing monthly values', () => {
  const data=artifact.domains.satisfaction;
  const segments=historySegments(data.history,3);
  assert.equal(segments.length,1);
  assert.deepEqual(segments[0],data.history);
  assert.equal(segments[0].at(-1).month,'2026-06');
});

test('monthly history breaks at zero-opening nulls and absent releases', () => {
  const history=artifact.domains.hiring.history.slice(-12);
  const segments=historySegments(history,1);
  assert.deepEqual(segments.map(rows=>[rows[0].month,rows.at(-1).month]),[['2025-07','2025-10'],['2025-12','2026-06']]);
  assert.deepEqual(historySegments([{month:'2026-01',value:4},{month:'2026-03',value:5}],1).map(rows=>rows.length),[1,1]);
  assert.deepEqual(historySegments([{month:'2026-03',value:null}],3),[]);
});

for (const [start,end,cadence,firstProjection,years] of [['2026-01','2026-12',1,'2026-10',['2026']],['2025-07','2026-12',1,'2026-10',['2025','2026']],['2024-09','2026-12',3,'2026-12',['2024','2025','2026']]]) {
  test(`${start}: responsive ticks retain endpoint years, year boundaries and actual time spacing`, () => {
    for (const width of [184,214,290,500,850]) {
      const {ticks,rotated}=forecastDateTicks(start,end,cadence,width,firstProjection);
      assert.equal(ticks[0].month,start);assert.equal(ticks.at(-1).month,end);
      assert.equal(ticks[0].year,start.slice(0,4));assert.equal(ticks.at(-1).year,end.slice(0,4));
      assert.deepEqual([...new Set(ticks.flatMap(row=>row.year?[row.year]:[]))],years);
      assert(ticks.length>=6);
      assert(ticks.every((row,i)=>!i||(monthIndex(row.month)-monthIndex(ticks[i-1].month))/(monthIndex(end)-monthIndex(start))*width>=(rotated?16:38)-1e-9));
      assert(ticks.every(row=>(monthIndex(row.month)-monthIndex(start))%cadence===0));
    }
  });
}

test('single-period date axis retains one fully dated tick', () => {
  assert.deepEqual(forecastDateTicks('2026-12','2026-12',3,250).ticks,[{month:'2026-12',label:'Dec',year:'2026'}]);
});
