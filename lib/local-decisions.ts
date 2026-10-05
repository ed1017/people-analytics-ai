// @ts-expect-error Native Node tests use the same TypeScript source.
import {parseLocalGoals,emptyLocalGoals,GOALS_STORAGE_KEY,type LocalGoals} from "./local-goals.ts";
export const DECISIONS_STORAGE_KEY="insights-to-action.decisions.v1";
export const MAX_DECISION_BYTES=512*1024, MAX_STORE_BYTES=3*1024*1024, MAX_DECISION_MESSAGES=200;
export type Json = null|boolean|number|string|Json[]|{[key:string]:Json};
export type DecisionSlot={savedAt:string;fields:Record<string,Json>};
export type DecisionData={version:1;revision:number;removedGoalIds?:string[];goals:LocalGoals;workspaces:Record<string,DecisionSlot>};
export type DecisionSnapshot={ready:boolean;data:DecisionData;notice:string|null;saved:boolean};
type StoragePort=Pick<Storage,"getItem"|"setItem"|"removeItem">;
const empty=():DecisionData=>({version:1,revision:0,goals:emptyLocalGoals(),workspaces:{}});
const bytes=(s:string)=>new TextEncoder().encode(s).length;
const forbidden=new Set(["__proto__","prototype","constructor"]);
export function validateJson(value:unknown,depth=0):boolean {
 if(depth>20)return false;
 if(value===null||typeof value==="boolean")return true;
 if(typeof value==="number")return Number.isFinite(value);
 if(typeof value==="string")return value.length<=200000;
 if(Array.isArray(value))return value.length<=5000&&value.every(x=>validateJson(x,depth+1));
 return typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length<=300&&Object.entries(value).every(([k,v])=>!forbidden.has(k)&&k.length<=150&&validateJson(v,depth+1));
}
function checksum(text:string){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16)}
export function encodeDecisions(data:DecisionData){
 for(const slot of Object.values(data.workspaces)){
  if(bytes(JSON.stringify(slot))>MAX_DECISION_BYTES)throw Error("This decision exceeds its 512 KiB save limit. The working copy remains in this tab.");
  const chat=slot.fields.chat as {messages?:Json[]}|undefined;
  if(Array.isArray(chat?.messages)&&chat.messages.length>MAX_DECISION_MESSAGES)throw Error("This decision exceeds its 200-message save limit. The working copy remains in this tab.");
 }
 const payload=JSON.stringify(data),raw=JSON.stringify({payload:data,checksum:checksum(payload)});
 if(bytes(raw)>MAX_STORE_BYTES)throw Error("Decisions exceed the 3 MiB browser save limit. The working copy remains in this tab.");
 return raw;
}
export function parseDecisions(raw:string):DecisionData {
 if(bytes(raw)>MAX_STORE_BYTES)throw Error("Saved decisions exceed the supported size.");
 const envelope=JSON.parse(raw),data=envelope?.payload;
 if(!data||data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||checksum(JSON.stringify(data))!==envelope.checksum||!validateJson(data))throw Error("Saved decisions are corrupt or use an unsupported version. The saved copy was not changed.");
 const goals=parseLocalGoals(JSON.stringify(data.goals));
 if(data.removedGoalIds!==undefined&&(!Array.isArray(data.removedGoalIds)||data.removedGoalIds.some((id:unknown)=>typeof id!=="string"||!/^[a-zA-Z0-9-]{1,80}$/.test(id))))throw Error("Saved deletion metadata is invalid.");
 if(!data.workspaces||Array.isArray(data.workspaces)||typeof data.workspaces!=="object")throw Error("Saved decision workspaces are invalid.");
 const ids=new Set(goals.goals.map(g=>g.id));
 for(const [id,rawSlot] of Object.entries(data.workspaces)){
  const slot=rawSlot as DecisionSlot;
  if(!ids.has(id)||!slot||typeof slot.savedAt!=="string"||!slot.fields||Array.isArray(slot.fields)||typeof slot.fields!=="object")throw Error("A saved decision has no valid goal.");
  const chat=slot.fields.chat as {messages?:Json[];input?:Json}|undefined;
  if(chat&&(!Array.isArray(chat.messages)||chat.messages.some(m=>!m||Array.isArray(m)||typeof m!=="object"||!['user','assistant'].includes(String(m.role))||typeof m.content!=="string")||typeof chat.input!=="string"))throw Error("A saved conversation is invalid.");
 }
 encodeDecisions(data);return {...data,goals};
}
export class DecisionStore {
 private port:StoragePort|null=null;private expected:string|null=null;private blocked=false;
 private listeners=new Set<()=>void>();
 private state:DecisionSnapshot={ready:false,data:empty(),notice:null,saved:false};
 getSnapshot=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 private emit(){for(const fn of this.listeners)fn()}
 private fail(error:unknown){this.state={...this.state,saved:false,notice:(error instanceof Error?error.message:"Browser storage unavailable.")+" Changes are not saved; the previous saved copy remains intact."};this.emit()}
 initialize(port:StoragePort){
  if(this.state.ready)return this.state.data;
  this.port=port;
  try{this.expected=port.getItem(DECISIONS_STORAGE_KEY);const data=this.expected===null?{...empty(),goals:parseLocalGoals(port.getItem(GOALS_STORAGE_KEY))}:parseDecisions(this.expected);this.state={ready:true,data,notice:null,saved:this.expected!==null};if(this.expected===null)this.save(data);else this.emit();try{this.cleanLegacy()}catch(error){this.fail(error)}}
  catch(error){this.blocked=true;this.state={...this.state,ready:true};this.fail(error)}
  return this.state.data;
 }
 private save(data:DecisionData){
  this.state={...this.state,data,saved:false};
  if(!this.state.ready){this.emit();return}
  if(this.blocked){this.emit();return}
  try{
   if(!this.port)throw Error("Browser storage unavailable.");
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==this.expected){this.blocked=true;throw Error("Another tab changed saved decisions. Reload before making further saved changes.")}
   const next={...data,revision:data.revision+1},raw=encodeDecisions(next);this.port.setItem(DECISIONS_STORAGE_KEY,raw);this.expected=raw;this.state={ready:true,data:next,notice:null,saved:true};this.emit();
  }catch(error){this.fail(error)}
 }
 private cleanLegacy(){
  const ids=this.state.data.removedGoalIds??[];if(!ids.length||!this.port)return;
  const raw=this.port.getItem(GOALS_STORAGE_KEY);if(raw===null)return;
  const old=parseLocalGoals(raw),remaining=old.goals.filter(g=>!ids.includes(g.id));
  if(remaining.length===old.goals.length)return;
  if(!remaining.length)this.port.removeItem(GOALS_STORAGE_KEY);
  else this.port.setItem(GOALS_STORAGE_KEY,JSON.stringify({...old,activeId:ids.includes(old.activeId)?"":old.activeId,goals:remaining}));
 }
 saveGoals(goals:LocalGoals){
  const ids=new Set(goals.goals.map(g=>g.id));
  const removedGoalIds=[...new Set([...(this.state.data.removedGoalIds??[]),...this.state.data.goals.goals.filter(g=>!ids.has(g.id)).map(g=>g.id)])];
  this.save({...this.state.data,goals,removedGoalIds,workspaces:Object.fromEntries(Object.entries(this.state.data.workspaces).filter(([id])=>ids.has(id)))});
  if(this.state.saved)try{this.cleanLegacy()}catch(error){this.fail(Error("Legacy goal cleanup is pending: "+(error instanceof Error?error.message:"storage unavailable")))}
 }
 getField<T>(id:string,field:string,fallback:T):T{return (this.state.data.workspaces[id]?.fields[field] as T|undefined)??fallback}
 setField(id:string,field:string,value:unknown){
  if(!this.state.ready||!id||!this.state.data.goals.goals.some(g=>g.id===id))return;
  if(forbidden.has(field)||!validateJson(value)){this.fail(Error("This decision contains unsupported data and was not saved."));return}
  const before=this.state.data.workspaces[id];
  if(JSON.stringify(before?.fields[field])===JSON.stringify(value))return;
  this.save({...this.state.data,workspaces:{...this.state.data.workspaces,[id]:{savedAt:new Date().toISOString(),fields:{...before?.fields,[field]:value as Json}}}});
 }
 // One-envelope optimistic transaction. Unlike ordinary field editing, a failed
 // transaction never publishes its candidate as an unsaved working copy.
 commitGoalFields(id:string,goal:string,revision:number,at:string,build:(fields:Record<string,Json>)=>Record<string,Json>):number{
  try{
   if(!this.state.ready||!this.state.saved||this.blocked||!this.port)throw Error('Saved planning state is unavailable; reload or resolve storage before applying.');
   if(this.state.data.revision!==revision||this.state.data.goals.activeId!==id||this.state.data.goals.goals.find(item=>item.id===id)?.statement!==goal)throw Error('The goal or destination revision changed; preview again.');
   if(!/^\d{4}-\d\d-\d\dT/.test(at)||!Number.isFinite(Date.parse(at)))throw Error('Invalid application timestamp.');
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==this.expected){this.blocked=true;throw Error('Another tab changed saved decisions. Reload before applying.');}
   const original=this.state.data,expected=this.expected,before=original.workspaces[id],patch=build(structuredClone(before?.fields??{}));
   if(!validateJson(patch)||!patch||Array.isArray(patch)||typeof patch!=='object'||!Object.keys(patch).length)throw Error('Invalid or empty application transaction.');
   const next={...original,revision:revision+1,workspaces:{...original.workspaces,[id]:{savedAt:at,fields:{...before?.fields,...structuredClone(patch)}}}};
   const raw=encodeDecisions(next);parseDecisions(raw);
   // Recheck after candidate validation. localStorage has no native cross-tab CAS.
   if(this.state.data!==original||this.expected!==expected)throw Error('Planning state changed during candidate validation; preview again.');
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==expected){this.blocked=true;throw Error('Another tab changed saved decisions. Reload before applying.');}
   this.port.setItem(DECISIONS_STORAGE_KEY,raw);
   this.expected=raw;this.state={ready:true,data:next,notice:null,saved:true};this.emit();return next.revision;
  }catch(error){this.state={...this.state,saved:false,notice:(error instanceof Error?error.message:'Application failed.')+' Application inputs were not published; previous planning values are retained.'};this.emit();throw error;}
 }
 // Called by application UI storage-event listeners. Never import another tab's
 // state over this tab's edits, and never treat an event alone as a write receipt.
 invalidateExternalChange(){
  if(!this.port||!this.state.ready)return;
  try{if(this.port.getItem(DECISIONS_STORAGE_KEY)===this.expected)return;this.blocked=true;this.fail(Error('Another tab changed saved decisions. Reload before applying.'));}
  catch(error){this.blocked=true;this.fail(error)}
 }
 retry(){this.save(this.state.data);if(this.state.saved)try{this.cleanLegacy()}catch(error){this.fail(error)}}
 clearAll(){
  // Explicit destructive UI action only; never used as automatic corruption recovery.
  try{if(!this.port)throw Error("Browser storage unavailable.");this.expected=this.port.getItem(DECISIONS_STORAGE_KEY);this.blocked=false;const removedGoalIds=[...new Set([...(this.state.data.removedGoalIds??[]),...this.state.data.goals.goals.map(g=>g.id)])];this.save({...empty(),removedGoalIds});if(this.state.saved)this.port.removeItem(GOALS_STORAGE_KEY)}catch(error){this.fail(error)}
 }
}
