export const briefFields={observed:"Observed evidence notes",calculations:"Calculation notes",assumptions:"Assumptions",unknowns:"Unknowns",proposals:"Proposed actions"} as const;
export type DecisionBrief={owner:string;observed:string;calculations:string;assumptions:string;unknowns:string;proposals:string;approvals:Array<{text:string;recordedAt:string}>};
export const emptyDecisionBrief=():DecisionBrief=>({owner:"",observed:"",calculations:"",assumptions:"",unknowns:"",proposals:"",approvals:[]});
export function recordExplicitApproval(brief:DecisionBrief,text:string,at:string):DecisionBrief {
 const clean=text.trim();if(!clean||clean.length>1000||brief.approvals.length>=20)return brief;
 return {...brief,approvals:[...brief.approvals,{text:clean,recordedAt:at}]};
}
