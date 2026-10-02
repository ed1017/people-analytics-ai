import fixture from "./data/bls-oews-may2025.json" with {type:"json"};
export const oewsOccupations = [...new Map(fixture.records.map(row=>[row.OCC_CODE,{value:row.OCC_CODE,label:row.OCC_TITLE}])).values()];
export const oewsAreas = [{value:"99",label:"U.S.",kind:"national"},{value:"36",label:"New York State",kind:"state"},{value:"35620",label:"New York-Newark-Jersey City, NY-NJ",kind:"metro"}];
export const defaultMarketSelection = ()=>({soc:"15-1252",area:"99"});
export function marketEvidence(input) {
 const selection=input&&typeof input==="object"?input:{};
 const row=fixture.records.find(row=>row.OCC_CODE===selection.soc&&row.AREA===selection.area);
 if(!row)return null;
 const national=fixture.records.find(item=>item.OCC_CODE===row.OCC_CODE&&item.AREA==="99");
 if(!national)return null;
 const area=oewsAreas.find(area=>area.value===row.AREA);
 if(!area)return null;
 const kind=area.kind;
 return {source:"U.S. Bureau of Labor Statistics, OEWS",period:fixture.source_period,releaseDate:fixture.release_date,currency:"USD",wageBasis:"Annual wages; not total employer cost",industryScope:"All industries",geographyKind:kind,sourceUrl:fixture.sources[kind],selected:{...row},national:{...national},medianDifferencePct:row.A_MEDIAN!==null&&national.A_MEDIAN?Math.round((row.A_MEDIAN/national.A_MEDIAN-1)*1000)/10:null,limitations:"Versioned reference extract, not live pay or internal Compensation. Employment is not available candidates or vacancies. Metro is broader than New York City. Do not add overlapping geography employment. Compare this same period only; no naive annual trend. Missing/suppressed values remain unavailable. Location quotient is occupational employment concentration relative to the U.S.; it is not recruiting ease or skill quality."};
}
export function marketCarryEvidence(input) {
 if(!input||typeof input!=="object"||typeof input.goal!=="string"||!input.goal.trim())return null;
 const reference=marketEvidence(input);
 return reference?{goal:input.goal.slice(0,240),...reference,planningStatus:"Explicitly carried reference only; no model assumption was changed or approved."}:null;
}
