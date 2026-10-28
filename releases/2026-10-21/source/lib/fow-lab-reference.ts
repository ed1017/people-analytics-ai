import catalog from '../data/fow-lab-reference-catalog.json' with {type:'json'};
import type {DecisionStore,Json} from './local-decisions';

export const fowLabReferenceField='fowLabReferenceV1';
export type FoWLabSelection={functionName?:string|null;jobKey?:string|null};
/** Compact canonical identity only. Exposure and adoption never become workforce inputs. */
export function canonicalFoWLabReference(input:unknown={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Review the Lab selection.');
 const value=input as Record<string,unknown>;
 const key=(name:string)=>{const v=value[name];if(v===undefined||v===null||v==='')return null;if(typeof v!=='string')throw Error('Invalid Lab selection.');return v;};
 let functionName=key('functionName');const jobKey=key('jobKey');
 const job=jobKey?catalog.jobs.find(row=>row.job_key===jobKey):null;
 if(jobKey&&!job)throw Error('This Lab job is unavailable.');
 if(functionName&&!catalog.functions.some(row=>row.function_name===functionName))throw Error('This Lab function is unavailable.');
 if(job&&functionName&&job.function_name!==functionName)throw Error('The selected Lab job does not belong to this function.');
 if(job)functionName=job.function_name;
 return {version:1 as const,kind:'fow-lab-reference' as const,source:{...catalog.meta,dataset:{...catalog.dataset},functionCount:catalog.functions.length},selection:{functionName,jobKey,jobTitle:job?.title??null},planningStatus:'Separate Lab reference only. No mapping to the app workforce, hours saved, FTE, capacity or cost assumptions is applied.'};
}
export type FoWLabReference=ReturnType<typeof canonicalFoWLabReference>&{goalId:string;goal:string;destinationDatasetToken:string};
function record(selection:unknown,goalId:string,goal:string,destinationDatasetToken:string):FoWLabReference{
 return {...canonicalFoWLabReference(selection),goalId,goal,destinationDatasetToken};
}
/** Unsupported versions/tampered snapshots stay stored but never acquire new canonical values. */
export function readFoWLabReference(input:unknown,context:{goalId:string;goal:string;datasetToken:string}):FoWLabReference|null{
 if(!input||typeof input!=='object')return null;
 const value=input as Record<string,unknown>;
 try{const canonical=record(value.selection,context.goalId,context.goal,context.datasetToken);return JSON.stringify(value)===JSON.stringify(canonical)?canonical:null;}catch{return null;}
}
export function saveFoWLabReference({store,datasetToken,goalId,goal,revision,selection,at}:{store:DecisionStore;datasetToken:string;goalId:string;goal:string;revision:number;selection:unknown|null;at:string}){
 const snapshot=store.getSnapshot();
 if(store.getDatasetToken()!==datasetToken||!goalId||!snapshot.ready||!snapshot.saved||snapshot.data.revision!==revision||snapshot.data.goals.activeId!==goalId||snapshot.data.goals.goals.find(item=>item.id===goalId)?.statement!==goal)throw Error('The selected goal or dataset changed. Review the current goal before saving.');
 const reference=selection===null?null:record(selection,goalId,goal,datasetToken);
 const fields=snapshot.data.workspaces[goalId]?.fields??{};
 if(fields.evidence!==undefined&&!Array.isArray(fields.evidence))throw Error('Saved evidence history is unavailable. Existing work is retained.');
 const history=Array.isArray(fields.evidence)?fields.evidence:[];
 const duplicate=history.some(item=>item&&typeof item==='object'&&!Array.isArray(item)&&item.page==='fow-lab'&&JSON.stringify(item.evidence)===JSON.stringify(reference));
 if(JSON.stringify(fields[fowLabReferenceField]??null)===JSON.stringify(reference)&&(!reference||duplicate)){store.invalidateExternalChange();if(!store.getSnapshot().saved)throw Error('Saved work changed in another tab. Reload before carrying this reference.');return revision;}
 return store.commitGoalFields(goalId,goal,revision,at,()=>({[fowLabReferenceField]:reference as Json,evidence:(reference&&!duplicate?[...history,{page:'fow-lab',capturedAt:at,schemaVersion:1,evidence:reference}]:history) as Json}));
}
