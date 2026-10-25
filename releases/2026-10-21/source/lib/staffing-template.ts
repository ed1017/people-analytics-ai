/** Parse the editable field block, not arbitrary narrative or model output. */
export function readStaffingTemplate(text:string){
 const lines=text.trim().split(/\r?\n/).filter(line=>line.trim());
 if(lines[0]==='Help me estimate the FTE needed and compare options. I can leave unknown details blank.')lines.shift();
 const allowed=['description','fte needed','budget (optional)','role','business unit','department/team','level','location','needed by'];
 const values:Record<string,string>={};
 for(const line of lines){const match=/^\s*([^:]+):\s*(.*?)\s*$/.exec(line);if(!match)return null;const key=match[1].toLowerCase();if(!allowed.includes(key)||Object.hasOwn(values,key))return null;values[key]=match[2];}
 if(!['description','fte needed','role'].every(key=>Object.hasOwn(values,key)))return null;
 return values;
}
