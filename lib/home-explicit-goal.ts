/** Keep a short, explicitly stated outcome in the user's own words.
 * Open discovery questions continue to use the reviewed suggested problem.
 * Presentation and pinning only: this does not add model inputs or infer scope.
 */
export function explicitHomeGoal(message:string):string|null{
 const goal=message.trim();
 if(!goal||goal.length>240||/[?\n\r]/.test(goal))return null;
 return /^(?:(?:(?:please\s+)?help\s+(?:me|us)\s+(?:to\s+)?)?(?:reduce|increase|improve|build|develop|add|hire|retain|replace|strengthen|expand|create)|i need\b|i want\b|we need\b|we want\b)\b/i.test(goal)?goal:null;
}
