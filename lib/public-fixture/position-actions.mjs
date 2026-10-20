import {positionActionDefaults,positionActionScenario} from '../position-action-engine.ts';
import {canonicalJson,sha256} from './read-provider.mjs';

export const POSITION_ACTIONS_CONTRACT='public-position-actions-data-v1';
const fail=message=>{throw Error('Invalid public position input: '+message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function validatePositionRequest(body){
 const fields=['add_positions','close_vacant_positions','freeze_vacancies','vacancy_fill_pct'];
 if(!object(body)||Object.keys(body).some(k=>!fields.includes(k)))fail('assumptions');
 for(const [key,value]of Object.entries(body))if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>(key==='vacancy_fill_pct'?100:5000)||(key!=='vacancy_fill_pct'&&!Number.isInteger(value)))fail('bounded numbers');
 return structuredClone(body);
}
export function createPositionActionsCalculator(text,trustedDigest){
 if(typeof text!=='string'||Buffer.byteLength(text)>16384||!hash(trustedDigest)||sha256(text)!==trustedDigest)fail('manifest digest/size');
 let manifest;try{manifest=JSON.parse(text);}catch{fail('JSON');}
 if(!exact(manifest,['schemaVersion','contract','provenance','document'])||manifest.schemaVersion!==1||manifest.contract!==POSITION_ACTIONS_CONTRACT)fail('manifest');
 const {provenance:p,document:d}=manifest;
 if(!exact(p,['origin','capturedAt','parity'])||p.origin!=='https://www.ed-ai.app'||p.parity!=='position-actions-get-data-only'||typeof p.capturedAt!=='string'||!Number.isFinite(Date.parse(p.capturedAt))||new Date(p.capturedAt).toISOString()!==p.capturedAt)fail('provenance');
 if(!exact(d,['target','sha256','body'])||d.target!=='/api/position-actions'||!hash(d.sha256)||sha256(canonicalJson(d.body))!==d.sha256)fail('document');
 const b=d.body,c=b?.current;
 if(!exact(b,['as_of','defaults','current','bounds'])||b.as_of!=='2026-09-30'||!exact(c,['authorized_positions','filled_positions','open_vacancies','frozen_positions','closed_positions'])||!Object.values(c).every(v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000)||c.authorized_positions!==c.filled_positions+c.open_vacancies+c.frozen_positions)fail('inventory');
 const inventory=freeze({asOf:b.as_of,authorizedPositions:c.authorized_positions,filledPositions:c.filled_positions,openVacancies:c.open_vacancies,frozenPositions:c.frozen_positions,closedPositions:c.closed_positions});
 if(canonicalJson(positionActionDefaults(inventory))!==canonicalJson(b))fail('defaults/bounds');
 freeze(manifest);
 return Object.freeze({contract:POSITION_ACTIONS_CONTRACT,read:()=>b,calculate(raw){
  const body=validatePositionRequest(raw),data=positionActionScenario(body,inventory),a=data.assumptions;
  // Exact public adapter accounting, including unrounded input fill percentage.
  const fillable=inventory.openVacancies+a.add_positions-a.close_vacant_positions-a.freeze_vacancies,fills=fillable*(body.vacancy_fill_pct??0)/100;
  const before={authorized:inventory.authorizedPositions,filled:inventory.filledPositions,vacant:inventory.openVacancies,frozen:inventory.frozenPositions};
  const after={authorized:inventory.authorizedPositions+a.add_positions-a.close_vacant_positions,filled:inventory.filledPositions+fills,vacant:fillable-fills,frozen:inventory.frozenPositions+a.freeze_vacancies};
  if(Math.abs(after.authorized-after.filled-after.vacant-after.frozen)>1e-7)fail('stock reconciliation');
  Object.assign(data.modeled,{authorized_positions:after.authorized,filled_positions:after.filled,open_vacancies:after.vacant,frozen_positions:after.frozen,projected_fills:fills,net_filled_position_change:fills});
  data.accounting={basis:'Unrounded conditional capacity; UI labels round independently. No observed hires or exits.',before,after,effective_fill_pct:body.vacancy_fill_pct??0,added:a.add_positions,closed:a.close_vacant_positions,newly_frozen:a.freeze_vacancies,conditional_fills:fills};
  data.methodology.unshift('Constructed what-if position capacity. Fills do not create employee records or establish realized hires.');
  return freeze(data);
 }});
}
