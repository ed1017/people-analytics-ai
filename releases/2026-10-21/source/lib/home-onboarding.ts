// Keep onboarding preferences separate from saved goals, plans and recovery.
export const HOME_INSTRUCTIONS_DISMISSED_KEY='insights-to-action.home-instructions-dismissed.v1';
type StorageReader={getItem:(key:string)=>string|null};
export function isFirstHomeVisit(local:StorageReader,session:StorageReader,datasetToken?:string):boolean {
 try {
  const recoveryKeys=datasetToken&&datasetToken!=='legacy-v1:0'?[`insights-to-action.decisions.recovery.v1.dataset.${datasetToken}`]:[];
  // Saved work is not evidence that the visitor has seen this introduction.
  return local.getItem(HOME_INSTRUCTIONS_DISMISSED_KEY)===null
   && [...recoveryKeys,'insights-to-action.decisions.recovery.v1','insights-to-action.guided-return.v1'].every(key=>session.getItem(key)===null);
 } catch { return false; }
}
