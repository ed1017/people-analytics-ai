export function evidenceTrustLabel(page:string){
 if(page==="career-growth-mobility")return "Demo data · company aggregate evidence";
 if(page==="home")return "Synthetic company evidence · public BLS references";
 if(page==="labor-market")return "Public BLS references · periods and geography apply";
 if(page==="occupational-references")return "Stored mappings · external occupation references";
 if(page==="training-coaching")return "Fictional simulated quotes · custom input unverified";
 if(page==="development-planning")return "Deterministic costs · fictional or unverified quotes";
 if(["planning-overview","scenario-modeling","position-workforce-design","workforce-response","execution-feasibility","workforce-planning","finance"].includes(page))return "Synthetic company baseline · modeled results, not approvals";
 return "Synthetic company aggregate evidence";
}
