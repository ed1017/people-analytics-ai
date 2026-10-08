// @ts-expect-error Native Node tests share TypeScript source.
import {mergeDecisionRecovery,type RecoveryConflict} from './decision-recovery.ts';
// @ts-expect-error Native Node tests use the same TypeScript source.
import {homeDemoField,readHomeDemo} from './home-demo-catalog.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeGuideOriginField,readHomeGuideOrigin} from './home-guide-origin.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {parseLocalGoals,emptyLocalGoals,GOALS_STORAGE_KEY,type LocalGoals} from "./local-goals.ts";
export const DECISION_RECOVERY_KEY='insights-to-action.decisions.recovery.v1';
export const DECISIONS_STORAGE_KEY="insights-to-action.decisions.v1";
export const MAX_DECISION_BYTES=512*1024, MAX_STORE_BYTES=3*1024*1024, MAX_DECISION_MESSAGES=200;
export type Json = null|boolean|number|string|Json[]|{[key:string]:Json};
export type DecisionSlot={savedAt:string;fields:Record<string,Json>};
export type DecisionData={version:1;revision:number;removedGoalIds?:string[];exploration?:DecisionSlot;goals:LocalGoals;workspaces:Record<string,DecisionSlot>};
export type DecisionSnapshot={ready:boolean;data:DecisionData;notice:string|null;saved:boolean;recovery?:{conflicts:RecoveryConflict[]}};
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
 for(const slot of [...Object.values(data.workspaces),...(data.exploration?[data.exploration]:[])]){
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
 if(Object.hasOwn(data.workspaces,''))throw Error('Exploration cannot masquerade as a saved goal.');
 for(const [id,rawSlot] of [...Object.entries(data.workspaces),...(data.exploration?[['',data.exploration] as const]:[])]){
  const slot=rawSlot as DecisionSlot;
  if(id!==''&&!ids.has(id)||!slot||typeof slot.savedAt!=="string"||!slot.fields||Array.isArray(slot.fields)||typeof slot.fields!=="object")throw Error("A saved decision has no valid goal.");
  const chat=slot.fields.chat as {messages?:Json[];input?:Json}|undefined;
  if(chat&&(!Array.isArray(chat.messages)||chat.messages.some(m=>!m||Array.isArray(m)||typeof m!=="object"||!['user','assistant'].includes(String(m.role))||typeof m.content!=="string")||typeof chat.input!=="string"))throw Error("A saved conversation is invalid.");
 }
 encodeDecisions(data);return {...data,goals};
}
export class DecisionStore {
 private port:StoragePort|null=null;private expected:string|null=null;private blocked=false;
 private recoveryPort:StoragePort|null=null;private recovery:{base:DecisionData;draft:DecisionData}|null=null;
 private listeners=new Set<()=>void>();
 private state:DecisionSnapshot={ready:false,data:empty(),notice:null,saved:false};
 getSnapshot=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 private emit(){for(const fn of this.listeners)fn()}
 private preserveRecovery(force=false){
  if(!this.state.ready)return;
  try{const base=this.recovery?.base??(this.expected?parseDecisions(this.expected):empty());if(!force&&JSON.stringify(base)===JSON.stringify(this.state.data))return;this.recovery={base,draft:structuredClone(this.state.data)};this.recoveryPort?.setItem(DECISION_RECOVERY_KEY,JSON.stringify({version:1,base:encodeDecisions(base),draft:encodeDecisions(this.state.data)}));this.state={...this.state,recovery:{conflicts:[]}};}
  catch{this.state={...this.state,notice:(this.state.notice??'Saving failed.')+' A reload recovery copy could not be saved; keep this tab open.'};}
 }
 private clearRecovery(){const active=!!this.recovery;this.recovery=null;try{if(active)this.recoveryPort?.removeItem(DECISION_RECOVERY_KEY);}catch{/* The saved main envelope remains authoritative. */}const {recovery:_,...state}=this.state;void _;this.state=state;}
 private fail(error:unknown,forceRecovery=false){this.state={...this.state,saved:false,notice:(error instanceof Error?error.message:"Browser storage unavailable.")+" Changes are not saved; the previous saved copy remains intact."};this.preserveRecovery(forceRecovery);this.emit()}
 initialize(port:StoragePort,firstRun?:()=>Pick<DecisionData,'goals'|'workspaces'>,recoveryPort?:StoragePort){
  if(this.state.ready)return this.state.data;
  this.port=port;this.recoveryPort=recoveryPort??null;
  try{this.expected=port.getItem(DECISIONS_STORAGE_KEY);let data:DecisionData;
   if(this.expected===null){const legacy=port.getItem(GOALS_STORAGE_KEY);data={...empty(),...(legacy===null&&firstRun?firstRun():{goals:parseLocalGoals(legacy)})};}
   else data=parseDecisions(this.expected);
   this.state={ready:true,data,notice:null,saved:this.expected!==null};if(this.expected===null)this.save(data);else this.emit();try{this.cleanLegacy()}catch(error){this.fail(error)}}
  catch(error){this.blocked=true;this.state={...this.state,ready:true};this.fail(error)}
  try{const raw=this.recoveryPort?.getItem(DECISION_RECOVERY_KEY);if(raw){const value=JSON.parse(raw);if(value.version!==1)throw Error('Unsupported recovery version.');const base=parseDecisions(value.base),draft=parseDecisions(value.draft);this.recovery={base,draft};if(JSON.stringify(draft)!==JSON.stringify(this.state.data)){this.recovery={base,draft};const review=mergeDecisionRecovery(base,draft,this.state.data);this.blocked=true;this.state={...this.state,data:draft,saved:false,recovery:{conflicts:review.conflicts},notice:'An unsaved draft was recovered in this tab. Review and recover it before applying or attaching. Saved work from other tabs is unchanged.'};this.emit();}else this.clearRecovery();}}
  catch{this.state={...this.state,notice:'The tab recovery copy could not be verified. Saved decisions were kept; the recovery copy was not removed.'};this.emit();}
  return this.state.data;
 }
 private save(data:DecisionData){
  this.state={...this.state,data,saved:false};
  if(!this.state.ready){this.emit();return}
  if(this.blocked){this.preserveRecovery();this.emit();return}
  try{
   if(!this.port)throw Error("Browser storage unavailable.");
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==this.expected){this.blocked=true;throw Error("Another tab changed saved decisions. Reload before making further saved changes.")}
   const next={...data,revision:data.revision+1},raw=encodeDecisions(next);this.port.setItem(DECISIONS_STORAGE_KEY,raw);this.expected=raw;this.state={ready:true,data:next,notice:null,saved:true};this.clearRecovery();this.emit();
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
 getField<T>(id:string,field:string,fallback:T):T{return ((id?this.state.data.workspaces[id]:this.state.data.exploration)?.fields[field] as T|undefined)??fallback}
 setField(id:string,field:string,value:unknown){
  if(!this.state.ready||id&&!this.state.data.goals.goals.some(g=>g.id===id))return;
  if(forbidden.has(field)||!validateJson(value)){this.fail(Error("This decision contains unsupported data and was not saved."));return}
  const before=id?this.state.data.workspaces[id]:this.state.data.exploration;
  if(JSON.stringify(before?.fields[field])===JSON.stringify(value))return;
  const slot={savedAt:new Date().toISOString(),fields:{...before?.fields,[field]:value as Json}};
  this.save({...this.state.data,...(id?{workspaces:{...this.state.data.workspaces,[id]:slot}}:{exploration:slot})});
 }
 // One-envelope optimistic transaction. Unlike ordinary field editing, a failed
 // transaction never publishes its candidate as an unsaved working copy.
 commitGoalFields(id:string,goal:string,revision:number,at:string,build:(fields:Record<string,Json>)=>Record<string,Json>):number{
  if(!id)throw Error('A saved goal is required for this transaction.');
  return this.commitWorkspace(id,goal,revision,at,build,false);
 }
 commitExplorationFields(revision:number,at:string,build:(fields:Record<string,Json>)=>Record<string,Json>):number{
  return this.commitWorkspace('','',revision,at,build,false);
 }
 commitGoalSelection(id:string,goal:string,revision:number,at:string,build:(fields:Record<string,Json>)=>Record<string,Json>,isolatedExample=false):number{
  if(isolatedExample&&!/^guided-[a-zA-Z0-9-]+$/.test(id))throw Error('Invalid isolated example identity.');
  return this.commitWorkspace(id,goal,revision,at,build,true,isolatedExample);
 }
 private commitWorkspace(id:string,goal:string,revision:number,at:string,build:(fields:Record<string,Json>)=>Record<string,Json>,selection:boolean,isolatedExample=false):number{
  try{
   if(!this.state.ready||!this.state.saved||this.blocked||!this.port)throw Error('Saved planning state is unavailable; reload or resolve storage before applying.');
   const creating=selection&&!this.state.data.goals.activeId;
   if(this.state.data.revision!==revision||!creating&&(this.state.data.goals.activeId!==id||(this.state.data.goals.goals.find(item=>item.id===id)?.statement??'')!==goal))throw Error('The goal or destination revision changed; preview again.');
   if(creating){
    if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!goal.trim()||goal.length>240||goal!==goal.trim())throw Error('Review the goal before selecting this proposal.');
    if(this.state.data.removedGoalIds?.includes(id)||this.state.data.goals.goals.some(item=>item.id===id||!isolatedExample&&item.statement.toLocaleLowerCase()===goal.toLocaleLowerCase()&&!readHomeGuideOrigin(this.state.data.workspaces[item.id]?.fields[homeGuideOriginField],item.id)&&readHomeDemo(this.state.data.workspaces[item.id]?.fields[homeDemoField],item.id)?.example.goal!==item.statement))throw Error('This goal already exists or was removed. Select the existing goal to continue; your exploration is kept.');
    if(this.state.data.goals.goals.length>=20)throw Error('Your saved goals are full. Your exploration is kept.');
   }
   if(!/^\d{4}-\d\d-\d\dT/.test(at)||!Number.isFinite(Date.parse(at)))throw Error('Invalid application timestamp.');
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==this.expected){this.blocked=true;throw Error('Another tab changed saved decisions. Reload before applying.');}
   const original=this.state.data,expected=this.expected,before=id?original.workspaces[id]:original.exploration,patch=build(structuredClone(before?.fields??{}));
   if(!validateJson(patch)||!patch||Array.isArray(patch)||typeof patch!=='object'||!Object.keys(patch).length)throw Error('Invalid or empty application transaction.');
   const slot={savedAt:at,fields:{...before?.fields,...structuredClone(patch)}};
   const guideOrigin=readHomeGuideOrigin(before?.fields[homeGuideOriginField],id);
   if(guideOrigin||isolatedExample)slot.fields[homeGuideOriginField]=guideOrigin??{version:1,origin:'conversation-guide-v1',goalId:id,createdAt:at};
   const next:DecisionData={...original,revision:revision+1,...(id?{workspaces:{...original.workspaces,[id]:slot}}:{exploration:slot})};
   if(creating){next.goals={...original.goals,activeId:id,goals:[...original.goals.goals,{id,statement:goal}]};if(!isolatedExample)delete next.exploration;}
   const raw=encodeDecisions(next);parseDecisions(raw);
   // Recheck after candidate validation. localStorage has no native cross-tab CAS.
   if(this.state.data!==original||this.expected!==expected)throw Error('Planning state changed during candidate validation; preview again.');
   if(this.port.getItem(DECISIONS_STORAGE_KEY)!==expected){this.blocked=true;throw Error('Another tab changed saved decisions. Reload before applying.');}
   this.port.setItem(DECISIONS_STORAGE_KEY,raw);
   this.expected=raw;this.state={ready:true,data:next,notice:null,saved:true};this.clearRecovery();this.emit();return next.revision;
  }catch(error){this.state={...this.state,saved:false,notice:(error instanceof Error?error.message:'Application failed.')+' Application inputs were not published; previous planning values are retained. Retry saving to review the latest saved work, then repeat the action explicitly.'};this.preserveRecovery(true);this.emit();throw error;}
 }
 // Called by application UI storage-event listeners. Never import another tab's
 // state over this tab's edits, and never treat an event alone as a write receipt.
 invalidateExternalChange(){
  if(!this.port||!this.state.ready)return;
  try{if(this.port.getItem(DECISIONS_STORAGE_KEY)===this.expected)return;this.blocked=true;this.fail(Error('Another tab changed saved decisions. Recover saved work before applying.'),true);}
  catch(error){this.blocked=true;this.fail(error)}
 }
 recoverDraft(keepSavedConflicts=false){
  if(!this.recovery||!this.port)return;
  try{const raw=this.port.getItem(DECISIONS_STORAGE_KEY),saved=raw?parseDecisions(raw):empty(),review=mergeDecisionRecovery(this.recovery.base,this.recovery.draft,saved,keepSavedConflicts);
   if(review.conflicts.length&&!keepSavedConflicts){this.state={...this.state,recovery:{conflicts:review.conflicts},notice:'Both tabs changed some of the same work. Keep the saved versions and your unsent request, or keep this tab open to review the recovered draft. No saved history was overwritten.'};this.emit();return;}
   if(review.data.goals.goals.length>20)throw Error('Recovery would exceed the 20-goal limit. Your recovered draft is kept for review.');
   parseDecisions(encodeDecisions(review.data));this.expected=raw;this.blocked=false;this.save(review.data);
  }catch(error){this.fail(error);}
 }
 retry(){if(this.recovery){this.recoverDraft();return;}this.save(this.state.data);if(this.state.saved)try{this.cleanLegacy()}catch(error){this.fail(error)}}
 clearAll(){
  // Explicit destructive UI action only; never used as automatic corruption recovery.
  try{if(!this.port)throw Error("Browser storage unavailable.");this.expected=this.port.getItem(DECISIONS_STORAGE_KEY);this.blocked=false;const removedGoalIds=[...new Set([...(this.state.data.removedGoalIds??[]),...this.state.data.goals.goals.map(g=>g.id)])];this.save({...empty(),removedGoalIds});if(this.state.saved)this.port.removeItem(GOALS_STORAGE_KEY)}catch(error){this.fail(error)}
 }
}
