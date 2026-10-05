export const homePlanPanelField='homePlanPanelV1';
export type HomePlanPanelState={version:1;collapsed:boolean;appliedId:'A'|'B'|'C'|null};
export function readHomePlanPanel(value:unknown):HomePlanPanelState{
 if(value&&typeof value==='object'&&!Array.isArray(value)){const item=value as Record<string,unknown>;if(Object.keys(item).sort().join()===['version','collapsed','appliedId'].sort().join()&&item.version===1&&typeof item.collapsed==='boolean'&&(item.appliedId===null||typeof item.appliedId==='string'&&['A','B','C'].includes(item.appliedId)))return {version:1,collapsed:item.collapsed,appliedId:item.appliedId as HomePlanPanelState['appliedId']};}
 return {version:1,collapsed:false,appliedId:null};
}
