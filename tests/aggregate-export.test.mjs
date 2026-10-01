import test from "node:test";
import assert from "node:assert/strict";
import { buildAggregateExport, csvCell } from "../lib/aggregate-export.ts";
const base={page:"workforce",filters:"Australia",snapshot:{snapshot_date:"2026-09-30",headcount:300,fte:298,voluntary_turnover_ytd_pct:0,labor_cost_usd:null,open_positions:2,employee_name:"DO NOT EXPORT",employee_id:"PRIVATE"},trend:[{snapshot_date:"2026-08-31",headcount:290,fte:288}],workforce:null,skills:null};
test("CSV exports actual allowed metrics, scope and null/zero distinctly, not identifiers",()=>{const csv=buildAggregateExport(base);assert.match(csv,/Australia/);assert.match(csv,/"headcount","300","people"/);assert.match(csv,/"voluntary_turnover_ytd_pct","0","percent"/);assert.match(csv,/"labor_cost_usd","Unavailable","USD"/);assert.match(csv,/2026-08-31/);assert.doesNotMatch(csv,/PRIVATE|employee_name|DO NOT EXPORT/)});
test("unsupported and protected modules have no fallback export",()=>{for(const page of ["home","compensation","succession-planning","workforce-response"])assert.equal(buildAggregateExport({...base,page}),null)});
test("CSV quotes values and neutralizes spreadsheet formulas",()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a,"b"'),'"a,""b"""');assert.equal(csvCell(-2),'"-2"')});
