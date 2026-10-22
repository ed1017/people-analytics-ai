export const composerPromptHelpers = [
 {id:'need',label:'I need FTE to fill a capacity gap',text:'Help me estimate the FTE needed and compare options. I can leave unknown details blank.\nDescription: \nFTE needed: \nBudget (optional): \nRole: \nDepartment/team: \nLevel: \nLocation: \nNeeded by: '},
 {id:'compare',label:'Compare…',text:'Compare staffing options for [role].'},
 {id:'what-if',label:'What if…',text:'What if we change staffing for [role]?'}
] as const;

/** Append without replacing any draft bytes or implicitly sending a question. */
export function insertPromptHelper(draft:string,id:string){
 const helper=composerPromptHelpers.find(item=>item.id===id);
 if(!helper)return null;
 const prefix=draft+(draft.length&&!draft.endsWith('\n')?'\n':'');
 const value=prefix+helper.text;
 const start=prefix.length+(helper.id==='need'?helper.text.indexOf('Description: ')+13:helper.text.indexOf('[role]'));
 return {value,start,end:helper.id==='need'?start:start+6};
}
