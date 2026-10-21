import {capacitySpec,type CapacityDraft} from './swp-capacity-draft';
import {calculateMonthlyWorkload} from './swp-monthly-workload';
/** Read-only local what-if preview. Never confirms, captures or saves a draft. */
export function capacityPreview(draft:CapacityDraft){
 try{return {result:calculateMonthlyWorkload(capacitySpec({...draft,confirmed:true})),error:''};}
 catch(error){return {result:null,error:error instanceof Error?error.message:'Check your assumptions.'};}
}
