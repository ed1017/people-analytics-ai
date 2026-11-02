import type {RiskGroup} from './group-capacity-risk';
import type {groupWorkforceTrend} from './group-workforce-trend';
export type TrendSnapshot={groupCode:string;result:ReturnType<typeof groupWorkforceTrend>;edited:boolean};
export type TrendControl={read:(code:string,months?:number)=>TrendSnapshot|null;setHorizon:(months:number)=>void};
export type StaffingCommand={code:string|null;months:number|null;kind:'open'|'baseline'|'demand';demand:number|null;error:string|null};
const normalized=(s:string)=>s.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
export function isGroupStaffingFollowup(text:string){
 return /\b(fill|close|cover|bridge|address|solve|mitigate)\b.*\b(gap|shortfall|shortage)s?\b/i.test(text)||/\b(model|plan|compare)\b.*\b(staffing|hiring|demand)\b/i.test(text)||/\b(use|model|maintain)\b.*\bcurrent\b.*\b(fte|capacity|workforce)\b/i.test(text)||/\b(set|assume|use)\b.*\bdemand\b/i.test(text);
}
export function groupStaffingCommand(text:string,groups:Pick<RiskGroup,'code'|'label'>[],selected:string):StaffingCommand|null{
 if(!isGroupStaffingFollowup(text))return null;
 const clean=normalized(text),matches=groups.filter(g=>{const label=normalized(g.label);return [label,label.replace(/services\b/g,'service'),normalized(g.code)].some(alias=>(' '+clean+' ').includes(' '+alias+' '));});
 const named=matches.length===1?matches[0].code:null;
 const defaultScope=/\b(this|that|the|our|its|selected)\s+(?:group(?: s)?\s+|business unit(?: s)?\s+|capacity\s+|staffing\s+)?(?:gap|shortfall|shortage|demand|workforce|capacity|fte)/i.test(text)||/\bcurrent\b/i.test(text)||/\b(set|assume|use)\b.*\bdemand\b/i.test(text);
 const horizons=[...text.matchAll(/\b(?:next|over|for)\s+(\d+)\s+months?\b/gi)],horizon=horizons[0],months=horizon?Number(horizon[1]):null;
 let error=matches.length>1?'Choose one business unit to model.':!named&&!defaultScope?'Which business unit should the staffing model use? Select it below, then ask to fill this gap.':null;
 if(horizons.length>1)error='Choose one projection horizon.';
 if(months!==null&&(!Number.isInteger(months)||months<1||months>12)||!horizon&&/\b(years?|quarters?|weeks?|days?)\b/i.test(text))error='Choose a projection horizon of 1–12 months after the recorded snapshot.';
 if(/\b(country|countries|department|departments|level|levels)\b/i.test(text))error='This model supports the complete business unit across all countries and levels. Review that scope below.';
 const baseline=/\b(use|model|maintain)\b.*\bcurrent\b.*\b(fte|capacity|workforce)\b/i.test(text);
 const demandMatch=text.match(/\bdemand\s+(?:at|to|of|is|=)?\s*([+-]?[\d,.]+)\s*(?:productive\s+)?fte\b/i);
 const demand=demandMatch?Number(demandMatch[1].replace(/,/g,'')):null;
 if(demandMatch&&(!Number.isFinite(demand)||demand!<0||demand!>10000000)||!baseline&&!demandMatch&&/\b(set|assume|use)\b.*\bdemand\b/i.test(text))error='Enter the demand assumption as a nonnegative number of productive FTE, for example “Set demand to 1500 FTE”.';
 if(baseline&&demandMatch)error='Choose either a numeric demand assumption or the current-FTE baseline, not both.';
 // Closed vocabulary after consuming exact group, horizon and demand clauses:
 // unknown countries, calendar dates, negations and extra edits must never be ignored.
 let remainder=' '+clean+' ';
 for(const g of groups)for(const alias of [normalized(g.label),normalized(g.label).replace(/services\b/g,'service'),normalized(g.code)])remainder=remainder.split(' '+alias+' ').join(' ');
 remainder=remainder.replace(/\b(?:next|over|for)\s+\d+\s+months?\b/g,' ');
 if(demandMatch)remainder=remainder.replace(normalized(demandMatch[0]),' ');
 const allowed=new Set(('how do can should could i we please help me fill close cover bridge address solve mitigate the this that our its selected group business unit capacity staffing workforce gap gaps shortfall shortfalls shortage shortages in for model plan compare options '+(baseline?'use maintain current recorded contracted productive fte demand at as ':demandMatch?'set assume use at to of is ':'')).split(/\s+/));
 if(remainder.trim().split(/\s+/).some(word=>!allowed.has(word)))error='Use one complete business unit and a 1–12 month snapshot-relative horizon. Enter other staffing assumptions in the controls below.';
 return {code:named??(defaultScope?selected:null),months,kind:baseline?'baseline':demandMatch?'demand':'open',demand,error};
}
