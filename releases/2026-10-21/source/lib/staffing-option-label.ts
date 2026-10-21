/** Describe only staffing actions with a positive count in this calculated mix. */
export function staffingOptionLabel(mix: {build: number; move: number; buy: number}): string {
  const actions = [mix.build > 0 ? 'develop' : null, mix.move > 0 ? 'move' : null, mix.buy > 0 ? 'hire' : null].filter((action): action is string => action !== null);
  if (!actions.length) return 'No staffing additions';
  const phrase = actions.length === 3 ? `${actions[0]}, ${actions[1]} and ${actions[2]}` : actions.join(' and ');
  return phrase[0].toUpperCase() + phrase.slice(1);
}
