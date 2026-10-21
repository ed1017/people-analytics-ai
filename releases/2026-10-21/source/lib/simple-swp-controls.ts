// @ts-expect-error Native Node tests share TypeScript source.
import {previewBundleChatEdit} from './home-bundle-chat-edit.ts';
import type {BundleDraft} from './home-bundle-reconciliation.ts';
import type {HomeMixBounds} from './home-mix-context.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {sliderNumber} from './planning-slider.ts';
export function primarySwpValuesValid(budget:string,volume:string){
 return sliderNumber(budget,{min:1,max:2000000,precision:0,keyboardStep:1,extent:1,unit:''})!==null&&sliderNumber(volume,{min:0,max:1000000,precision:0,keyboardStep:1,extent:1,unit:''})!==null;
}
/** Interactive controls retain the search limits from the last reviewed form.
 * Each calculation caps them to its current demand; transient slider positions
 * cannot permanently shrink the user's search or expand the reviewed pools. */
export function primarySwpRequest(draft:BundleDraft,bounds:HomeMixBounds|undefined,label:string,value:string){
 const request=`Set ${label} to ${value}`;
 if(label==='budget'||!bounds)return request;
 const preview=previewBundleChatEdit(draft,request),roles=preview.inputs.scope.demand.value;
 if(roles===null)return request;
 return [request,...(['build','move','buy'] as const).flatMap(path=>{
  const max=bounds[path].value?.max;
  return max===undefined?[]:[`Set ${path} search maximum to ${Math.min(max,roles)}`];
 })].join('; ');
}
