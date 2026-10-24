/** UI intent only: never changes provider routing, adopts assumptions, submits or saves. */
export function scenarioPlannerEntry(text:string):boolean {
 const q=text.trim();
 if(!q||/\b(?:which|what)\s+(?:groups?|business units?).*\bat risk\b/i.test(q))return false;
 return /\b(?:scenario|capacity|staffing|workforce)\s+(?:plan(?:ning)?|options?|gap)\b|\b(?:close|fill|bridge)\b.*\b(?:gap|vacanc)|\b(?:need|add|hire|recruit|redeploy|train)\b.*\b(?:people|FTE|staff|employees|roles|hires)\b|\b(?:compare|what if)\b.*\b(?:hiring|hires|redeploy|training|demand|capacity)\b/i.test(q);
}
