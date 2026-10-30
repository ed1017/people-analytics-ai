// @ts-expect-error Native tests share the versioned generator.
import {generateCompanyPositionInventoryV2} from './company-position-model-v2.ts';
import companyConstraints from './data/position-inventory-constraints-v1.json' with {type:'json'};
// @ts-expect-error Native tests share TypeScript source.
import {catalogDisplayLabel} from './catalog-display.ts';
/** Separate scenario-demo register. Never expands grouped company counts into purported source rows. */
export type InventoryPosition = Readonly<{
  id:string;role:string;team:string;location:string;fte:number|null;budgeted:boolean;level?:string;
  status:'filled'|'vacant';vacancyStatus:'recruiting'|'available'|'frozen'|'on-hold'|null;
}>
export type PositionInventory = Readonly<{
  version:string;asOf:string;source:'illustrative-demo'|'aggregate-constrained-model';positions:readonly InventoryPosition[];
}>
export const POSITION_INVENTORY_VERSION='position-register-demo-v1';
export const INVENTORY_ROLES=['Service Operations Analyst','Data Analyst','Software Engineer','Team Lead'] as const;
export const INVENTORY_TEAMS=['Service Delivery','Client Operations','Platform Engineering'] as const;
export const INVENTORY_LOCATIONS=['Toronto','New York','London'] as const;

/** 60 filled slots, 12 active vacancies and four frozen vacancies. No employee/requisition mapping. */
export function generateDemoPositionInventory():PositionInventory {
 const positions:InventoryPosition[]=[];
 for(let i=0;i<60;i++)positions.push(Object.freeze({
  id:`DEMO-POS-${String(i+1).padStart(4,'0')}`,role:INVENTORY_ROLES[i%4],
  team:INVENTORY_TEAMS[i%3],location:INVENTORY_LOCATIONS[Math.floor(i/3)%3],
  fte:i%5===0?0.5:1,budgeted:true,status:'filled',vacancyStatus:null,
 }));
 for(let i=0;i<16;i++)positions.push(Object.freeze({
  id:`DEMO-POS-${String(i+61).padStart(4,'0')}`,
  role:i<12?'Service Operations Analyst':'Software Engineer',
  team:i<12?'Service Delivery':'Platform Engineering',location:i<12?'Toronto':'London',
  fte:1,budgeted:true,status:'vacant',vacancyStatus:i>=12?'frozen':i<8?'recruiting':'available',
 }));
 return Object.freeze({version:POSITION_INVENTORY_VERSION,asOf:'2026-09-30',source:'illustrative-demo',positions:Object.freeze(positions)});
}
export const DEMO_POSITION_INVENTORY=generateDemoPositionInventory();
export type InventoryFilters={search:string;role:string;team:string;location:string;status:string};
export const emptyInventoryFilters=():InventoryFilters=>({search:'',role:'',team:'',location:'',status:''});
export function filterInventory(inventory:PositionInventory,filter:InventoryFilters){
 const query=filter.search.trim().toLocaleLowerCase();
 return inventory.positions.filter(p=>(!query||[p.id,p.role,p.team,p.location].join(' ').toLocaleLowerCase().includes(query))&&
  (!filter.role||p.role===filter.role)&&(!filter.team||p.team===filter.team)&&(!filter.location||p.location===filter.location)&&
  (!filter.status||filter.status==='filled'&&p.status==='filled'||filter.status==='vacant'&&p.status==='vacant'||p.vacancyStatus===filter.status));
}
export function inventorySummary(positions:readonly InventoryPosition[]){
 const filled=positions.filter(p=>p.status==='filled');
 const sumFte=(rows:readonly InventoryPosition[])=>rows.some(p=>p.fte===null)?null:rows.reduce((sum,p)=>sum+(p.fte??0),0);
 return {positions:positions.length,budgeted:positions.filter(p=>p.budgeted).length,filled:filled.length,
  vacant:positions.filter(p=>p.status==='vacant').length,frozen:positions.filter(p=>p.vacancyStatus==='frozen').length,
  recruiting:positions.filter(p=>p.vacancyStatus==='recruiting').length,available:positions.filter(p=>p.vacancyStatus==='available').length,
  onHold:positions.filter(p=>p.vacancyStatus==='on-hold').length,positionFte:sumFte(positions),filledPositionFte:sumFte(filled)};
}

