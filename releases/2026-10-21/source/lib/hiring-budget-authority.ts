// @ts-expect-error Native tests share source.
import {demoBusinessUnitNames} from './catalog-display.ts';
// @ts-expect-error Native tests share source.
import {readStaffingTemplate} from './staffing-template.ts';
/** Only an explicit standalone total-ceiling command can adopt funding through chat. */
export function confirmsBudgetAmount(text:string,value:number){
 if(!Number.isFinite(value)||value<0)return false;
 const amount='(?:USD\\s*|\\$\\s*)?([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)(\\s*[km])?';
 const prefix='(?:(?:please\\s+)?(?:set|change|reduce|increase|update)\\s+(?:(?:our|the|total|incremental)\\s+)*budget\\s+(?:to|at)\\s+|(?:our\\s+|the\\s+)?(?:total\\s+)?budget\\s*(?:(?:is|of)\\s+)?)';
 const forward=new RegExp('^'+prefix+amount+'\\s*[.!]?$', 'i');
 const reverse=new RegExp('^use\\s+(?:a\\s+)?'+amount+'\\s+(?:total\\s+)?budget\\s*[.!]?$', 'i');
 const template=readStaffingTemplate(text);
 // Only bounded category/count fields may accompany automatic funding adoption.
 // Free-text description, location, deadline or department needs normal interpretation
 // and explicit ceiling confirmation; negation in any field must not be ignored.
 const boundedTemplate=template&&['description','location','needed by','department/team'].every(key=>!template[key])&&
  (!template['fte needed']||/^\d+(?:\.\d+)?$/.test(template['fte needed']))&&
  (!template.role||/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+(?:,\s*[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)*$/.test(template.role))&&
  (!template.level||/^(?:L\d+|(?:level\s+)?\d+(?:\s+\(L\d+\))?)$/i.test(template.level))&&
  (!template['business unit']||Object.entries(demoBusinessUnitNames).some(([code,name])=>template['business unit']===code||template['business unit']===`${name} (${code})`))&&
  !/\b(?:not|unapproved|hypothetical|assume|assumed|estimate|approve|budget)\b/i.test(Object.entries(template).filter(([key])=>key!=='budget (optional)').map(([,value])=>value).join(' '));
 const budget=boundedTemplate?template['budget (optional)']:null;
 // Blank/unknown is not zero. A field value cannot borrow an amount from prose.
 const match=forward.exec(text.trim())??reverse.exec(text.trim())??(budget?new RegExp('^'+amount+'$', 'i').exec(budget):null);
 return !!match&&Number(match[1].replaceAll(',',''))*(match[2]?.trim().toLowerCase()==='k'?1000:match[2]?.trim().toLowerCase()==='m'?1000000:1)===value;
}

/** Ambiguous yes/midpoint confirmations require the visible editor or a stated rate. */
export function confirmsBasePayAmount(text:string,value:number){
 if(!Number.isFinite(value)||value<0)return false;
 const match=/^(?:please\s+)?(?:use|set|confirm)\s+(?:annual\s+base\s+pay|base\s+salary)\s*(?:to\s+)?(?:USD\s*|\$\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)(\s*[km])?\s*(?:;\s*budget remains unknown)?[.!]?$/i.exec(text.trim());
 return !!match&&Number(match[1].replaceAll(',',''))*(match[2]?.trim().toLowerCase()==='k'?1000:match[2]?.trim().toLowerCase()==='m'?1000000:1)===value;
}
