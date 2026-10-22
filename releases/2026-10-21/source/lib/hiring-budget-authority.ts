/** Only an explicit standalone total-ceiling command can adopt funding through chat. */
export function confirmsBudgetAmount(text:string,value:number){
 if(!Number.isFinite(value)||value<0)return false;
 const amount='(?:USD\\s*|\\$\\s*)?([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)(\\s*[km])?';
 const prefix='(?:(?:please\\s+)?(?:set|change|reduce|increase|update)\\s+(?:(?:our|the|total|incremental)\\s+)*budget\\s+(?:to|at)\\s+|(?:our\\s+|the\\s+)?(?:total\\s+)?budget\\s*(?:(?:is|of)\\s+)?)';
 const forward=new RegExp('^'+prefix+amount+'\\s*[.!]?$', 'i');
 const reverse=new RegExp('^use\\s+(?:a\\s+)?'+amount+'\\s+(?:total\\s+)?budget\\s*[.!]?$', 'i');
 const match=forward.exec(text.trim())??reverse.exec(text.trim());
 return !!match&&Number(match[1].replaceAll(',',''))*(match[2]?.trim().toLowerCase()==='k'?1000:match[2]?.trim().toLowerCase()==='m'?1000000:1)===value;
}

/** Ambiguous yes/midpoint confirmations require the visible editor or a stated rate. */
export function confirmsBasePayAmount(text:string,value:number){
 if(!Number.isFinite(value)||value<0)return false;
 const match=/^(?:please\s+)?(?:use|set|confirm)\s+(?:annual\s+base\s+pay|base\s+salary)\s*(?:to\s+)?(?:USD\s*|\$\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)(\s*[km])?\s*(?:;\s*budget remains unknown)?[.!]?$/i.exec(text.trim());
 return !!match&&Number(match[1].replaceAll(',',''))*(match[2]?.trim().toLowerCase()==='k'?1000:match[2]?.trim().toLowerCase()==='m'?1000000:1)===value;
}
