import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {workforceFindings,recruitingFindings,attritionFindings} from '../lib/key-findings.ts';
test('workforce compares dated endpoints without mutating source or inventing rates',()=>{
 const trend=[{snapshot_date:'2026-09-30',headcount:120},{snapshot_date:'2026-01-31',headcount:100}];
 const d={as_of:'2026-09-30',summary:{headcount:120,full_time_headcount:90,avg_tenure_years:4},trend};
 const result=workforceFindings(d).items.join(' ');
 assert.match(result,/increased by 20 people between 2026-01-31 and 2026-09-30/); assert.match(result,/75%.*full-time/); assert.equal(trend[0].headcount,120);
 assert.doesNotMatch(workforceFindings({...d,trend:[],summary:{headcount:0,full_time_headcount:0}}).items.join(' '),/NaN|Infinity|%/);
 assert.match(workforceFindings({...d,trend:[{snapshot_date:'2026-01-31',headcount:120},{snapshot_date:'2026-09-30',headcount:100}]}).items[0],/decreased by 20/);
});
test('recruiting and exit shares require matching nonzero valid totals',()=>{
 assert.match(recruitingFindings({summary:{open_requisitions:20,open_reqs_over_60_days:5}}).items.join(' '),/25%.*5 of 20/);
 assert.doesNotMatch(recruitingFindings({summary:{open_requisitions:0,open_reqs_over_60_days:0}}).items.join(' '),/NaN|Infinity/);
 assert.match(attritionFindings({summary:{total_exits:100,voluntary_exits:70}}).items.join(' '),/70% of recorded exits/);
 assert.doesNotMatch(attritionFindings({summary:{total_exits:1,voluntary_exits:2}}).items.join(' '),/200%/);
});
test('scope mismatch remains visible outside disclosure and history restoration is untouched',()=>{
 const scope=fs.readFileSync(new URL('../components/evidence-scope-notice.tsx',import.meta.url),'utf8');
 assert.ok(scope.indexOf('selected filters are not applied')<scope.indexOf('<details'));
 const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(page,/window\.scrollTo\(\{top: 0, left: 0, behavior: "instant"\}\)/);
 assert.match(page,/const restore = \(\) => cancelHistoryRequest\(\)/);
});
