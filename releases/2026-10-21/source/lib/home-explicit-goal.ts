// @ts-expect-error Native Node tests share TypeScript source.
import {homeUserGoalForPin} from './home-planning-intent.ts';
/** Keep a short, explicitly stated outcome in the user's own words.
 * Open discovery questions continue to use the reviewed suggested problem.
 * Presentation and pinning only: this does not add model inputs or infer scope.
 */
export function explicitHomeGoal(message:string):string|null{
 const goal=message.trim();
 if(!goal||goal.length>240||/[?\n\r]/.test(goal))return null;
 return homeUserGoalForPin([goal]);
}
