// @ts-expect-error Native tests use canonical TypeScript imports.
import {readMarketContext} from './market-context-lookup.ts';
// @ts-expect-error Native tests use canonical TypeScript imports.
import {positionMarketCatalogReferences} from './position-market-context.ts';
const marketCountries=new Set(positionMarketCatalogReferences().map(reference=>reference.countryCode));
const countryNames:Record<string,string>={US:'United States',GB:'United Kingdom',FR:'France',CA:'Canada',DE:'Germany',SG:'Singapore',AU:'Australia',JP:'Japan',BR:'Brazil',IN:'India'};
export function marketCountryLabel(code:string){return countryNames[code]??(code?`Country (${code})`:'Choose a country');}
import type {ChatMessage} from './types';
export type MarketChatState={version:1;id:string;country:string;role:string;result:ReturnType<typeof readMarketContext>|null};
export function newMarketChatMessage(id:string):ChatMessage{return {role:'assistant',content:'Choose a country and role to explore hiring market insights.',marketInsights:{version:1,id,country:'',role:'',result:null}};}
export function readMarketChatState(raw:unknown):MarketChatState|null{
 try{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join()!=='country,id,result,role,version')return null;const x=raw as MarketChatState;
 if(x.version!==1||typeof x.id!=='string'||!x.id||x.id.length>100||typeof x.country!=='string'||!!x.country&&!marketCountries.has(x.country)||typeof x.role!=='string'||x.role.length>120||!x.country&&x.role||new TextEncoder().encode(JSON.stringify(x)).length>50000)return null;
 const actual=x.country&&x.role?readMarketContext({country:x.country,role:x.role,occupationCode:null,kind:'all'}):null;
 if(x.role&&actual?.status!=='available')return null;
 if(x.result!==null){
 if(!actual||actual.status!=='available'||x.result.status!=='available'||!('references' in actual)||!('references' in x.result)||!Array.isArray(x.result.references)||!x.result.references.length||x.result.references.length>actual.references.length)return null;
 const {references:saved,...savedEnvelope}=x.result,{references:current,...currentEnvelope}=actual;
 if(JSON.stringify(savedEnvelope)!==JSON.stringify(currentEnvelope)||new Set(saved.map(r=>r.id)).size!==saved.length||saved.some(ref=>!current.some(candidate=>JSON.stringify(candidate)===JSON.stringify(ref))))return null;
 }
 return structuredClone(x);
 }catch{return null;}
}
export function changeMarketChatMessage(messages:ChatMessage[],id:string,expected:MarketChatState,next:MarketChatState):ChatMessage[]{
 const valid=readMarketChatState(next);if(!valid||valid.id!==id||messages.filter(m=>m.marketInsights?.id===id).length!==1)return messages;
 return messages.map(message=>message.role==='assistant'&&message.marketInsights?.id===id&&JSON.stringify(message.marketInsights)===JSON.stringify(expected)?{...message,marketInsights:valid,content:valid.result?`Hiring market insights for ${valid.role} in ${marketCountryLabel(valid.country)}. Published sources are shown with this message.`:'Choose a country and role to explore hiring market insights.'}:message);
}

export function marketChatFollowup(question:string,raw:unknown){const state=readMarketChatState(raw);if(!state?.result||state.result.status!=='available')return question;return question+'\n\nMarket selected for this question: '+JSON.stringify({country:marketCountryLabel(state.country),role:state.role})+'. Use read_market_context for current source facts. This is question scope only, not position adoption or approval. If my question explicitly changes this scope, follow the question.';}

export function canAskMarketQuestion(context:{selectedPlan:unknown;demand:unknown;model:unknown;positions:boolean;scenarioChat:boolean}){return !context.selectedPlan&&!context.demand&&!context.model&&!context.positions&&!context.scenarioChat;}
