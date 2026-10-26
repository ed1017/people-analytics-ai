// Keep onboarding preferences separate from saved goals, plans and recovery.
export const HOME_INSTRUCTIONS_DISMISSED_KEY='insights-to-action.home-instructions-dismissed.v1';
type StorageReader={getItem:(key:string)=>string|null};
export function isFirstHomeVisit(local:StorageReader,session:StorageReader,datasetToken?:string):boolean {
 try {
  const datasetKeys=datasetToken&&datasetToken!=='legacy-v1:0'?[`insights-to-action.decisions.v1.dataset.${datasetToken}`]:[];
  const recoveryKeys=datasetToken&&datasetToken!=='legacy-v1:0'?[`insights-to-action.decisions.recovery.v1.dataset.${datasetToken}`]:[];
  return [...datasetKeys,HOME_INSTRUCTIONS_DISMISSED_KEY,'insights-to-action.decisions.v1','insights-to-action.goals.v1','people-analytics.saved-workforce-scenarios.v1'].every(key=>local.getItem(key)===null)
   && [...recoveryKeys,'insights-to-action.decisions.recovery.v1','insights-to-action.guided-return.v1'].every(key=>session.getItem(key)===null);
 } catch { return false; }
}