/** Full company-scale modeled register constrained by the reviewed public synthetic aggregates.
 * IDs and placements within a cohort are constructed, not observed position records.
 * Location and position FTE are deliberately unknown; budgeted=true is an explicit modeling assumption.
 */
export function generateCompanyPositionInventory():PositionInventory {
 const positions:InventoryPosition[]=[];
 for(const group of [...companyConstraints.combinations].sort((a,b)=>JSON.stringify([a.org_code,a.job_profile_code,a.level_code]).localeCompare(JSON.stringify([b.org_code,b.job_profile_code,b.level_code])))){
  const counts=[group.current_positions,group.vacant_positions,group.frozen_positions,group.open_requisition_vacancies,group.on_hold_requisition_vacancies,group.uncovered_vacancies];
  if(counts.some(v=>!Number.isSafeInteger(v)||v<0)||group.vacant_positions>group.current_positions||group.open_requisition_vacancies+group.on_hold_requisition_vacancies+group.uncovered_vacancies!==group.vacant_positions)throw Error('Company position constraints do not reconcile.');
  const filled=group.current_positions-group.vacant_positions,total=group.current_positions+group.frozen_positions;
  const role=catalogDisplayLabel(companyConstraints.job_profiles.find(p=>p.job_profile_code===group.job_profile_code)?.job_profile_name??group.job_profile_code);
  const team=catalogDisplayLabel(companyConstraints.business_units.find(p=>p.org_code===group.org_code)?.org_name??group.org_code);
  for(let i=0;i<total;i++){
   const vacancy=i-filled,status=i<filled?'filled' as const:'vacant' as const;
   const vacancyStatus=status==='filled'?null:i>=group.current_positions?'frozen' as const:vacancy<group.open_requisition_vacancies?'recruiting' as const:vacancy<group.open_requisition_vacancies+group.on_hold_requisition_vacancies?'on-hold' as const:'available' as const;
   positions.push(Object.freeze({id:`MODEL-${group.org_code}--${group.job_profile_code}--${group.level_code}--${String(i+1).padStart(4,'0')}`,role,team,level:group.level_code,location:'Not supplied',fte:null,budgeted:true,status,vacancyStatus}));
  }
 }
 return Object.freeze({version:'company-position-model-v1',asOf:companyConstraints.asOf,source:'aggregate-constrained-model',positions:Object.freeze(positions)});
}
export const COMPANY_POSITION_INVENTORY=generateCompanyPositionInventory();
export const COMPANY_POSITION_INVENTORY_V2=generateCompanyPositionInventoryV2();
export const POSITION_INVENTORIES=[COMPANY_POSITION_INVENTORY_V2,COMPANY_POSITION_INVENTORY,DEMO_POSITION_INVENTORY] as const;
export function resolvePositionInventory(version:string):PositionInventory {
 const inventory=POSITION_INVENTORIES.find(i=>i.version===version);
 if(!inventory)throw Error('Unsupported inventory version. The saved baseline was not replaced.');
 return inventory;
}
export type PositionInventoryReference=Pick<PositionInventory,'version'|'asOf'|'source'>;
export const positionInventoryReference=(i:PositionInventory):PositionInventoryReference=>({version:i.version,asOf:i.asOf,source:i.source});

/** Deterministic identity check, not a cryptographic signature or source authenticity claim. */
const inventoryKeys=new WeakMap<PositionInventory,string>();
export function positionInventoryKey(inventory:PositionInventory){
 const cached=inventoryKeys.get(inventory);if(cached)return cached;
 const text=JSON.stringify(inventory);let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
 const result=(hash>>>0).toString(16).padStart(8,'0');
 if(Object.isFrozen(inventory)&&Object.isFrozen(inventory.positions))inventoryKeys.set(inventory,result);
 return result;
}
export function requireReviewedPositionInventory(value:unknown):asserts value is PositionInventoryReference {
 if(!value||typeof value!=='object')throw Error('Unsupported inventory snapshot.');
 const expected=positionInventoryReference(resolvePositionInventory((value as PositionInventoryReference).version));
 if(JSON.stringify(value)!==JSON.stringify(expected))throw Error('This inventory snapshot is unsupported. Saved records are retained; no baseline was substituted.');
}
