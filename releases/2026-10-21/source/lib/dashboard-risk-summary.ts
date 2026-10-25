// @ts-expect-error Native tests share this calculation source.
import {groupWorkforceTrend} from './group-workforce-trend.ts';
import type {RiskGroup} from './group-capacity-risk';
import type {DashboardFilters} from './dashboard-scope';
/** Only comparable complete group histories; no demand, gross flows or probability inferred. */
export function dashboardRiskSummary(groups:RiskGroup[],filters:DashboardFilters,asOf:string){
 if(filters.country!=='all'||filters.level!=='all')throw Error('Trend-based group risks are unavailable for this country or level filter.');
 if(groups.length!==8||new Set(groups.map(g=>g.code)).size!==8||groups.some(g=>g.asOf!==asOf))throw Error('Matching complete business-unit histories are needed.');
 const scoped=filters.org==='all'?groups:groups.filter(g=>g.code===filters.org);
 if(!scoped.length)throw Error('This business unit has no verified trend history.');
 const rows=scoped.map(group=>({group,trend:groupWorkforceTrend(group,3,3)})).sort((a,b)=>a.trend.deltaFte-b.trend.deltaFte||a.group.code.localeCompare(b.group.code));
 return {rows,declines:rows.filter(r=>r.trend.deltaFte<0),from:rows[0].trend.from,to:asOf,end:rows[0].trend.points.at(-1)!.month};
}
