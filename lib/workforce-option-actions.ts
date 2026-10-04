/** In-memory UI commands only. Never serialize this bridge into model or saved-plan inputs. */
export type OptionAction = 'compare'|'adjust'|'explore';
export type OptionActionOffer = {id:OptionAction;label:string};
export type OptionActionSnapshot = {generation:number;goalId:string;offers:readonly OptionActionOffer[]};
export type StagedOptionAction = {generation:number;goalId:string;id:OptionAction;label:string;edited?:boolean};
export const emptyOptionActions:OptionActionSnapshot={generation:0,goalId:'',offers:[]};
export const isOptionActionLabel=(text:string)=>/^(Compare all [1-9]\d* options|Adjust this option|Explore more options)$/.test(text.trim());
export class WorkforceOptionActions {
 private snapshot=emptyOptionActions;
 private owner='';
 private identity='';
 private dispatch:((id:OptionAction)=>void)|null=null;
 private listeners=new Set<()=>void>();
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 getSnapshot=()=>this.snapshot;
 private emit(){for(const listener of this.listeners)listener()}
 publish(owner:string,identity:string,goalId:string,offers:readonly OptionActionOffer[],dispatch:(id:OptionAction)=>void){
  this.dispatch=dispatch;
  const key=JSON.stringify([identity,goalId,offers]);
  if(this.owner===owner&&this.identity===key)return;
  this.owner=owner;this.identity=key;this.snapshot={generation:this.snapshot.generation+1,goalId,offers};this.emit();
 }
 clear(owner:string){if(this.owner!==owner)return;this.owner='';this.identity='';this.dispatch=null;this.snapshot={generation:this.snapshot.generation+1,goalId:'',offers:[]};this.emit()}
 stage(id:OptionAction):StagedOptionAction|null{
  const offer=this.snapshot.offers.find(item=>item.id===id);
  return offer?{...offer,generation:this.snapshot.generation,goalId:this.snapshot.goalId}:null;
 }
 execute(command:StagedOptionAction,text:string,goalId:string):string{
  if(command.edited||text!==command.label)return 'This option suggestion was edited. Clear it to choose the action again, or write a new question.';
  if(command.goalId!==goalId||command.generation!==this.snapshot.generation||!this.snapshot.offers.some(item=>item.id===command.id)||!this.dispatch)return 'The selected goal, calculation or option changed. Your text is kept; clear it and choose the action again.';
  const dispatch=this.dispatch;
  // Consume before dispatch to prevent repeated Send from replaying a captured action.
  this.snapshot={...this.snapshot,generation:this.snapshot.generation+1};this.emit();
  try{dispatch(command.id);return ''}catch{return 'This action is no longer available. Your text is kept; review the current option before trying again.'}
 }
}
