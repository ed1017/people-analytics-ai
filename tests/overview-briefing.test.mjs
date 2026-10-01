import test from "node:test";
import assert from "node:assert/strict";
import { buildOverviewSources, overviewBriefingPrompt } from "../lib/overview-briefing.ts";

const workforce={overview:{snapshot_date:"2026-09-30",headcount:100,fte:90,open_positions:0,voluntary_turnover_ytd_pct:2,labor_cost_usd:1000},trend:[]};
const skills={as_of:"2026-08-31",summary:{current_workforce:95,skills_with_demand:10,skills_below_75_pct:3,skills_below_60_pct:1}};
const planning={scenarios:[{scenario_name:"Baseline",scenario_type:"baseline",assumptions:[],points:[{planning_month:"2027-01-01",planned_headcount:110},{planning_month:"2027-12-01",planned_headcount:120}]}]};

test("overview preserves each source's distinct date and population",()=>{
  const [w,t,p]=buildOverviewSources(workforce,skills,planning);
  assert.equal(w.date,"2026-09-30");assert.equal(t.date,"2026-08-31");assert.equal(p.date,null);
  assert.match(w.population,/100 employees/);assert.match(t.population,/95 employees/);
  assert.match(p.population,/2027-01-01 to 2027-12-01/);assert.match(p.scope,/modeled, not observed/);
});
test("missing source is unavailable while observed zero remains zero",()=>{
  const [w,t,p]=buildOverviewSources(workforce,null,null);
  assert.equal(w.facts.open_positions,0);assert.equal(t.facts,null);assert.equal(p.facts,null);
});
test("another scenario cannot silently substitute for the baseline",()=>{
  const altered={scenarios:[{...planning.scenarios[0],scenario_name:"Expansion"}]};
  assert.equal(buildOverviewSources(null,null,altered)[2].facts,null);
});
test("briefing rules demand traceable separate scopes and block invented actions",()=>{
  const prompt=overviewBriefingPrompt(buildOverviewSources(workforce,skills,planning));
  for(const rule of ["[W1]","[T1]","[P1]","No tool calls","Null source facts mean unavailable","not an unsupported priority ranking","Do not combine denominators","different durations","do not compare their growth percentages"])
    assert.ok(prompt.includes(rule),rule);
});
