// Keep onboarding preferences separate from saved goals, plans and recovery.
export const HOME_INSTRUCTIONS_DISMISSED_KEY='insights-to-action.home-instructions-dismissed.v1';
export const HOME_INTRO_OPT_OUT_KEY='insights-to-action.home-intro-opt-out.v1';
type StorageReader={getItem:(key:string)=>string|null};
export function isFirstHomeVisit(local:StorageReader):boolean {
 try {
  // Legacy dismissal never represented consent to permanently hide the intro.
  // Recovery is a live UI deferral, not a permanent eligibility decision.
  return local.getItem(HOME_INTRO_OPT_OUT_KEY)!=='1';
 } catch { return true; }
}
